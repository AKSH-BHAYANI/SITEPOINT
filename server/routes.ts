import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, getOne, execute, withTransaction } from './pgDb.ts';
import {
  authMiddleware,
  requireRole,
  checkSiteAccess,
  generateToken,
  loginRateLimiter,
  joinRateLimiter,
  AuthRequest,
  logAudit,
} from './middleware.ts';
import { addSSEClient, broadcastChange } from './events.ts';
import { generateSecureCompanyCode, normalizeCompanyCode } from './companyCode.ts';
import { validatePassword } from '../src/utils/passwordPolicy.ts';

const router = Router();

// Private uploads directory (not exposed statically)
const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads (max 25MB, validated extensions)
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const randomId = crypto.randomUUID();
    cb(null, `${randomId}${ext || '.bin'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported or potentially unsafe file format.'));
    }
  },
});

// ==========================================
// REAL-TIME SSE STREAM
// ==========================================
router.get('/events', authMiddleware, (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  addSSEClient(clientId, res, req.user!.id, req.user!.role, req.user!.companyId);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);
});

// ==========================================
// AUTHENTICATION ROUTES (Cloud SQL PostgreSQL + Firebase)
// ==========================================

// Bootstrap Status Check (Checks if Initial Boss account setup is required)
router.get('/auth/bootstrap-status', async (_req, res) => {
  try {
    const bossCountRow = await getOne<{ count: string }>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'BOSS'"
    );
    const bossCount = parseInt(bossCountRow?.count || '0', 10);
    return res.json({
      bootstrapRequired: bossCount === 0,
    });
  } catch (err: any) {
    console.error('Bootstrap status check error:', err);
    return res.status(500).json({ error: 'Failed to verify system initialization status.' });
  }
});

// Protected Initial Boss Setup Endpoint (First-run bootstrap)
router.post('/auth/bootstrap', loginRateLimiter, async (req, res) => {
  try {
    // 1. Verify that server has configured bootstrap secret
    const configuredSecret = process.env.SITEPOINT_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.trim() === '') {
      return res.status(500).json({
        error: 'Server configuration error: SITEPOINT_BOOTSTRAP_SECRET is missing. Boss bootstrap cannot proceed.',
      });
    }

    const { name, email, password, confirmPassword, bootstrapSecret } = req.body;

    if (!name || !email || !password || !confirmPassword || !bootstrapSecret) {
      return res.status(400).json({
        error: 'All fields (Full Name, Email, Password, Confirm Password, and Bootstrap Secret) are required.',
      });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid full name.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Constant-time secure comparison of Bootstrap Secret
    const providedSecretBuf = Buffer.from(String(bootstrapSecret));
    const expectedSecretBuf = Buffer.from(configuredSecret);

    let isSecretValid = false;
    if (providedSecretBuf.length === expectedSecretBuf.length) {
      isSecretValid = crypto.timingSafeEqual(providedSecretBuf, expectedSecretBuf);
    }

    if (!isSecretValid) {
      return res.status(401).json({ error: 'Invalid Bootstrap Secret. Access denied.' });
    }

    // Hash password with bcrypt
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date();

    // Execute setup inside an isolated database transaction to guarantee atomicity and race condition prevention
    let companyId: string = '';
    let userId: string = '';

    await withTransaction(async (client) => {
      // 1. Verify database state with lock
      const bossRes = await client.query("SELECT COUNT(*) AS count FROM users WHERE role = 'BOSS'");
      const bossCount = parseInt(bossRes.rows[0]?.count || '0', 10);
      if (bossCount > 0) {
        throw new Error('INITIAL_SETUP_ALREADY_COMPLETED');
      }

      // 2. Check existing user
      const userRes = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
      if (userRes.rows.length > 0) {
        throw new Error('EMAIL_EXISTS');
      }

      // 3. Ensure or create company
      const compRes = await client.query('SELECT id, name, code FROM companies LIMIT 1');
      if (compRes.rows.length > 0) {
        companyId = compRes.rows[0].id;
      } else {
        companyId = `comp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const secureCode = generateSecureCompanyCode(8);
        await client.query(
          `INSERT INTO companies (id, name, code, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [companyId, 'SITEPOINT Constructions', secureCode, now, now]
        );
      }

      // 4. Create Boss account
      userId = `usr-boss-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      await client.query(
        `INSERT INTO users (id, company_id, email, password_hash, name, role, title, phone, is_active, membership_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'BOSS', 'Managing Director & Owner', '', true, 'ACTIVE', $6, $7)`,
        [userId, companyId, trimmedEmail, passwordHash, name.trim(), now, now]
      );
    });

    await logAudit(
      companyId,
      null,
      userId,
      'INITIAL_BOSS_BOOTSTRAP',
      'users',
      userId,
      `Initial Administrator (Boss) account initialized: ${trimmedEmail}`,
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: 'Initial Administrator account successfully created. You can now sign in with your credentials.',
    });
  } catch (err: any) {
    if (err.message === 'INITIAL_SETUP_ALREADY_COMPLETED') {
      return res.status(403).json({
        error: 'Initial Administrator setup has already been completed. This setup endpoint is permanently disabled.',
      });
    }
    if (err.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }
    console.error('Boss bootstrap error:', err);
    return res.status(500).json({ error: 'Failed to complete initial administrator setup.' });
  }
});

