import * as OTPAuth from "otpauth";
import { randomBytes } from "node:crypto";
import { sha256Hex } from "../crypto";
import { env } from "../env";

function totp(secretBase32: string, label = "user") {
  return new OTPAuth.TOTP({
    issuer: env().APP_NAME,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function totpUri(secretBase32: string, email: string): string {
  return totp(secretBase32, email).toString();
}

export function verifyTotp(secretBase32: string, token: string): boolean {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return totp(secretBase32).validate({ token: clean, window: 1 }) !== null;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Ten one-time recovery codes; only their hashes are stored. */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: 10 }, () => {
    const bytes = randomBytes(8);
    const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

export function hashRecoveryCode(code: string): string {
  return sha256Hex(code.toUpperCase().replace(/[^A-Z0-9]/g, ""));
}
