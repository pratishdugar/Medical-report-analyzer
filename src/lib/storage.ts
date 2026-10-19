import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { aad, decryptBytes, encryptBytes } from "./crypto";
import { isUuid } from "./db";
import { env } from "./env";

/*
 * Encrypted file storage. Original reports are encrypted with the owner's
 * key before they touch disk, and paths are built only from UUIDs so user
 * input can never influence the filesystem location.
 *
 * For multi-instance deployments mount STORAGE_DIR on shared/persistent
 * storage (e.g. EFS / a persistent volume in an Indian region).
 */

function filePath(userId: string, key: string): string {
  if (!isUuid(userId) || !isUuid(key)) throw new Error("Invalid storage path component");
  return path.join(path.resolve(env().STORAGE_DIR), userId, `${key}.bin`);
}

export async function saveEncryptedFile(userId: string, key: string, data: Buffer): Promise<void> {
  const target = filePath(userId, key);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, encryptBytes(userId, data, aad.reportFile(key)), { mode: 0o600 });
  await rename(tmp, target);
}

export async function readEncryptedFile(userId: string, key: string): Promise<Buffer> {
  const blob = await readFile(filePath(userId, key));
  return decryptBytes(userId, blob, aad.reportFile(key));
}

export async function deleteEncryptedFile(userId: string, key: string): Promise<void> {
  await rm(filePath(userId, key), { force: true });
}

export async function deleteAllUserFiles(userId: string): Promise<void> {
  if (!isUuid(userId)) throw new Error("Invalid user id");
  await rm(path.join(path.resolve(env().STORAGE_DIR), userId), { recursive: true, force: true });
}