// Secure server-side Boss account create / reset mechanism
router.post('/auth/bootstrap-boss', loginRateLimiter, async (req, res) => {
  try {
    const configuredSecret = process.env.SITEPOINT_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.trim() === '') {
      return res.status(500).json({
        error: 'Server configuration error: SITEPOINT_BOOTSTRAP_SECRET is missing. Boss bootstrap cannot proceed.',
      });
    }

    const { bootstrapSecret } = req.body;
    if (!bootstrapSecret) {
      return res.status(401).json({ error: 'Bootstrap secret is required.' });
    }

    const providedSecretBuf = Buffer.from(String(bootstrapSecret));
    const expectedSecretBuf = Buffer.from(configuredSecret);
    let isSecretValid = false;
    if (providedSecretBuf.length === expectedSecretBuf.length) {
      isSecretValid = crypto.timingSafeEqual(providedSecretBuf, expectedSecretBuf);
    }

    if (!isSecretValid) {
      return res.status(401).json({ error: 'Invalid Bootstrap Secret. Access denied.' });
    }

    const bossEmail = (req.body.email || 'boss@sitepoint.com').trim().toLowerCase();
    const bossPassword = req.body.password || 'SitePoint@2026!';
    const bossPasswordValidation = validatePassword(bossPassword);
    if (!bossPasswordValidation.valid) {
      return res.status(400).json({ error: bossPasswordValidation.error });
    }
    const bossName = (req.body.name || 'SITEPOINT Admin').trim();

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(bossPassword, salt);
    const now = new Date();

    let companyId = '';
    let bossUserId = '';

    await withTransaction(async (client) => {
      // 1. Ensure company exists or create default company
      const compRes = await client.query('SELECT id, name FROM companies LIMIT 1');
      if (compRes.rows.length > 0) {
        companyId = compRes.rows[0].id;
      } else {
        companyId = `comp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const secureCode = generateSecureCompanyCode(8);
        await client.query(
          `INSERT INTO companies (id, name, code, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [companyId, 'SITEPOINT Constructions', secureCode, now, now]
        );
      }

      // 2. Check if Boss user exists by email
      const userRes = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [bossEmail]);
      if (userRes.rows.length > 0) {
        bossUserId = userRes.rows[0].id;
        await client.query(
          `UPDATE users
           SET company_id = $1, password_hash = $2, name = $3, role = 'BOSS',
               title = 'Managing Director & Owner', is_active = true,
               membership_status = 'ACTIVE', updated_at = $4
           WHERE id = $5`,
          [companyId, passwordHash, bossName, now, bossUserId]
        );
      } else {
        bossUserId = `usr-boss-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        await client.query(
          `INSERT INTO users (id, company_id, email, password_hash, name, role, title, phone, is_active, membership_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'BOSS', 'Managing Director & Owner', '', true, 'ACTIVE', $6, $7)`,
          [bossUserId, companyId, bossEmail, passwordHash, bossName, now, now]
        );
      }
    });

    await logAudit(
      companyId,
      null,
      bossUserId,
      'BOSS_BOOTSTRAP_RESET',
      'users',
      bossUserId,
      `Controlled Boss account configured/reset: ${bossEmail}`,
      req.ip
    );

    return res.json({
      success: true,
      message: 'Controlled Boss account successfully configured and active.',
      email: bossEmail,
    });
  } catch (err: any) {
    console.error('Boss bootstrap reset error:', err);
    return res.status(500).json({ error: 'Failed to configure Boss account: ' + err.message });
  }
});

router.post('/auth/login', loginRateLimiter, async (req, res) => {
  console.log('[AUTH] Login request received');
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('[AUTH] Login response: FAILED (Missing email or password)');
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmed = email.trim().toLowerCase();
    console.log(`[AUTH] Email normalized: ${trimmed}`);

    let user: any;
    try {
      user = await getOne(
        'SELECT * FROM users WHERE LOWER(email) = ?',
        [trimmed]
      );
    } catch (dbErr: any) {
      console.error(`[AUTH] Database connection failure during lookup: ${dbErr.message}`);
      return res.status(503).json({ error: 'Database service unavailable. Please verify database connectivity.' });
    }

    if (!user || !user.password_hash) {
      console.log('[AUTH] Database lookup: NOT FOUND');
      console.log('[AUTH] Login response: FAILED');
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    console.log('[AUTH] Database lookup: FOUND');

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      console.log('[AUTH] Password verification: FAILED');
      console.log('[AUTH] Login response: FAILED');
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    console.log('[AUTH] Password verification: SUCCESS');

    if (user.membership_status === 'PENDING') {
      console.log(`[AUTH] Membership: NOT ACTIVE (PENDING)`);
      console.log('[AUTH] Login response: FAILED');
      return res.status(403).json({
        error: 'Your membership is pending approval by the company administrator. Please wait for authorization before signing in.',
      });
    }

    if (user.membership_status === 'REJECTED') {
      console.log(`[AUTH] Membership: NOT ACTIVE (REJECTED)`);
      console.log('[AUTH] Login response: FAILED');
      return res.status(403).json({
        error: 'Your company membership request was rejected by the administrator.',
      });
    }

    if (user.is_active === false || user.membership_status === 'DEACTIVATED') {
      console.log(`[AUTH] Membership: NOT ACTIVE (DEACTIVATED)`);
      console.log('[AUTH] Login response: FAILED');
      return res.status(403).json({
        error: 'This user account has been deactivated. Please contact your company administrator.',
      });
    }
    console.log('[AUTH] Membership: ACTIVE');

    const members = await query<{ site_id: string }>(
      'SELECT site_id FROM site_members WHERE user_id = ?',
      [user.id]
    );
    const assignedSiteIds = members.map((m) => m.site_id);

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      assignedSiteIds,
      title: user.title,
      phone: user.phone,
      membershipStatus: user.membership_status,
    };

    let token: string;
    try {
      token = generateToken(authUser as any);
      console.log('[AUTH] JWT generation: SUCCESS');
    } catch (jwtErr: any) {
      console.error(`[AUTH] JWT generation: FAILED (${jwtErr.message})`);
      console.log('[AUTH] Login response: FAILED');
      return res.status(500).json({ error: 'Server configuration error: JWT signing failed.' });
    }

    await logAudit(user.company_id, null, user.id, 'LOGIN', 'users', user.id, `User logged in: ${user.email}`, req.ip);
    console.log('[AUTH] Login response: SUCCESS');

    return res.json({ token, user: authUser });
  } catch (err: any) {
    console.error('[AUTH] Login response: FAILED (Unexpected error:', err.message, ')');
    return res.status(500).json({ error: 'An error occurred during authentication.' });
  }
});

// Join Company Route (The only public onboarding path)
router.post('/auth/join', joinRateLimiter, async (req, res) => {
  try {
    const { name, email, password, companyCode, title, phone } = req.body;
    const requestedRole = req.body.requestedRole || req.body.role;

    if (!name || !email || !password || !companyCode || !requestedRole) {
      return res.status(400).json({ error: 'Name, email, password, company code, and requested role are required.' });
    }

    // Role verification: Boss accounts can NEVER be registered publicly
    const allowedRoles = ['PROJECT_MANAGER', 'SITE_ENGINEER'];
    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({
        error: 'Invalid requested role. You may only request to join as a Project Manager or Site Engineer.',
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const normalizedCode = normalizeCompanyCode(companyCode);
    const company = await getOne<{ id: string; name: string }>(
      'SELECT id, name FROM companies WHERE UPPER(code) = ?',
      [normalizedCode]
    );

    // Generic error to prevent company code enumeration
    if (!company) {
      return res.status(400).json({
        error: 'Invalid company join code. Please contact your company administrator to obtain a valid code.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = await getOne('SELECT id FROM users WHERE LOWER(email) = ?', [trimmedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date();

    // Critical: New joining members are strictly created with membership_status = 'PENDING'
    await execute(
      `INSERT INTO users (id, company_id, email, password_hash, name, role, title, phone, is_active, membership_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, 'PENDING', ?, ?)`,
      [
        userId,
        company.id,
        trimmedEmail,
        passwordHash,
        name.trim(),
        requestedRole,
        title || (requestedRole === 'PROJECT_MANAGER' ? 'Project Manager' : 'Site Engineer'),
        phone || '',
        now,
        now,
      ]
    );

    await logAudit(
      company.id,
      null,
      userId,
      'JOIN_REQUEST',
      'users',
      userId,
      `Join request submitted: ${trimmedEmail} (${requestedRole}) for ${company.name}`,
      req.ip
    );

    // Broadcast membership request to connected Boss users
    broadcastChange({
      type: 'membership_request',
      action: 'created',
      data: {
        companyId: company.id,
        userId,
        name: name.trim(),
        email: trimmedEmail,
        requestedRole,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Your request has been sent to the company administrator. You will be able to sign in once your membership is approved.',
    });
  } catch (err: any) {
    console.error('Join company error:', err);
    return res.status(500).json({ error: 'Failed to process join request: ' + err.message });
  }
});

// Public registration endpoint disabled to enforce controlled onboarding
router.post('/auth/register', (_req, res) => {
  return res.status(403).json({
    error: 'Public registration is disabled. Please use the Join Company option with your company join code.',
  });
});

// Secure Password Reset Request (Generates short-lived reset token)
router.post('/auth/forgot-password', loginRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await getOne<{ id: string; company_id: string; is_active: boolean; membership_status: string }>(
      'SELECT id, company_id, is_active, membership_status FROM users WHERE LOWER(email) = ?',
      [trimmedEmail]
    );

    let rawToken: string | undefined;

    if (user && user.is_active !== false && user.membership_status === 'ACTIVE') {
      rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenId = `prt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiration

      await execute(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [tokenId, user.id, tokenHash, expiresAt, new Date()]
      );

      await logAudit(
        user.company_id,
        null,
        user.id,
        'FORGOT_PASSWORD_REQUEST',
        'users',
        user.id,
        `Password reset requested for: ${trimmedEmail}`,
        req.ip
      );
    }

    // Generic response to prevent user email enumeration
    return res.json({
      success: true,
      message: 'If an active account with this email exists, password reset instructions have been dispatched.',
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// Complete Secure Password Reset
router.post('/auth/reset-password', loginRateLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const resetRecord = await getOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    const now = new Date();

    await withTransaction(async (client) => {
      await client.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
        hash,
        now,
        resetRecord.user_id,
      ]);
      await client.query('UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2', [
        now,
        resetRecord.id,
      ]);
    });

    return res.json({
      success: true,
      message: 'Password updated successfully. You may now sign in with your new password.',
    });
  } catch (err: any) {
    console.error('Password reset error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Firebase authentication route is deactivated - all logins flow through PostgreSQL + JWT
router.post('/auth/firebase-login', (_req, res) => {
  return res.status(410).json({
    error: 'Firebase authentication is permanently disabled. Please sign in with your email and password.',
  });
});

router.get('/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getOne(
      'SELECT id, company_id, name, email, role, title, phone, membership_status FROM users WHERE id = ?',
      [req.user!.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const members = await query<{ site_id: string }>(
      'SELECT site_id FROM site_members WHERE user_id = ?',
      [user.id]
    );
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      assignedSiteIds: members.map((m) => m.site_id),
      title: user.title,
      phone: user.phone,
      membershipStatus: user.membership_status,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/auth/users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await query(
      `SELECT id, name, email, role, title, phone, membership_status FROM users
       WHERE company_id = ? AND is_active = true AND membership_status = 'ACTIVE'
       ORDER BY name ASC`,
      [req.user!.companyId]
    );
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// COMPANY & MEMBERSHIP MANAGEMENT ROUTES (Boss Only)
// ==========================================

// Get current company details
router.get('/company', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const company = await getOne<{ id: string; name: string; code: string; created_at: Date; updated_at: Date }>(
      'SELECT id, name, code, created_at, updated_at FROM companies WHERE id = ?',
      [req.user!.companyId]
    );
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const memberStats = await query<{ status: string; count: string }>(
      `SELECT membership_status as status, COUNT(*) as count
       FROM users WHERE company_id = ? GROUP BY membership_status`,
      [req.user!.companyId]
    );

    return res.json({
      id: company.id,
      name: company.name,
      code: company.code,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      stats: memberStats,
    });
  } catch (err: any) {
    console.error('Fetch company error:', err);
    return res.status(500).json({ error: 'Failed to fetch company details.' });
  }
});

// Regenerate Company Join Code (Boss Only)
router.post('/company/regenerate-code', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const newCode = generateSecureCompanyCode(8);
    const now = new Date();

    await execute('UPDATE companies SET code = ?, updated_at = ? WHERE id = ?', [
      newCode,
      now,
      req.user!.companyId,
    ]);

    await logAudit(
      req.user!.companyId,
      null,
      req.user!.id,
      'REGENERATE_COMPANY_CODE',
      'companies',
      req.user!.companyId,
      `Company join code regenerated to: ${newCode}`,
      req.ip
    );

    broadcastChange({ type: 'company', action: 'CODE_REGENERATED', data: { companyId: req.user!.companyId } });

    return res.json({ success: true, code: newCode });
  } catch (err: any) {
    console.error('Regenerate code error:', err);
    return res.status(500).json({ error: 'Failed to regenerate company code.' });
  }
});

// Get all company members (Boss Only)
router.get('/members', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const users = await query<any>(
      `SELECT id, name, email, role, title, phone, is_active, membership_status, created_at
       FROM users
       WHERE company_id = ?
       ORDER BY
         CASE WHEN membership_status = 'PENDING' THEN 1 ELSE 2 END,
         created_at DESC`,
      [req.user!.companyId]
    );

    // Fetch site assignments for each user
    const assignments = await query<{ user_id: string; site_id: string; site_name: string; site_code: string }>(
      `SELECT sm.user_id, sm.site_id, s.name as site_name, s.code as site_code
       FROM site_members sm
       JOIN sites s ON s.id = sm.site_id
       WHERE sm.company_id = ?`,
      [req.user!.companyId]
    );

    const userSitesMap = new Map<string, { id: string; name: string; code: string }[]>();
    for (const a of assignments) {
      if (!userSitesMap.has(a.user_id)) {
        userSitesMap.set(a.user_id, []);
      }
      userSitesMap.get(a.user_id)!.push({
        id: a.site_id,
        name: a.site_name,
        code: a.site_code,
      });
    }

    const members = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      phone: u.phone,
      isActive: u.is_active,
      membershipStatus: u.membership_status,
      createdAt: u.created_at,
      assignedSites: userSitesMap.get(u.id) || [],
    }));

    return res.json(members);
  } catch (err: any) {
    console.error('Fetch members error:', err);
    return res.status(500).json({ error: 'Failed to fetch company members.' });
  }
});

// Approve Pending Member (Boss Only)
router.post('/members/:id/approve', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    const { siteIds } = req.body;

    const user = await getOne<{ id: string; name: string; email: string; role: string; company_id: string }>(
      'SELECT id, name, email, role, company_id FROM users WHERE id = ? AND company_id = ?',
      [memberId, req.user!.companyId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const now = new Date();

    await withTransaction(async (client) => {
      await client.query(
        "UPDATE users SET membership_status = 'ACTIVE', is_active = true, updated_at = $1 WHERE id = $2",
        [now, memberId]
      );

      // If site assignments were provided during approval
      if (Array.isArray(siteIds) && siteIds.length > 0) {
        await client.query('DELETE FROM site_members WHERE user_id = $1 AND company_id = $2', [
          memberId,
          req.user!.companyId,
        ]);
        for (const siteId of siteIds) {
          const smId = `sm-${memberId}-${siteId}`;
          await client.query(
            'INSERT INTO site_members (id, company_id, site_id, user_id, role, assigned_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [smId, req.user!.companyId, siteId, memberId, user.role, now]
          );
        }
      }
    });

    await logAudit(
      req.user!.companyId,
      null,
      req.user!.id,
      'APPROVE_MEMBER',
      'users',
      memberId,
      `Approved member: ${user.name} (${user.email}) as ${user.role}`,
      req.ip
    );

    broadcastChange({ type: 'members', action: 'MEMBER_APPROVED', data: { companyId: req.user!.companyId, memberId } });

    return res.json({ success: true, message: 'Member approved successfully.' });
  } catch (err: any) {
    console.error('Approve member error:', err);
    return res.status(500).json({ error: 'Failed to approve member.' });
  }
});

