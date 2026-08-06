const UPPER_RE = /[A-Z]/
const LOWER_RE = /[a-z]/
const DIGIT_RE = /[0-9]/
const SPECIAL_RE = /[^A-Za-z0-9]/

/**
 * Mirrors the backend's PendingUserDTO password policy: at least 8 characters,
 * with an uppercase letter, a lowercase letter, a digit, and a symbol.
 * Returns null when the password is valid, otherwise one plain-language
 * sentence describing what is missing.
 */
export function passwordIssue(pw: string): string | null {
  const hasLength = pw.length >= 8
  const hasUpper = UPPER_RE.test(pw)
  const hasLower = LOWER_RE.test(pw)
  const hasDigit = DIGIT_RE.test(pw)
  const hasSpecial = SPECIAL_RE.test(pw)

  if (hasLength && hasUpper && hasLower && hasDigit && hasSpecial) return null

  return 'Password needs at least 8 characters, an uppercase letter, a lowercase letter, a number, and a symbol.'
}
