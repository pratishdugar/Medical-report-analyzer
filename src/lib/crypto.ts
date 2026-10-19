import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/*
 * Application-layer encryption (AES-256-GCM).
 *
 * Every user gets their own data key, derived with HKDF from the master key
 * and the user id. Ciphertext is additionally bound to the record/field it
 * belongs to through GCM associated data (AAD), so it cannot be copied to
 * another row or another user and still decrypt.
 *
 * Binary layout: "SL1" | keyId(4) | iv(12) | tag(16) | ciphertext
 * keyId = first 4 bytes of SHA-256(master key) -> enables key rotation with
 * ENCRYPTION_KEY_PREVIOUS.
 */

const MAGIC = Buffer.from("SL1");
const IV_LEN = 12;
const TAG_LEN = 16;
const KEYID_LEN = 4;

type MasterKey = { id: Buffer; key: Buffer };

let masterCache: { source: string; keys: MasterKey[] } | null = null;
const derivedCache = new Map<string, Buffer>();

function parseKey(b64: string): MasterKey {
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("Encryption keys must be 32 bytes (base64 encoded)");
  return { id: createHash("sha256").update(key).digest().subarray(0, KEYID_LEN), key };
}

function masterKeys(): MasterKey[] {
  const e = env();
  const source = `${e.ENCRYPTION_KEY}|${e.ENCRYPTION_KEY_PREVIOUS ?? ""}`;
  if (masterCache?.source !== source) {
    const keys = [parseKey(e.ENCRYPTION_KEY)];
    if (e.ENCRYPTION_KEY_PREVIOUS) keys.push(parseKey(e.ENCRYPTION_KEY_PREVIOUS));
    masterCache = { source, keys };
    derivedCache.clear();
  }
  return masterCache.keys;
}

function userKey(master: MasterKey, userId: string): Buffer {
  const cacheKey = `${master.id.toString("hex")}:${userId}`;
  let key = derivedCache.get(cacheKey);
  if (!key) {
    key = Buffer.from(hkdfSync("sha256", master.key, "sehatlens/v1", `user:${userId}`, 32));
    if (derivedCache.size > 5000) derivedCache.clear();
    derivedCache.set(cacheKey, key);
  }
  return key;
}

export function encryptBytes(userId: string, plaintext: Buffer, aad: string): Buffer {
  const master = masterKeys()[0];
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", userKey(master, userId), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([MAGIC, master.id, iv, cipher.getAuthTag(), ct]);
}

export function decryptBytes(userId: string, blob: Buffer, aad: string): Buffer {
  const headerLen = MAGIC.length + KEYID_LEN + IV_LEN + TAG_LEN;
  if (blob.length < headerLen || !blob.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Unrecognised ciphertext");
  }
  const keyId = blob.subarray(MAGIC.length, MAGIC.length + KEYID_LEN);
  const master = masterKeys().find((k) => timingSafeEqual(k.id, keyId));
  if (!master) throw new Error("No key available for ciphertext");
  let offset = MAGIC.length + KEYID_LEN;
  const iv = blob.subarray(offset, (offset += IV_LEN));
  const tag = blob.subarray(offset, (offset += TAG_LEN));
  const decipher = createDecipheriv("aes-256-gcm", userKey(master, userId), iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(offset)), decipher.final()]);
}

export function encryptText(userId: string, text: string, aad: string): string {
  return encryptBytes(userId, Buffer.from(text, "utf8"), aad).toString("base64");
}

export function decryptText(userId: string, enc: string, aad: string): string {
  return decryptBytes(userId, Buffer.from(enc, "base64"), aad).toString("utf8");
}

export function encryptOptional(userId: string, text: string | null | undefined, aad: string): string | null {
  return text ? encryptText(userId, text, aad) : null;
}

export function decryptOptional(userId: string, enc: string | null | undefined, aad: string): string | null {
  if (!enc) return null;
  try {
    return decryptText(userId, enc, aad);
  } catch {
    return null;
  }
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** URL-safe random token with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Field-scoped associated data so ciphertext can't be moved between rows. */
export const aad = {
  reportFile: (reportId: string) => `file:${reportId}`,
  reportField: (reportId: string, field: string) => `reports.${field}:${reportId}`,
  profileAbha: (profileId: string) => `profiles.abha:${profileId}`,
  historyDetails: (entryId: string) => `history.details:${entryId}`,
  userTotp: (userId: string) => `users.totp:${userId}`,
};