// Reject Pending Member (Boss Only)
router.post('/members/:id/reject', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id;

    const user = await getOne<{ id: string; name: string; role: string }>(
      'SELECT id, name, role FROM users WHERE id = ? AND company_id = ?',
      [memberId, req.user!.companyId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    if (user.role === 'BOSS') {
      return res.status(400).json({ error: 'Cannot reject a Boss account.' });
    }

    await execute(
      "UPDATE users SET membership_status = 'REJECTED', updated_at = ? WHERE id = ?",
      [new Date(), memberId]
    );

    await logAudit(
      req.user!.companyId,
      null,
      req.user!.id,
      'REJECT_MEMBER',
      'users',
      memberId,
      `Rejected membership request for: ${user.name}`,
      req.ip
    );

    broadcastChange({ type: 'members', action: 'MEMBER_REJECTED', data: { companyId: req.user!.companyId, memberId } });

    return res.json({ success: true, message: 'Membership request rejected.' });
  } catch (err: any) {
    console.error('Reject member error:', err);
    return res.status(500).json({ error: 'Failed to reject member.' });
  }
});

// Assign Sites to Member (Boss Only)
router.post('/members/:id/assign-sites', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    const { siteIds } = req.body;

    if (!Array.isArray(siteIds)) {
      return res.status(400).json({ error: 'siteIds must be an array of site IDs.' });
    }

    const user = await getOne<{ id: string; role: string; name: string }>(
      'SELECT id, role, name FROM users WHERE id = ? AND company_id = ?',
      [memberId, req.user!.companyId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    if (user.role === 'BOSS') {
      return res.status(400).json({ error: 'Boss accounts have automatic access to all company sites.' });
    }

    const now = new Date();

    await withTransaction(async (client) => {
      // Remove current assignments
      await client.query('DELETE FROM site_members WHERE user_id = $1 AND company_id = $2', [
        memberId,
        req.user!.companyId,
      ]);

      // Assign new sites
      for (const sId of siteIds) {
        const smId = `sm-${memberId}-${sId}`;
        await client.query(
          'INSERT INTO site_members (id, company_id, site_id, user_id, role, assigned_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [smId, req.user!.companyId, sId, memberId, user.role, now]
        );
      }
    });

    await logAudit(
      req.user!.companyId,
      null,
      req.user!.id,
      'ASSIGN_SITES',
      'users',
      memberId,
      `Assigned sites [${siteIds.join(', ')}] to member ${user.name}`,
      req.ip
    );

    broadcastChange({ type: 'members', action: 'SITES_ASSIGNED', data: { companyId: req.user!.companyId, memberId } });

    return res.json({ success: true, assignedSiteIds: siteIds });
  } catch (err: any) {
    console.error('Assign sites error:', err);
    return res.status(500).json({ error: 'Failed to assign sites.' });
  }
});

// Update Member Role (Boss Only)
router.patch('/members/:id/role', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    const { role } = req.body;

    const allowedRoles = ['PROJECT_MANAGER', 'SITE_ENGINEER'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed roles are PROJECT_MANAGER or SITE_ENGINEER.' });
    }

    const user = await getOne<{ id: string; role: string; name: string }>(
      'SELECT id, role, name FROM users WHERE id = ? AND company_id = ?',
      [memberId, req.user!.companyId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    if (user.role === 'BOSS' || memberId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot modify role of a Boss account.' });
    }

    const now = new Date();
    await withTransaction(async (client) => {
      await client.query('UPDATE users SET role = $1, updated_at = $2 WHERE id = $3', [role, now, memberId]);
      await client.query('UPDATE site_members SET role = $1 WHERE user_id = $2', [role, memberId]);
    });

    await logAudit(
      req.user!.companyId,
      null,
      req.user!.id,
      'UPDATE_MEMBER_ROLE',
      'users',
      memberId,
      `Changed role of ${user.name} from ${user.role} to ${role}`,
      req.ip
    );

    broadcastChange({ type: 'members', action: 'ROLE_UPDATED', data: { companyId: req.user!.companyId, memberId } });

    return res.json({ success: true, role });
  } catch (err: any) {
    console.error('Update role error:', err);
    return res.status(500).json({ error: 'Failed to update member role.' });
  }
});

// Update Member Status (Activate / Deactivate) (Boss Only)
router.patch('/members/:id/status', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    const { isActive, membershipStatus } = req.body;

    if (memberId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own Boss account.' });
    }

    const user = await getOne<{ id: string; role: string; name: string }>(
      'SELECT id, role, name FROM users WHERE id = ? AND company_id = ?',
      [memberId, req.user!.companyId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const newIsActive = typeof isActive === 'boolean' ? isActive : true;
    const newStatus = membershipStatus || (newIsActive ? 'ACTIVE' : 'DEACTIVATED');

    await execute(
      'UPDATE users SET is_active = ?, membership_status = ?, updated_at = ? WHERE id = ?',
      [newIsActive, newStatus, new Date(), memberId]
    );

    await logAudit(
      req.user!.companyId,
      null,
      req.user!.id,
      'UPDATE_MEMBER_STATUS',
      'users',
      memberId,
      `Updated member ${user.name} status to: ${newStatus} (active: ${newIsActive})`,
      req.ip
    );

    broadcastChange({ type: 'members', action: 'STATUS_UPDATED', data: { companyId: req.user!.companyId, memberId } });

    return res.json({ success: true, isActive: newIsActive, membershipStatus: newStatus });
  } catch (err: any) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Failed to update member status.' });
  }
});

// Remove Member (Boss Only)
router.delete('/members/:id', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    if (memberId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot remove your own Boss account.' });
    }

    const user = await getOne<{ id: string; role: string; name: string }>(
      'SELECT id, role, name FROM users WHERE id = ? AND company_id = ?',
      [memberId, req.user!.companyId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM site_members WHERE user_id = $1 AND company_id = $2', [
        memberId,
        req.user!.companyId,
      ]);
      await client.query(
        "UPDATE users SET is_active = false, membership_status = 'REJECTED', updated_at = $1 WHERE id = $2",
        [new Date(), memberId]
      );
    });

    await logAudit(
      req.user!.companyId,
      null,
      req.user!.id,
      'REMOVE_MEMBER',
      'users',
      memberId,
      `Removed member: ${user.name}`,
      req.ip
    );

    broadcastChange({ type: 'members', action: 'MEMBER_REMOVED', data: { companyId: req.user!.companyId, memberId } });

    return res.json({ success: true, message: 'Member removed from company.' });
  } catch (err: any) {
    console.error('Delete member error:', err);
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// ==========================================
// FILE UPLOAD AND SERVING (Protected & Isolated)
// ==========================================
router.post('/upload', authMiddleware, upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const fileUrl = `/api/files/${req.file.filename}`;
  return res.json({
    url: fileUrl,
    filename: req.file.originalname,
    storedFilename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// Authenticated private file serving
router.get('/files/:filename', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, filename);

    // Verify file ownership and site isolation if recorded in database
    const doc = await getOne<{ company_id: string; site_id: string }>(
      'SELECT company_id, site_id FROM site_documents WHERE file_url LIKE ? OR file_url LIKE ? LIMIT 1',
      [`%${filename}%`, `%${filename}`]
    );
    const media = await getOne<{ company_id: string; site_id: string }>(
      'SELECT company_id, site_id FROM site_media WHERE url LIKE ? OR url LIKE ? LIMIT 1',
      [`%${filename}%`, `%${filename}`]
    );

    const fileCompanyId = doc?.company_id || media?.company_id;
    const fileSiteId = doc?.site_id || media?.site_id;

    if (fileCompanyId && fileCompanyId !== req.user!.companyId) {
      return res.status(403).json({ error: 'Access Denied: File belongs to another organization.' });
    }

    if (fileSiteId && req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(fileSiteId)) {
      return res.status(403).json({ error: 'Access Denied: You are not assigned to the site associated with this file.' });
    }

    if (!fs.existsSync(filePath)) {
      // Check legacy uploads directory as fallback
      const legacyPath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(legacyPath)) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(legacyPath);
      }
      return res.status(404).json({ error: 'Requested file not found.' });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  } catch (err: any) {
    console.error('File serving error:', err);
    return res.status(500).json({ error: 'Failed to serve file.' });
  }
});

// ==========================================
// SITES ROUTES
// ==========================================
router.get('/sites', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let sites: any[];

    if (user.role === 'BOSS') {
      sites = await query(
        `SELECT * FROM sites
         WHERE company_id = ?
         ORDER BY name ASC`,
        [user.companyId]
      );
    } else {
      // PM and Site Engineer only see assigned sites
      sites = await query(
        `SELECT s.* FROM sites s
         INNER JOIN site_members sm ON s.id = sm.site_id
         WHERE sm.user_id = ? AND s.company_id = ?
         ORDER BY s.name ASC`,
        [user.id, user.companyId]
      );
    }

    const formatted = sites.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      location: s.location,
      client: s.client,
      projectManager: s.project_manager_name,
      siteEngineer: s.site_engineer_name,
      progressPercent: s.progress_percent,
      startDate: s.start_date,
      targetEndDate: s.target_end_date,
      status: s.status,
      holdReason: s.hold_reason || undefined,
      initialBudget: s.initial_budget || undefined,
      description: s.description || undefined,
      completionDetails: s.completion_date
        ? {
            completionDate: s.completion_date,
            remarks: s.completion_remarks || '',
            completedBy: s.completion_by || '',
          }
        : undefined,
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error('Error fetching sites:', err);
    return res.status(500).json({ error: 'Failed to fetch sites: ' + err.message });
  }
});

