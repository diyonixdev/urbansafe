/** Validates an email address. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validates a password (minimum 6 characters, matches Firebase default). */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/** Validates a display name (non-empty, 2-50 characters). */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
}

/** Validates a username (3-20 chars, alphanumeric, underscores and hyphens). */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username.trim());
}
