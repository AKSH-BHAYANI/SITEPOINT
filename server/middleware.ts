import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getOne, query, execute } from './pgDb.ts';

// Fail fast in production if JWT_SECRET is not configured in environment
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing. A secure random JWT secret is mandatory in production.');
    }
    // For non-production development environments, use a process-bound cryptographically random secret
    const globalObj = global as any;
    if (!globalObj.__sitepoint_jwt_secret) {
      globalObj.__sitepoint_jwt_secret = crypto.randomBytes(48).toString('hex');
    }
    return globalObj.__sitepoint_jwt_secret;
  }
  return secret;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'BOSS' | 'PROJECT_MANAGER' | 'SITE_ENGINEER';
  companyId: string;
  assignedSiteIds: string[];
  title?: string;
  phone?: string;
  membershipStatus?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// In-memory rate limiter for authentication endpoints
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = process.env.NODE_ENV === 'production' ? 15 : 100;

  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many attempts. Please wait 60 seconds before trying again.',
    });
  }

  record.count += 1;
  next();
}

// Strict rate limiter for Company Code join attempts (brute-force protection)
const joinAttempts = new Map<string, { count: number; firstAttempt: number }>();
export function joinRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes window
  const maxAttempts = 15; // Max 15 attempts per 15 minutes

  const record = joinAttempts.get(ip);
  if (!record || now - record.firstAttempt > windowMs) {
    joinAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many join requests from this address. Please wait 15 minutes before retrying.',
    });
  }

  record.count += 1;
  next();
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  try {
    let userId: string | undefined;
    let email: string | undefined;

    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret()) as any;
      userId = decoded.id;
      email = decoded.email;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired authentication credentials.' });
    }

    // Look up user from Cloud SQL PostgreSQL
    let user: any;
    if (userId) {
      user = await getOne(
        'SELECT id, company_id, name, email, role, title, phone, is_active, membership_status FROM users WHERE id = ?',
        [userId]
      );
    } else if (email) {
      user = await getOne(
        'SELECT id, company_id, name, email, role, title, phone, is_active, membership_status FROM users WHERE LOWER(email) = LOWER(?)',
        [email]
      );
    }

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (user.membership_status === 'PENDING') {
      return res.status(403).json({ error: 'Your membership is pending approval by the company administrator.' });
    }

    if (user.membership_status === 'REJECTED') {
      return res.status(403).json({ error: 'Your company membership request was rejected by the administrator.' });
    }

    if (user.is_active === false || user.membership_status === 'DEACTIVATED') {
      return res.status(403).json({ error: 'This user account has been deactivated. Please contact your administrator.' });
    }

    // Fresh assigned site IDs from PostgreSQL site_members
    const members = await query<{ site_id: string }>(
      'SELECT site_id FROM site_members WHERE user_id = ?',
      [user.id]
    );
    const assignedSiteIds = members.map((m) => m.site_id);

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      companyId: user.company_id,
      assignedSiteIds,
      title: user.title,
      phone: user.phone,
      membershipStatus: user.membership_status,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Authentication failed: ' + (err.message || 'Invalid token') });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Action requires role [${allowedRoles.join(', ')}]. Current role: ${req.user.role}.`,
      });
    }
    next();
  };
}

export function checkSiteAccess(getSiteId?: (req: AuthRequest) => string | undefined) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    let siteId: string | undefined;
    if (getSiteId) {
      siteId = getSiteId(req);
    } else {
      siteId = (req.params.siteId || req.params.id || req.query.siteId || req.body.siteId) as string;
    }

    if (!siteId) {
      return next();
    }

    // Verify site belongs to user's company
    const site = await getOne<{ id: string; company_id: string }>(
      'SELECT id, company_id FROM sites WHERE id = ?',
      [siteId]
    );

    if (!site || site.company_id !== req.user.companyId) {
      return res.status(404).json({ error: 'Site not found or does not belong to your company.' });
    }

    // BOSS has company-wide access to all sites
    if (req.user.role === 'BOSS') {
      return next();
    }

    // PM and Site Engineer must be explicitly assigned to this site
    if (!req.user.assignedSiteIds.includes(siteId)) {
      return res.status(403).json({
        error: `Access Denied: You (${req.user.name}) are not assigned to site ${siteId}.`,
      });
    }

    next();
  };
}

export async function logAudit(
  companyId: string,
  siteId: string | null,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details?: string,
  ipAddress?: string
) {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await execute(
      `INSERT INTO audit_logs (id, company_id, site_id, user_id, action, entity, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, siteId, userId, action, entity, entityId, details || null, ipAddress || null, new Date()]
    );
  } catch (err) {
    console.error('Failed to write audit log to PostgreSQL:', err);
  }
}
