import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../src/db/index.ts';
import { validatePassword } from '../src/utils/passwordPolicy.ts';

async function setupBoss() {
  const secret = process.env.SITEPOINT_BOOTSTRAP_SECRET?.trim();
  const bootstrapPassword = process.env.SITEPOINT_BOOTSTRAP_PASSWORD;

  if (!secret) {
    console.error('FATAL: SITEPOINT_BOOTSTRAP_SECRET environment variable is missing.');
    process.exit(1);
  }

  if (!bootstrapPassword || bootstrapPassword.trim() === '') {
    console.error('FATAL: SITEPOINT_BOOTSTRAP_PASSWORD environment variable is missing.');
    process.exit(1);
  }

  const passwordValidation = validatePassword(bootstrapPassword);
  if (!passwordValidation.valid) {
    console.error(`FATAL: Invalid SITEPOINT_BOOTSTRAP_PASSWORD: ${passwordValidation.error}`);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure primary company exists
    let companyId: string;
    const compRes = await client.query('SELECT id, name, code FROM companies LIMIT 1');
    if (compRes.rows.length > 0) {
      companyId = compRes.rows[0].id;
      console.log(`Using existing company: ${compRes.rows[0].name} (${companyId}, Code: ${compRes.rows[0].code})`);
    } else {
      companyId = `comp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const code = 'SITE2026';
      const now = new Date();
      await client.query(
        'INSERT INTO companies (id, name, code, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [companyId, 'SITEPOINT Constructions', code, now, now]
      );
      console.log(`Created new company: SITEPOINT Constructions (${companyId}, Code: ${code})`);
    }

    const email = 'boss@sitepoint.com';
    const plainPassword = bootstrapPassword;
    const name = 'SITEPOINT Admin';
    const role = 'BOSS';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(plainPassword, salt);
    const now = new Date();

    // 2. Check if a user with this email or an existing Boss user exists
    const existingUser = await client.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = $1 OR role = $2 ORDER BY (LOWER(email) = $1) DESC LIMIT 1',
      [email, role]
    );

    let userId: string;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log(`Updating existing user/boss account (${userId}, previous email: ${existingUser.rows[0].email})...`);
      await client.query(
        `UPDATE users
         SET email = $1,
             name = $2,
             password_hash = $3,
             role = 'BOSS',
             membership_status = 'ACTIVE',
             is_active = true,
             company_id = $4,
             updated_at = $5
         WHERE id = $6`,
        [email, name, passwordHash, companyId, now, userId]
      );
    } else {
      userId = `usr-boss-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      console.log(`Creating new Boss account (${userId})...`);
      await client.query(
        `INSERT INTO users (
           id, company_id, email, password_hash, name, role, title, phone, is_active, membership_status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'BOSS', 'Managing Director & Owner', '', true, 'ACTIVE', $6, $7)`,
        [userId, companyId, email, passwordHash, name, now, now]
      );
    }

    // Clean up any extraneous boss accounts if any to ensure exactly ONE controlled Boss
    await client.query(
      "UPDATE users SET role = 'PROJECT_MANAGER' WHERE role = 'BOSS' AND id != $1",
      [userId]
    );

    await client.query('COMMIT');
    console.log('✅ Boss account successfully configured:');
    console.log(`   Email: ${email}`);
    console.log(`   Role: BOSS`);
    console.log(`   Status: ACTIVE (is_active: true)`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to setup Boss account:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupBoss();
