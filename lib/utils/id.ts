/**
 * Standard ID generation utility.
 * Strict rule: All IDs across tables, foreign keys, and sub-items must be valid UUID v4.
 */

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID_ANY_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Generate a cryptographically strong UUID v4.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Alias for backward compatibility and convenience.
 */
export const generateId = generateUUID;

/**
 * Validate if a string is a valid UUID format.
 */
export function isValidUUID(id: string): boolean {
  return UUID_ANY_REGEX.test(id);
}

/**
 * Validate strictly for UUID v4.
 */
export function isValidUUIDv4(id: string): boolean {
  return UUID_V4_REGEX.test(id);
}
