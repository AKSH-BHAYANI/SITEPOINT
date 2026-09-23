import crypto from 'crypto';

// Cryptographically secure character set (alphanumeric, excluding ambiguous chars 0, O, 1, I)
const CODE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a cryptographically secure, unpredictable company join code.
 * Uses crypto.randomBytes rather than Math.random().
 */
export function generateSecureCompanyCode(length: number = 8): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  return result;
}

/**
 * Normalizes input company codes (case-insensitive trimming and uppercasing).
 */
export function normalizeCompanyCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase();
}