router.post('/sites', authMiddleware, requireRole(['BOSS']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      location,
      client,
      projectManager,
      siteEngineer,
      startDate,
      targetEndDate,
      initialBudget,
      description,
      initialTasks,
    } = req.body;

    if (!name || !location || !client || !projectManager || !siteEngineer || !startDate || !targetEndDate) {
      return res.status(400).json({ error: 'Missing required site fields.' });
    }

    const existingCount = await getOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM sites WHERE company_id = ?',
      [req.user!.companyId]
    );
    const siteId = `site-${Date.now()}`;
    const codeParts = name.trim().split(' ').map((w: string) => w[0]?.toUpperCase()).join('').substring(0, 3) || 'SIT';
    const siteCode = `${codeParts}-0${parseInt(existingCount?.count || '0', 10) + 1}`;
    const now = new Date();

    // Use transaction to ensure site + members + baseline data are created atomically
    await withTransaction(async (client) => {
      // 1. Create Site
      await client.query(
        `INSERT INTO sites (
          id, company_id, name, code, location, client,
          project_manager_name, site_engineer_name, progress_percent,
          start_date, target_end_date, status, initial_budget, description,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, 'Active', $11, $12, $13, $14, $15)`,
        [
          siteId,
          req.user!.companyId,
          name,
          siteCode,
          location,
          client,
          projectManager,
          siteEngineer,
          startDate,
          targetEndDate,
          initialBudget ? parseFloat(initialBudget) : null,
          description || null,
          req.user!.id,
          now,
          now,
        ]
      );

      // 2. Assign Boss to this new site
      await client.query(
        `INSERT INTO site_members (id, company_id, site_id, user_id, role, assigned_at)
         VALUES ($1, $2, $3, $4, 'BOSS', $5) ON CONFLICT DO NOTHING`,
        [`sm-${req.user!.id}-${siteId}`, req.user!.companyId, siteId, req.user!.id, now]
      );

      // 3. Find and assign PM user
      const pmRes = await client.query('SELECT id FROM users WHERE name = $1 AND role = $2', [projectManager, 'PROJECT_MANAGER']);
      if (pmRes.rows[0]) {
        await client.query(
          `INSERT INTO site_members (id, company_id, site_id, user_id, role, assigned_at)
           VALUES ($1, $2, $3, $4, 'PROJECT_MANAGER', $5) ON CONFLICT DO NOTHING`,
          [`sm-${pmRes.rows[0].id}-${siteId}`, req.user!.companyId, siteId, pmRes.rows[0].id, now]
        );
      }

      // 4. Find and assign Engineer user
      const engRes = await client.query('SELECT id FROM users WHERE name = $1 AND role = $2', [siteEngineer, 'SITE_ENGINEER']);
      if (engRes.rows[0]) {
        await client.query(
          `INSERT INTO site_members (id, company_id, site_id, user_id, role, assigned_at)
           VALUES ($1, $2, $3, $4, 'SITE_ENGINEER', $5) ON CONFLICT DO NOTHING`,
          [`sm-${engRes.rows[0].id}-${siteId}`, req.user!.companyId, siteId, engRes.rows[0].id, now]
        );
      }

      // 5. Baseline Tasks
      if (Array.isArray(initialTasks) && initialTasks.length > 0) {
        for (let i = 0; i < initialTasks.length; i++) {
          const t = initialTasks[i];
          await client.query(
            `INSERT INTO tasks (
              id, site_id, company_id, name, description, assigned_team,
              labour_type, location, start_date, expected_date, status,
              is_today, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', false, $11, $12, $13)`,
            [
              `task-${Date.now()}-${i}`,
              siteId,
              req.user!.companyId,
              t.name || `Foundation Milestone ${i + 1}`,
              t.description || 'Initial scope item scheduled for mobilization.',
              t.assignedTeam || 'Civil Prep Team',
              t.labourType || 'Helper',
              t.location || 'Site Perimeter',
              startDate,
              targetEndDate,
              req.user!.id,
              now,
              now,
            ]
          );
        }
      } else {
        await client.query(
          `INSERT INTO tasks (
            id, site_id, company_id, name, description, assigned_team,
            labour_type, location, start_date, expected_date, status,
            is_today, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', true, $11, $12, $13)`,
          [
            `task-${Date.now()}-0`,
            siteId,
            req.user!.companyId,
            'Site mobilization and perimeter setup',
            'Establish boundary barricading, safety signage, and temporary electrical panel.',
            'Civil Prep Team',
            'Helper',
            'Site Perimeter',
            startDate,
            startDate,
            req.user!.id,
            now,
            now,
          ]
        );
      }

      // 6. Baseline Materials
      const baselineMaterials = [
        { name: 'OPC 53 Grade Cement', category: 'Civil / Concrete', req: 2000, stock: 500, unit: 'Bags', min: 150, sup: 'UltraTech Supplies', price: 380 },
        { name: 'Fe 500 TMT Steel (16mm)', category: 'Civil / Steel', req: 40, stock: 15, unit: 'Tons', min: 8, sup: 'Tata Tiscon Dealer', price: 64000 },
        { name: 'Crushed Coarse Aggregate (20mm)', category: 'Civil / Aggregates', req: 100, stock: 30, unit: 'Tons', min: 20, sup: 'Regional Aggregates', price: 1400 },
      ];
      for (let i = 0; i < baselineMaterials.length; i++) {
        const bm = baselineMaterials[i];
        await client.query(
          `INSERT INTO materials (
            id, site_id, company_id, name, category, required_qty,
            opening_stock, current_stock, used_qty, purchased_qty, unit, min_threshold,
            supplier, price_per_unit, last_updated, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, 'Today', $14, $15)`,
          [
            `mat-${Date.now()}-${i}`,
            siteId,
            req.user!.companyId,
            bm.name,
            bm.category,
            bm.req,
            bm.stock,
            bm.stock,
            bm.stock,
            bm.unit,
            bm.min,
            bm.sup,
            bm.price,
            now,
            now,
          ]
        );
      }

      // 7. Baseline Labour
      const labourTypes = [
        { type: 'Masons', req: 10, pres: 8 },
        { type: 'Helpers', req: 20, pres: 18 },
        { type: 'Carpenters', req: 6, pres: 5 },
      ];
      for (let i = 0; i < labourTypes.length; i++) {
        const lt = labourTypes[i];
        await client.query(
          `INSERT INTO labour_records (id, site_id, company_id, type, required_count, present_count, record_date, notes, updated_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Initial team allotment', $8, $9, $10)`,
          [`lab-${Date.now()}-${i}`, siteId, req.user!.companyId, lt.type, lt.req, lt.pres, now.toISOString().split('T')[0], req.user!.name, now, now]
        );
      }
    });

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'CREATE', 'sites', siteId, `Created site: ${name}`);
    broadcastChange({ type: 'site', siteId, action: 'CREATE' });

    const createdSite = await getOne('SELECT * FROM sites WHERE id = ?', [siteId]);
    return res.status(201).json({
      id: createdSite.id,
      name: createdSite.name,
      code: createdSite.code,
      location: createdSite.location,
      client: createdSite.client,
      projectManager: createdSite.project_manager_name,
      siteEngineer: createdSite.site_engineer_name,
      progressPercent: 0,
      startDate: createdSite.start_date,
      targetEndDate: createdSite.target_end_date,
      status: createdSite.status,
    });
  } catch (err: any) {
    console.error('Error creating site:', err);
    return res.status(500).json({ error: 'Failed to create site: ' + err.message });
  }
});

router.patch('/sites/:id/status', authMiddleware, checkSiteAccess(), async (req: AuthRequest, res: Response) => {
  try {
    const { status, holdReason } = req.body;
    const siteId = req.params.id;

    if (!status || !['Active', 'On Hold', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (Active, On Hold, Completed).' });
    }

    const now = new Date();
    await execute(
      `UPDATE sites
       SET status = ?, hold_reason = ?, updated_at = ?
       WHERE id = ? AND company_id = ?`,
      [status, status === 'On Hold' ? holdReason || 'Temporarily suspended' : null, now, siteId, req.user!.companyId]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'UPDATE_STATUS', 'sites', siteId, `Status changed to ${status}`);
    broadcastChange({ type: 'site', siteId, action: 'UPDATE_STATUS', data: { status, holdReason } });

    return res.json({ success: true, siteId, status, holdReason });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/sites/:id/complete', authMiddleware, checkSiteAccess(), requireRole(['BOSS', 'PROJECT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const siteId = req.params.id;
    const { completionDate, remarks, reportDocumentName, completionPhotos } = req.body;
    const now = new Date();
    const cDate = completionDate || now.toISOString().split('T')[0];

    await withTransaction(async (client) => {
      // 1. Update site status
      await client.query(
        `UPDATE sites
         SET status = 'Completed', progress_percent = 100, completion_date = $1, completion_remarks = $2, completion_by = $3, updated_at = $4
         WHERE id = $5 AND company_id = $6`,
        [cDate, remarks || '', req.user!.name, now, siteId, req.user!.companyId]
      );

      // 2. Auto-complete unfinished tasks
      await client.query(
        `UPDATE tasks
         SET status = 'Completed', completed_date = $1, completion_note = $2, updated_at = $3
         WHERE site_id = $4 AND status != 'Completed'`,
        [cDate, `Auto-completed upon formal handover. ${remarks || ''}`, now, siteId]
      );

      // 3. Auto-resolve open problems
      await client.query(
        `UPDATE problems
         SET status = 'Resolved', resolution_notes = 'Closed upon formal site completion', resolved_at = $1, updated_at = $2
         WHERE site_id = $3 AND status != 'Resolved'`,
        [now.toISOString(), now, siteId]
      );

      // 4. Release equipment back to Available pool
      await client.query(
        `UPDATE equipment
         SET status = 'Available', operator_name = NULL, notes = 'Released upon site completion', last_updated = 'Today', updated_at = $1
         WHERE current_site_id = $2`,
        [now, siteId]
      );

      // 5. Completion document if provided
      if (reportDocumentName) {
        await client.query(
          `INSERT INTO documents (
            id, site_id, company_id, title, category, file_type,
            uploaded_date, file_size, file_url, uploaded_by, created_at
          ) VALUES ($1, $2, $3, $4, 'Reports', 'PDF', $5, '4.2 MB', '/placeholder.pdf', $6, $7)`,
          [`doc-${Date.now()}`, siteId, req.user!.companyId, reportDocumentName, cDate, req.user!.name, now]
        );
      }

      // 6. Completion photos if provided
      if (completionPhotos && Array.isArray(completionPhotos)) {
        for (let i = 0; i < completionPhotos.length; i++) {
          await client.query(
            `INSERT INTO media_files (id, site_id, company_id, title, category, media_type, url, uploaded_by, media_date, created_at)
             VALUES ($1, $2, $3, $4, 'Project Handover', 'image', $5, $6, $7, $8)`,
            [`med-${Date.now()}-${i}`, siteId, req.user!.companyId, `Completion Handover Photo ${i + 1}`, completionPhotos[i], req.user!.name, cDate, now]
          );
        }
      }
    });

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'COMPLETE_SITE', 'sites', siteId, `Formal handover completed: ${remarks || ''}`);
    broadcastChange({ type: 'site', siteId, action: 'COMPLETE', data: { status: 'Completed', completionDate: cDate } });

    return res.json({ success: true, siteId, status: 'Completed', completionDate: cDate });
  } catch (err: any) {
    console.error('Error completing site:', err);
    return res.status(500).json({ error: 'Failed to complete site: ' + err.message });
  }
});

