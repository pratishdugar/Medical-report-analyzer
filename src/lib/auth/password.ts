import { hash, verify } from "@node-rs/argon2";

// OWASP recommended argon2id parameters (argon2id is the library default).
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 };

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;
/**
 * Spend the same time as a real verification when the account doesn't exist,
 * so response timing doesn't reveal which emails are registered.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("timing-equaliser-password");
  await verifyPassword(await dummyHash, password);
}

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123",
  "qwertyuiop", "iloveyou", "11111111", "00000000", "abcd1234", "admin123", "welcome1",
  "welcome123", "india123", "india@123", "bharat123", "letmein123", "sunshine1", "princess1",
  "football1", "monkey123", "dragon123", "passw0rd", "p@ssw0rd", "p@ssword", "qwerty@123",
  "abc12345", "1q2w3e4r", "zaq12wsx", "asdfghjkl", "computer1", "krishna123", "ganesh123",
  "sairam123", "omsairam", "jaishreeram", "hanuman123", "mumbai123", "delhi123", "test1234",
]);

export type PasswordProblem = "too_short" | "too_long" | "too_common" | "contains_email";

/** NIST SP 800-63B style checks: length + known-bad list, no composition rules. */
export function checkPasswordStrength(password: string, email?: string): PasswordProblem | null {
  if (password.length < 8) return "too_short";
  if (password.length > 128) return "too_long";
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password) || /^(0123456789|123456789|987654321)/.test(lower)) {
    return "too_common";
  }
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "contains_email";
  return null;
}
