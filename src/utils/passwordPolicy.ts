/**
 * SITEPOINT Simple Password Policy
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 letter ([a-zA-Z])
 * - At least 1 number ([0-9])
 * - Special characters are optional
 */

export const PASSWORD_REQUIREMENT_MESSAGE =
  'Password must be at least 8 characters and contain at least one letter and one number.';

export function validatePassword(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== 'string' || password.length < 8) {
    return {
      valid: false,
      error: PASSWORD_REQUIREMENT_MESSAGE,
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      error: PASSWORD_REQUIREMENT_MESSAGE,
    };
  }

  return { valid: true };
}