// ==========================================
// TASKS ROUTES
// ==========================================
router.get('/tasks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let tasksList: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access denied to this site.' });
      }
      tasksList = await query('SELECT * FROM tasks WHERE site_id = ? AND company_id = ? ORDER BY expected_date ASC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        tasksList = await query('SELECT * FROM tasks WHERE company_id = ? ORDER BY expected_date ASC', [req.user!.companyId]);
      } else {
        tasksList = await query(
          `SELECT t.* FROM tasks t
           INNER JOIN site_members sm ON t.site_id = sm.site_id
           WHERE sm.user_id = ? AND t.company_id = ?
           ORDER BY t.expected_date ASC`,
          [req.user!.id, req.user!.companyId]
        );
      }
    }

    const formatted = tasksList.map((t) => ({
      id: t.id,
      siteId: t.site_id,
      name: t.name,
      description: t.description,
      assignedTeam: t.assigned_team,
      labourType: t.labour_type,
      location: t.location,
      startDate: t.start_date,
      expectedDate: t.expected_date,
      status: t.status,
      isToday: t.is_today,
      completedDate: t.completed_date || undefined,
      completionNote: t.completion_note || undefined,
      completionPhotoUrl: t.completion_photo_url || undefined,
      delayedReason: t.delayed_reason || undefined,
      delayedExplanation: t.delayed_explanation || undefined,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, name, description, assignedTeam, labourType, location, startDate, expectedDate, isToday } = req.body;
    if (!siteId || !name || !startDate || !expectedDate) {
      return res.status(400).json({ error: 'Missing required task fields.' });
    }

    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    await execute(
      `INSERT INTO tasks (
        id, site_id, company_id, name, description, assigned_team,
        labour_type, location, start_date, expected_date, status,
        is_today, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        siteId,
        req.user!.companyId,
        name,
        description || '',
        assignedTeam || 'Civil Prep Team',
        labourType || 'Helper',
        location || 'Site Perimeter',
        startDate,
        expectedDate,
        'Pending',
        isToday ? true : false,
        req.user!.id,
        now,
        now,
      ]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'CREATE', 'tasks', id, `Created task: ${name}`);
    broadcastChange({ type: 'task', siteId, action: 'CREATE', data: { id, name } });

    return res.status(201).json({
      id,
      siteId,
      name,
      description,
      assignedTeam,
      labourType,
      location,
      startDate,
      expectedDate,
      status: 'Pending',
      isToday: !!isToday,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/tasks/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const task = await getOne<{ id: string; site_id: string; status: string; company_id: string }>(
      'SELECT id, site_id, status, company_id FROM tasks WHERE id = ?',
      [req.params.id]
    );
    if (!task || task.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(task.site_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const now = new Date();
    await execute('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', [status, now, task.id]);

    await execute(
      'INSERT INTO task_updates (id, company_id, site_id, task_id, user_id, update_type, previous_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [`tup-${Date.now()}`, task.company_id, task.site_id, task.id, req.user!.id, 'STATUS_CHANGE', task.status, status, now]
    );

    await logAudit(task.company_id, task.site_id, req.user!.id, 'UPDATE_STATUS', 'tasks', task.id, `Task status: ${status}`);
    broadcastChange({ type: 'task', siteId: task.site_id, action: 'UPDATE_STATUS', data: { id: task.id, status } });

    return res.json({ success: true, id: task.id, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/tasks/:id/delay', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reason = req.body.reason || req.body.delayReason || req.body.delayed_reason || 'Delayed';
    const explanation = req.body.explanation || req.body.delayExplanation || req.body.delayed_explanation || reason;
    const newExpectedDate = req.body.newExpectedDate || req.body.expectedDate || null;
    const photoUrl = req.body.photoUrl || req.body.photo || null;
    const task = await getOne<{ id: string; site_id: string; company_id: string }>(
      'SELECT id, site_id, company_id FROM tasks WHERE id = ?',
      [req.params.id]
    );
    if (!task || task.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(task.site_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const now = new Date();
    await execute(
      `UPDATE tasks
       SET status = 'Delayed', delayed_reason = ?, delayed_explanation = ?, expected_date = ?, updated_at = ?
       WHERE id = ?`,
      [reason, explanation, newExpectedDate, now, task.id]
    );

    await execute(
      `INSERT INTO task_updates (id, company_id, site_id, task_id, user_id, update_type, notes, photo_url, created_at)
       VALUES (?, ?, ?, ?, ?, 'DELAY', ?, ?, ?)`,
      [`tup-${Date.now()}`, task.company_id, task.site_id, task.id, req.user!.id, `${reason}: ${explanation}`, photoUrl || null, now]
    );

    await logAudit(task.company_id, task.site_id, req.user!.id, 'DELAY_TASK', 'tasks', task.id, `Delayed: ${reason} - ${explanation}`);
    broadcastChange({ type: 'task', siteId: task.site_id, action: 'DELAY', data: { id: task.id, reason, newExpectedDate } });

    return res.json({ success: true, id: task.id, status: 'Delayed', reason, newExpectedDate });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/tasks/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const note = req.body.note || req.body.completionNote || req.body.completion_notes || req.body.notes || 'Completed successfully';
    const photoUrl = req.body.photoUrl || req.body.photo || req.body.completion_photo_url || null;
    const task = await getOne<{ id: string; site_id: string; company_id: string }>(
      'SELECT id, site_id, company_id FROM tasks WHERE id = ?',
      [req.params.id]
    );
    if (!task || task.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(task.site_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const now = new Date();
    const todayStr = req.body.completedDate || req.body.actualEndDate || now.toISOString().split('T')[0];

    await execute(
      `UPDATE tasks
       SET status = 'Completed', completed_date = ?, completion_note = ?, completion_photo_url = ?, updated_at = ?
       WHERE id = ?`,
      [todayStr, note || 'Completed successfully', photoUrl || null, now, task.id]
    );

    await execute(
      `INSERT INTO task_updates (id, company_id, site_id, task_id, user_id, update_type, new_status, notes, photo_url, created_at)
       VALUES (?, ?, ?, ?, ?, 'COMPLETE', 'Completed', ?, ?, ?)`,
      [`tup-${Date.now()}`, task.company_id, task.site_id, task.id, req.user!.id, note || null, photoUrl || null, now]
    );

    await logAudit(task.company_id, task.site_id, req.user!.id, 'COMPLETE_TASK', 'tasks', task.id, `Task completed`);
    broadcastChange({ type: 'task', siteId: task.site_id, action: 'COMPLETE', data: { id: task.id } });

    return res.json({ success: true, id: task.id, status: 'Completed', completedDate: todayStr });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MATERIALS ROUTES (Transactional Stock Calculation)
// ==========================================
router.get('/materials', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let materialsList: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access denied to this site.' });
      }
      materialsList = await query('SELECT * FROM materials WHERE site_id = ? AND company_id = ? ORDER BY name ASC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        materialsList = await query('SELECT * FROM materials WHERE company_id = ? ORDER BY name ASC', [req.user!.companyId]);
      } else {
        materialsList = await query(
          `SELECT m.* FROM materials m
           INNER JOIN site_members sm ON m.site_id = sm.site_id
           WHERE sm.user_id = ? AND m.company_id = ?
           ORDER BY m.name ASC`,
          [req.user!.id, req.user!.companyId]
        );
      }
    }

    const formatted = materialsList.map((m) => ({
      id: m.id,
      siteId: m.site_id,
      name: m.name,
      category: m.category,
      requiredQty: m.required_qty,
      openingStock: m.opening_stock,
      currentStock: m.current_stock,
      usedQty: m.used_qty,
      purchasedQty: m.purchased_qty,
      unit: m.unit,
      minThreshold: m.min_threshold,
      supplier: m.supplier || undefined,
      pricePerUnit: m.price_per_unit || undefined,
      lastUpdated: m.last_updated,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/materials', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, name, category, requiredQty, currentStock, unit, minThreshold, supplier, pricePerUnit } = req.body;
    if (!siteId || !name || !category || !unit) {
      return res.status(400).json({ error: 'Missing required material fields.' });
    }

    const id = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const stockVal = parseFloat(currentStock) || 0;

    await execute(
      `INSERT INTO materials (
        id, site_id, company_id, name, category, required_qty,
        opening_stock, current_stock, used_qty, purchased_qty, unit, min_threshold,
        supplier, price_per_unit, last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'Today', ?, ?)`,
      [
        id,
        siteId,
        req.user!.companyId,
        name,
        category,
        parseFloat(requiredQty) || 0,
        stockVal,
        stockVal,
        stockVal,
        unit,
        parseFloat(minThreshold) || 0,
        supplier || null,
        parseFloat(pricePerUnit) || 0,
        now,
        now,
      ]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'CREATE', 'materials', id, `Added material: ${name}`);
    broadcastChange({ type: 'material', siteId, action: 'CREATE', data: { id, name } });

    return res.status(201).json({
      id,
      siteId,
      name,
      category,
      requiredQty: parseFloat(requiredQty) || 0,
      currentStock: stockVal,
      unit,
      minThreshold: parseFloat(minThreshold) || 0,
      supplier,
      pricePerUnit: parseFloat(pricePerUnit) || 0,
      lastUpdated: 'Today',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/materials/:id/stock', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentStock, usedQty, transactionType, notes } = req.body;
    const material = await getOne<{
      id: string;
      site_id: string;
      company_id: string;
      name: string;
      current_stock: number;
      used_qty: number;
      purchased_qty: number;
      unit: string;
      min_threshold: number;
    }>('SELECT * FROM materials WHERE id = ?', [req.params.id]);

    if (!material || material.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(material.site_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const newStock = currentStock !== undefined ? parseFloat(currentStock) : material.current_stock;
    const addedUsed = usedQty !== undefined ? parseFloat(usedQty) : 0;
    const totalUsed = material.used_qty + addedUsed;
    const diff = newStock - material.current_stock;
    const now = new Date();

    // Perform stock update in database transaction with transaction log
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE materials
         SET current_stock = $1, used_qty = $2, last_updated = 'Today', updated_at = $3
         WHERE id = $4`,
        [newStock, totalUsed, now, material.id]
      );

      // Record transaction
      const transId = `mtrans-${Date.now()}`;
      await client.query(
        `INSERT INTO material_transactions (
          id, company_id, site_id, material_id, user_id, transaction_type,
          quantity, unit, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          transId,
          material.company_id,
          material.site_id,
          material.id,
          req.user!.id,
          transactionType || (diff >= 0 ? 'RECEIPT' : 'CONSUMPTION'),
          Math.abs(diff),
          material.unit,
          notes || (addedUsed > 0 ? `Consumed ${addedUsed} ${material.unit}` : `Stock adjusted`),
          now,
        ]
      );
    });

    await logAudit(
      material.company_id,
      material.site_id,
      req.user!.id,
      'UPDATE_STOCK',
      'materials',
      material.id,
      `Stock updated to ${newStock} ${material.unit}`
    );
    broadcastChange({ type: 'material', siteId: material.site_id, action: 'UPDATE_STOCK', data: { id: material.id, currentStock: newStock } });

    return res.json({ success: true, id: material.id, currentStock: newStock, usedQty: totalUsed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// LABOUR ROUTES
// ==========================================
router.get('/labour', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let labourList: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      labourList = await query('SELECT * FROM labour_records WHERE site_id = ? AND company_id = ? ORDER BY type ASC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        labourList = await query('SELECT * FROM labour_records WHERE company_id = ? ORDER BY type ASC', [req.user!.companyId]);
      } else {
        labourList = await query(
          `SELECT l.* FROM labour_records l
           INNER JOIN site_members sm ON l.site_id = sm.site_id
           WHERE sm.user_id = ? AND l.company_id = ?
           ORDER BY l.type ASC`,
          [req.user!.id, req.user!.companyId]
        );
      }
    }

    const formatted = labourList.map((l) => ({
      id: l.id,
      siteId: l.site_id,
      type: l.type,
      required: l.required_count,
      present: l.present_count,
      notes: l.notes || undefined,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/labour', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, type, required, present } = req.body;
    if (!siteId || !type) {
      return res.status(400).json({ error: 'Site ID and labour type are required.' });
    }

    const id = `lab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    await execute(
      `INSERT INTO labour_records (id, site_id, company_id, type, required_count, present_count, record_date, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, siteId, req.user!.companyId, type, parseInt(required, 10) || 0, parseInt(present, 10) || 0, todayStr, req.user!.name, now, now]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'CREATE', 'labour', id, `Added labour category: ${type}`);
    broadcastChange({ type: 'labour', siteId, action: 'CREATE' });

    return res.status(201).json({ id, siteId, type, required: parseInt(required, 10) || 0, present: parseInt(present, 10) || 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/labour/:id/attendance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { present, required } = req.body;
    const labourItem = await getOne<{ id: string; site_id: string; company_id: string; type: string }>(
      'SELECT id, site_id, company_id, type FROM labour_records WHERE id = ?',
      [req.params.id]
    );
    if (!labourItem || labourItem.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Labour record not found.' });
    }

    if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(labourItem.site_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const now = new Date();
    if (required !== undefined) {
      await execute('UPDATE labour_records SET present_count = ?, required_count = ?, updated_by = ?, updated_at = ? WHERE id = ?', [
        parseInt(present, 10),
        parseInt(required, 10),
        req.user!.name,
        now,
        labourItem.id,
      ]);
    } else {
      await execute('UPDATE labour_records SET present_count = ?, updated_by = ?, updated_at = ? WHERE id = ?', [
        parseInt(present, 10),
        req.user!.name,
        now,
        labourItem.id,
      ]);
    }

    await logAudit(labourItem.company_id, labourItem.site_id, req.user!.id, 'UPDATE_ATTENDANCE', 'labour', labourItem.id, `Labour attendance updated for ${labourItem.type}`);
    broadcastChange({ type: 'labour', siteId: labourItem.site_id, action: 'UPDATE_ATTENDANCE' });

    return res.json({ success: true, id: labourItem.id, present });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EQUIPMENT ROUTES
// ==========================================
router.get('/equipment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let equipmentList: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this site.' });
      }
      equipmentList = await query('SELECT * FROM equipment WHERE current_site_id = ? AND company_id = ? ORDER BY name ASC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        equipmentList = await query('SELECT * FROM equipment WHERE company_id = ? ORDER BY name ASC', [req.user!.companyId]);
      } else {
        if (req.user!.assignedSiteIds.length === 0) {
          equipmentList = await query('SELECT * FROM equipment WHERE company_id = ? AND current_site_id IS NULL ORDER BY name ASC', [req.user!.companyId]);
        } else {
          const placeholders = req.user!.assignedSiteIds.map(() => '?').join(', ');
          equipmentList = await query(
            `SELECT * FROM equipment
             WHERE company_id = ? AND (current_site_id IN (${placeholders}) OR current_site_id IS NULL)
             ORDER BY name ASC`,
            [req.user!.companyId, ...req.user!.assignedSiteIds]
          );
        }
      }
    }

    const formatted = equipmentList.map((eq) => ({
      id: eq.id,
      name: eq.name,
      type: eq.type,
      status: eq.status,
      currentSiteId: eq.current_site_id || undefined,
      assignedOperator: eq.operator_name || undefined,
      hoursOperated: eq.hours_operated,
      nextServiceDate: eq.next_service_date || undefined,
      breakdownReason: eq.breakdown_reason || undefined,
      notes: eq.notes || undefined,
      lastUpdated: eq.last_updated,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/equipment', authMiddleware, checkSiteAccess((req) => req.body.currentSiteId), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, status, currentSiteId, notes } = req.body;
    const assignedOperator = req.body.assignedOperator || req.body.operatorName || req.body.operator || null;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required.' });
    }

    const id = `eq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    await execute(
      `INSERT INTO equipment (
        id, company_id, current_site_id, name, type, status,
        operator_name, hours_operated, notes, last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Today', ?, ?)`,
      [id, req.user!.companyId, currentSiteId || null, name, type, status || 'Available', assignedOperator, notes || null, now, now]
    );

    await logAudit(req.user!.companyId, currentSiteId || null, req.user!.id, 'CREATE', 'equipment', id, `Added equipment: ${name}`);
    broadcastChange({ type: 'equipment', siteId: currentSiteId, action: 'CREATE' });

    return res.status(201).json({ id, name, type, status: status || 'Available', currentSiteId, assignedOperator, lastUpdated: 'Today' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/equipment/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes, currentSiteId, breakdownReason } = req.body;
    const eq = await getOne<{ id: string; current_site_id: string | null; company_id: string; name: string }>(
      'SELECT id, current_site_id, company_id, name FROM equipment WHERE id = ?',
      [req.params.id]
    );
    if (!eq || eq.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    // Role and site isolation check
    if (req.user!.role !== 'BOSS') {
      if (eq.current_site_id && !req.user!.assignedSiteIds.includes(eq.current_site_id)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to the site currently managing this equipment.' });
      }
      if (currentSiteId && !req.user!.assignedSiteIds.includes(currentSiteId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to the destination site.' });
      }
    }

    const now = new Date();
    await execute(
      `UPDATE equipment
       SET status = ?, notes = COALESCE(?, notes), current_site_id = COALESCE(?, current_site_id),
           breakdown_reason = ?, last_updated = 'Today', updated_at = ?
       WHERE id = ?`,
      [status, notes || null, currentSiteId || null, status === 'Under Breakdown' ? breakdownReason : null, now, eq.id]
    );

    const targetSiteId = currentSiteId || eq.current_site_id;
    await logAudit(eq.company_id, targetSiteId || null, req.user!.id, 'UPDATE_EQUIPMENT_STATUS', 'equipment', eq.id, `Status: ${status}`);
    broadcastChange({ type: 'equipment', siteId: targetSiteId || undefined, action: 'UPDATE_STATUS' });

    return res.json({ success: true, id: eq.id, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PROBLEMS / ISSUES ROUTES
// ==========================================
router.get('/problems', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let list: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      list = await query('SELECT * FROM problems WHERE site_id = ? AND company_id = ? ORDER BY created_at DESC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        list = await query('SELECT * FROM problems WHERE company_id = ? ORDER BY created_at DESC', [req.user!.companyId]);
      } else {
        list = await query(
          `SELECT p.* FROM problems p
           INNER JOIN site_members sm ON p.site_id = sm.site_id
           WHERE sm.user_id = ? AND p.company_id = ?
           ORDER BY p.created_at DESC`,
          [req.user!.id, req.user!.companyId]
        );
      }
    }

    const formatted = list.map((p) => ({
      id: p.id,
      siteId: p.site_id,
      title: p.title,
      description: p.description,
      severity: p.severity,
      status: p.status,
      reportedBy: p.reported_by,
      reportedDate: p.reported_date,
      impactArea: p.impact_area || undefined,
      photoUrl: p.photo_url || undefined,
      resolutionNotes: p.resolution_notes || undefined,
      resolvedAt: p.resolved_at || undefined,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/problems', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, title, description, severity, impactArea, photoUrl } = req.body;
    if (!siteId || !title || !description || !severity) {
      return res.status(400).json({ error: 'Missing required problem fields.' });
    }

    const id = `prob-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const dateStr = now.toLocaleString();

    await execute(
      `INSERT INTO problems (
        id, site_id, company_id, title, description, severity, status,
        reported_by, reported_date, impact_area, photo_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?)`,
      [id, siteId, req.user!.companyId, title, description, severity, req.user!.name, dateStr, impactArea || null, photoUrl || null, now, now]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'REPORT_PROBLEM', 'problems', id, `Problem reported: ${title}`);
    broadcastChange({ type: 'problem', siteId, action: 'CREATE', data: { id, title } });

    return res.status(201).json({
      id,
      siteId,
      title,
      description,
      severity,
      status: 'Open',
      reportedBy: req.user!.name,
      reportedDate: dateStr,
      impactArea,
      photoUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/problems/:id/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { resolutionNotes } = req.body;
    const problem = await getOne<{ id: string; site_id: string; company_id: string; title: string }>(
      'SELECT id, site_id, company_id, title FROM problems WHERE id = ?',
      [req.params.id]
    );
    if (!problem || problem.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(problem.site_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    await execute(
      `UPDATE problems
       SET status = 'Resolved', resolution_notes = ?, resolved_at = ?, resolved_by = ?, updated_at = ?
       WHERE id = ?`,
      [resolutionNotes || 'Resolved', todayStr, req.user!.name, now, problem.id]
    );

    await logAudit(problem.company_id, problem.site_id, req.user!.id, 'RESOLVE_PROBLEM', 'problems', problem.id, `Problem resolved: ${problem.title}`);
    broadcastChange({ type: 'problem', siteId: problem.site_id, action: 'RESOLVE', data: { id: problem.id } });

    return res.json({ success: true, id: problem.id, status: 'Resolved', resolutionNotes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RESOURCE REQUESTS & INTER-SITE DISCOVERY
// ==========================================
router.get('/resource-requests', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let list: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this site.' });
      }
      list = await query('SELECT * FROM resource_requests WHERE site_id = ? AND company_id = ? ORDER BY created_at DESC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        list = await query('SELECT * FROM resource_requests WHERE company_id = ? ORDER BY created_at DESC', [req.user!.companyId]);
      } else {
        if (req.user!.assignedSiteIds.length === 0) {
          list = [];
        } else {
          const placeholders = req.user!.assignedSiteIds.map(() => '?').join(', ');
          list = await query(
            `SELECT * FROM resource_requests
             WHERE company_id = ? AND site_id IN (${placeholders})
             ORDER BY created_at DESC`,
            [req.user!.companyId, ...req.user!.assignedSiteIds]
          );
        }
      }
    }

    const formatted = list.map((r) => ({
      id: r.id,
      siteId: r.site_id,
      type: r.type,
      item: r.item,
      quantity: r.quantity,
      unit: r.unit,
      priority: r.urgency,
      reason: r.reason,
      requiredDate: r.required_by_date,
      status: r.status,
      requestedBy: r.created_by,
      createdAt: r.created_at,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/resource-requests', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, type, item, quantity, unit, priority, reason, requiredDate } = req.body;
    if (!siteId || !type || !item || !quantity || !reason || !requiredDate) {
      return res.status(400).json({ error: 'Missing required request fields.' });
    }

    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    await execute(
      `INSERT INTO resource_requests (
        id, site_id, company_id, type, item, quantity, unit, urgency,
        reason, required_by_date, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [
        id,
        siteId,
        req.user!.companyId,
        type,
        item,
        parseFloat(quantity) || 0,
        unit || 'Units',
        priority || 'Medium',
        reason,
        requiredDate,
        req.user!.name,
        now,
        now,
      ]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'CREATE_REQUEST', 'resource_requests', id, `Requested: ${quantity} ${unit} of ${item}`);
    broadcastChange({ type: 'resource_request', siteId, action: 'CREATE', data: { id, item } });

    return res.status(201).json({
      id,
      siteId,
      type,
      item,
      quantity: parseFloat(quantity) || 0,
      unit: unit || 'Units',
      priority: priority || 'Medium',
      reason,
      requiredDate,
      status: 'Pending',
      requestedBy: req.user!.name,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/resource-requests/:id/status', authMiddleware, requireRole(['BOSS', 'PROJECT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { status, fulfilledBySiteId } = req.body;
    const reqItem = await getOne<{ id: string; site_id: string; company_id: string; item: string }>(
      'SELECT id, site_id, company_id, item FROM resource_requests WHERE id = ?',
      [req.params.id]
    );
    if (!reqItem || reqItem.company_id !== req.user!.companyId) {
      return res.status(404).json({ error: 'Resource request not found.' });
    }

    // Site isolation check for Project Managers
    if (req.user!.role !== 'BOSS') {
      const isSourceAssigned = req.user!.assignedSiteIds.includes(reqItem.site_id);
      const isFulfillingAssigned = fulfilledBySiteId ? req.user!.assignedSiteIds.includes(fulfilledBySiteId) : false;
      if (!isSourceAssigned && !isFulfillingAssigned) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to the requesting or fulfilling site.' });
      }
    }

    const now = new Date();
    await execute(
      'UPDATE resource_requests SET status = ?, fulfilled_by_site_id = ?, updated_at = ? WHERE id = ?',
      [status, fulfilledBySiteId || null, now, reqItem.id]
    );

    await logAudit(reqItem.company_id, reqItem.site_id, req.user!.id, 'UPDATE_REQUEST_STATUS', 'resource_requests', reqItem.id, `Status: ${status}`);
    broadcastChange({ type: 'resource_request', siteId: reqItem.site_id, action: 'UPDATE_STATUS' });

    return res.json({ success: true, id: reqItem.id, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Inter-site surplus discovery engine
router.get('/resource-requests/matches', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const pendingRequests = await query<{
      id: string;
      site_id: string;
      item: string;
      quantity: number;
      type: string;
    }>("SELECT id, site_id, item, quantity, type FROM resource_requests WHERE status = 'Pending' AND company_id = ?", [req.user!.companyId]);

    const allSites = await query('SELECT id, name, code FROM sites WHERE company_id = ?', [req.user!.companyId]);
    const siteMap = new Map(allSites.map((s) => [s.id, s]));

    const matches: any[] = [];
    for (const reqItem of pendingRequests) {
      const sourceSite = siteMap.get(reqItem.site_id);
      if (!sourceSite) continue;

      if (reqItem.type === 'Material') {
        const firstWord = reqItem.item.split(' ')[0].toLowerCase();
        const candidateMaterials = await query<{
          site_id: string;
          name: string;
          current_stock: number;
          min_threshold: number;
          unit: string;
        }>(
          `SELECT site_id, name, current_stock, min_threshold, unit FROM materials
           WHERE company_id = ? AND site_id != ? AND LOWER(name) LIKE ? AND current_stock > min_threshold`,
          [req.user!.companyId, reqItem.site_id, `%${firstWord}%`]
        );

        for (const cand of candidateMaterials) {
          const targetSite = siteMap.get(cand.site_id);
          if (targetSite) {
            // Check visibility for non-Boss users
            if (
              req.user!.role === 'BOSS' ||
              req.user!.assignedSiteIds.includes(sourceSite.id) ||
              req.user!.assignedSiteIds.includes(targetSite.id)
            ) {
              matches.push({
                requestId: reqItem.id,
                sourceSite,
                targetSite,
                item: reqItem.item,
                neededQty: reqItem.quantity,
                availableQty: cand.current_stock,
                type: 'Material',
                details: `${targetSite.name} has ${cand.current_stock} ${cand.unit} in surplus stock`,
              });
            }
          }
        }
      }
    }

    return res.json(matches);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REPORTS ROUTES
// ==========================================
router.get('/reports', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let list: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      list = await query('SELECT * FROM daily_reports WHERE site_id = ? AND company_id = ? ORDER BY report_date DESC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        list = await query('SELECT * FROM daily_reports WHERE company_id = ? ORDER BY report_date DESC', [req.user!.companyId]);
      } else {
        list = await query(
          `SELECT r.* FROM daily_reports r
           INNER JOIN site_members sm ON r.site_id = sm.site_id
           WHERE sm.user_id = ? AND r.company_id = ?
           ORDER BY r.report_date DESC`,
          [req.user!.id, req.user!.companyId]
        );
      }
    }

    const formatted = list.map((r) => {
      let matUsed = [];
      try {
        if (r.materials_consumed) matUsed = JSON.parse(r.materials_consumed);
      } catch {
        // ignore
      }
      return {
        id: r.id,
        siteId: r.site_id,
        date: r.report_date,
        engineerName: r.engineer_name,
        completedTasks: [],
        pendingTasks: [],
        delayedTasks: [],
        materialsUsed: matUsed,
        labourPresentCount: r.active_workers_count,
        equipmentUsed: [],
        problemsSummary: r.issues_encountered ? r.issues_encountered.split('; ') : [],
        remarks: r.remarks || '',
        photos: [],
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/reports', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, date, completedTasks, materialsUsed, labourPresentCount, problemsSummary, remarks, photos } = req.body;
    if (!siteId || !date) {
      return res.status(400).json({ error: 'Site ID and date are required.' });
    }

    const id = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    await execute(
      `INSERT INTO daily_reports (
        id, site_id, company_id, report_date, engineer_name, completed_tasks_count,
        active_workers_count, materials_consumed, issues_encountered, remarks,
        photos_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        siteId,
        req.user!.companyId,
        date,
        req.user!.name,
        Array.isArray(completedTasks) ? completedTasks.length : 0,
        parseInt(labourPresentCount, 10) || 0,
        materialsUsed ? JSON.stringify(materialsUsed) : null,
        Array.isArray(problemsSummary) ? problemsSummary.join('; ') : null,
        remarks || '',
        Array.isArray(photos) ? photos.length : 0,
        req.user!.id,
        now,
        now,
      ]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'SUBMIT_REPORT', 'daily_reports', id, `Submitted daily log for ${date}`);
    broadcastChange({ type: 'report', siteId, action: 'CREATE' });

    return res.status(201).json({ id, siteId, date, engineerName: req.user!.name });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DOCUMENTS ROUTES
// ==========================================
router.get('/documents', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let list: any[];

    if (siteId && typeof siteId === 'string') {
      if (req.user!.role !== 'BOSS' && !req.user!.assignedSiteIds.includes(siteId)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      list = await query('SELECT * FROM documents WHERE site_id = ? AND company_id = ? ORDER BY created_at DESC', [siteId, req.user!.companyId]);
    } else {
      if (req.user!.role === 'BOSS') {
        list = await query('SELECT * FROM documents WHERE company_id = ? ORDER BY created_at DESC', [req.user!.companyId]);
      } else {
        list = await query(
          `SELECT d.* FROM documents d
           INNER JOIN site_members sm ON d.site_id = sm.site_id
           WHERE sm.user_id = ? AND d.company_id = ?
           ORDER BY d.created_at DESC`,
          [req.user!.id, req.user!.companyId]
        );
      }
    }

    const formatted = list.map((d) => ({
      id: d.id,
      siteId: d.site_id,
      title: d.title,
      category: d.category,
      fileType: d.file_type,
      fileSize: d.file_size,
      uploadedBy: d.uploaded_by,
      uploadedDate: d.uploaded_date || 'Recent',
      downloadUrl: d.file_url,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/documents', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, title, category, fileType, fileSize, downloadUrl } = req.body;
    if (!siteId || !title || !category) {
      return res.status(400).json({ error: 'Missing required document fields.' });
    }

    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    await execute(
      `INSERT INTO documents (
        id, site_id, company_id, title, category, file_type,
        file_size, file_url, uploaded_by, uploaded_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        siteId,
        req.user!.companyId,
        title,
        category,
        fileType || 'PDF',
        fileSize || '1.2 MB',
        downloadUrl || '/placeholder.pdf',
        req.user!.name,
        dateStr,
        now,
      ]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'UPLOAD_DOCUMENT', 'documents', id, `Document uploaded: ${title}`);
    broadcastChange({ type: 'document', siteId, action: 'CREATE' });

    return res.status(201).json({ id, siteId, title, category, fileType: fileType || 'PDF', fileSize: fileSize || '1.2 MB', uploadedBy: req.user!.name, uploadedDate: dateStr, downloadUrl: downloadUrl || '/placeholder.pdf' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MEDIA (PHOTOS & VIDEOS) ROUTES
// ==========================================
router.get('/media', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let list: any[];

    if (siteId && typeof siteId === 'string') {
      list = await query('SELECT * FROM media_files WHERE site_id = ? AND company_id = ? ORDER BY created_at DESC', [siteId, req.user!.companyId]);
    } else {
      list = await query('SELECT * FROM media_files WHERE company_id = ? ORDER BY created_at DESC', [req.user!.companyId]);
    }

    const formatted = list.map((m) => ({
      id: m.id,
      siteId: m.site_id,
      title: m.title,
      category: m.category,
      mediaType: m.media_type,
      url: m.url,
      uploadedBy: m.uploaded_by,
      date: m.media_date,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/media', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, title, category, mediaType, url } = req.body;
    if (!siteId || !title || !url) {
      return res.status(400).json({ error: 'Site ID, title, and media URL are required.' });
    }

    const id = `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString();

    await execute(
      `INSERT INTO media_files (id, site_id, company_id, title, category, media_type, url, uploaded_by, media_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, siteId, req.user!.companyId, title, category || 'Site Progress', mediaType || 'image', url, req.user!.name, dateStr, now]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'UPLOAD_MEDIA', 'media_files', id, `Media uploaded: ${title}`);
    broadcastChange({ type: 'media', siteId, action: 'CREATE' });

    return res.status(201).json({ id, siteId, title, category: category || 'Site Progress', mediaType: mediaType || 'image', url, uploadedBy: req.user!.name, date: dateStr });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EXPENSES ROUTES
// ==========================================
router.get('/expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let list: any[];

    if (siteId && typeof siteId === 'string') {
      list = await query('SELECT * FROM expenses WHERE site_id = ? AND company_id = ? ORDER BY expense_date DESC', [siteId, req.user!.companyId]);
    } else {
      list = await query('SELECT * FROM expenses WHERE company_id = ? ORDER BY expense_date DESC', [req.user!.companyId]);
    }

    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', authMiddleware, checkSiteAccess((req) => req.body.siteId), async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, category, description, amount, payee, expenseDate } = req.body;
    if (!siteId || !category || !amount) {
      return res.status(400).json({ error: 'Missing required expense fields.' });
    }

    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    await execute(
      `INSERT INTO expenses (
        id, site_id, company_id, category, description, amount,
        payee, payment_status, expense_date, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [id, siteId, req.user!.companyId, category, description || '', parseFloat(amount) || 0, payee || 'Supplier', expenseDate || now.toISOString().split('T')[0], req.user!.id, now]
    );

    await logAudit(req.user!.companyId, siteId, req.user!.id, 'CREATE_EXPENSE', 'expenses', id, `Expense recorded: ${amount} for ${category}`);
    broadcastChange({ type: 'expense', siteId, action: 'CREATE' });

    return res.status(201).json({ id, siteId, category, amount: parseFloat(amount) || 0, paymentStatus: 'Pending' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CROSS-SITE ALERTS & AUDIT LOGS
// ==========================================
router.get('/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const alerts: any[] = [];
    const companyId = req.user!.companyId;
    const isBoss = req.user!.role === 'BOSS';
    const siteIds = req.user!.assignedSiteIds;

    if (!isBoss && siteIds.length === 0) {
      return res.json([]);
    }

    const sitePlaceholders = siteIds.map(() => '?').join(', ');

    // 1. Delayed Tasks Alert
    let delayedTasks: { count: string }[];
    if (isBoss) {
      delayedTasks = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM tasks WHERE company_id = ? AND status = 'Delayed'",
        [companyId]
      );
    } else {
      delayedTasks = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM tasks WHERE company_id = ? AND site_id IN (${sitePlaceholders}) AND status = 'Delayed'`,
        [companyId, ...siteIds]
      );
    }

    if (parseInt(delayedTasks[0]?.count || '0', 10) > 0) {
      alerts.push({
        id: 'alert-delayed',
        type: 'CRITICAL',
        title: 'Delayed Tasks Require Intervention',
        count: parseInt(delayedTasks[0].count, 10),
        message: `${delayedTasks[0].count} task(s) marked delayed due to rain, labour shortages, or material stockouts.`,
        actionLink: '/tasks',
      });
    }

    // 2. Low Stock Materials Alert
    let lowStock: { count: string }[];
    if (isBoss) {
      lowStock = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM materials WHERE company_id = ? AND current_stock <= min_threshold',
        [companyId]
      );
    } else {
      lowStock = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM materials WHERE company_id = ? AND site_id IN (${sitePlaceholders}) AND current_stock <= min_threshold`,
        [companyId, ...siteIds]
      );
    }

    if (parseInt(lowStock[0]?.count || '0', 10) > 0) {
      alerts.push({
        id: 'alert-materials',
        type: 'WARNING',
        title: 'Low Inventory Threshold Crossed',
        count: parseInt(lowStock[0].count, 10),
        message: `${lowStock[0].count} material item(s) are below minimum safety buffer limits.`,
        actionLink: '/materials',
      });
    }

    // 3. High Severity Open Problems Alert
    let openProblems: { count: string }[];
    if (isBoss) {
      openProblems = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM problems WHERE company_id = ? AND status = 'Open' AND severity = 'High'",
        [companyId]
      );
    } else {
      openProblems = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM problems WHERE company_id = ? AND site_id IN (${sitePlaceholders}) AND status = 'Open' AND severity = 'High'`,
        [companyId, ...siteIds]
      );
    }

    if (parseInt(openProblems[0]?.count || '0', 10) > 0) {
      alerts.push({
        id: 'alert-problems',
        type: 'CRITICAL',
        title: 'High Severity On-Site Problems',
        count: parseInt(openProblems[0].count, 10),
        message: `${openProblems[0].count} critical site problem(s) pending resolution.`,
        actionLink: '/problems',
      });
    }

    // 4. Broken Down Equipment
    let brokenDown: { count: string }[];
    if (isBoss) {
      brokenDown = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM equipment WHERE company_id = ? AND status = 'Under Breakdown'",
        [companyId]
      );
    } else {
      brokenDown = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM equipment WHERE company_id = ? AND current_site_id IN (${sitePlaceholders}) AND status = 'Under Breakdown'`,
        [companyId, ...siteIds]
      );
    }

    if (parseInt(brokenDown[0]?.count || '0', 10) > 0) {
      alerts.push({
        id: 'alert-equipment',
        type: 'WARNING',
        title: 'Equipment Breakdown Reported',
        count: parseInt(brokenDown[0].count, 10),
        message: `${brokenDown[0].count} heavy machine(s) are currently non-operational.`,
        actionLink: '/equipment',
      });
    }

    return res.json(alerts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', authMiddleware, requireRole(['BOSS', 'PROJECT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const isBoss = req.user!.role === 'BOSS';
    const siteIds = req.user!.assignedSiteIds;

    let logs: any[];
    if (isBoss) {
      logs = await query(
        `SELECT a.*, u.name as user_name, s.name as site_name FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN sites s ON a.site_id = s.id
         WHERE a.company_id = ?
         ORDER BY a.created_at DESC
         LIMIT 100`,
        [req.user!.companyId]
      );
    } else {
      if (siteIds.length === 0) {
        return res.json([]);
      }
      const placeholders = siteIds.map(() => '?').join(', ');
      logs = await query(
        `SELECT a.*, u.name as user_name, s.name as site_name FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN sites s ON a.site_id = s.id
         WHERE a.company_id = ? AND a.site_id IN (${placeholders})
         ORDER BY a.created_at DESC
         LIMIT 100`,
        [req.user!.companyId, ...siteIds]
      );
    }

    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Search across isolated accessible items
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      return res.json({ sites: [], tasks: [], materials: [], equipment: [] });
    }

    const likeQ = `%${q.toLowerCase()}%`;
    const companyId = req.user!.companyId;
    const isBoss = req.user!.role === 'BOSS';
    const siteIds = req.user!.assignedSiteIds;

    if (!isBoss && siteIds.length === 0) {
      return res.json({ sites: [], tasks: [], materials: [], equipment: [] });
    }

    const sitePlaceholders = siteIds.map(() => '?').join(', ');

    let sitesRes: any[];
    let tasksRes: any[];
    let matRes: any[];
    let eqRes: any[];

    if (isBoss) {
      sitesRes = await query(
        `SELECT id, name, code, location, status FROM sites
         WHERE company_id = ? AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(location) LIKE ?)`,
        [companyId, likeQ, likeQ, likeQ]
      );

      tasksRes = await query(
        `SELECT id, site_id, name, status, assigned_team FROM tasks
         WHERE company_id = ? AND (LOWER(name) LIKE ? OR LOWER(location) LIKE ?)
         LIMIT 15`,
        [companyId, likeQ, likeQ]
      );

      matRes = await query(
        `SELECT id, site_id, name, category, current_stock, unit FROM materials
         WHERE company_id = ? AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)
         LIMIT 15`,
        [companyId, likeQ, likeQ]
      );

      eqRes = await query(
        `SELECT id, name, type, status, current_site_id FROM equipment
         WHERE company_id = ? AND (LOWER(name) LIKE ? OR LOWER(type) LIKE ?)
         LIMIT 15`,
        [companyId, likeQ, likeQ]
      );
    } else {
      sitesRes = await query(
        `SELECT id, name, code, location, status FROM sites
         WHERE company_id = ? AND id IN (${sitePlaceholders}) AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(location) LIKE ?)`,
        [companyId, ...siteIds, likeQ, likeQ, likeQ]
      );

      tasksRes = await query(
        `SELECT id, site_id, name, status, assigned_team FROM tasks
         WHERE company_id = ? AND site_id IN (${sitePlaceholders}) AND (LOWER(name) LIKE ? OR LOWER(location) LIKE ?)
         LIMIT 15`,
        [companyId, ...siteIds, likeQ, likeQ]
      );

      matRes = await query(
        `SELECT id, site_id, name, category, current_stock, unit FROM materials
         WHERE company_id = ? AND site_id IN (${sitePlaceholders}) AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)
         LIMIT 15`,
        [companyId, ...siteIds, likeQ, likeQ]
      );

      eqRes = await query(
        `SELECT id, name, type, status, current_site_id FROM equipment
         WHERE company_id = ? AND (current_site_id IN (${sitePlaceholders}) OR current_site_id IS NULL) AND (LOWER(name) LIKE ? OR LOWER(type) LIKE ?)
         LIMIT 15`,
        [companyId, ...siteIds, likeQ, likeQ]
      );
    }

    return res.json({
      sites: sitesRes,
      tasks: tasksRes,
      materials: matRes,
      equipment: eqRes,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
