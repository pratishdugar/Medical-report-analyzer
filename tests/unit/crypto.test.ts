import { afterEach, describe, expect, it } from "vitest";
import { decryptBytes, decryptText, encryptBytes, encryptText } from "@/lib/crypto";
import { resetEnvCache } from "@/lib/env";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("per-user AES-GCM encryption", () => {
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY_PREVIOUS;
    resetEnvCache();
  });

  it("round-trips", () => {
    const enc = encryptText(A, "Haemoglobin 12.1", "reports.notes:r1");
    expect(enc).not.toContain("Haemoglobin");
    expect(decryptText(A, enc, "reports.notes:r1")).toBe("Haemoglobin 12.1");
  });

  it("uses a fresh IV every time", () => {
    expect(encryptText(A, "same", "x")).not.toBe(encryptText(A, "same", "x"));
  });

  it("cannot be decrypted with another user's key", () => {
    const enc = encryptText(A, "secret", "x");
    expect(() => decryptText(B, enc, "x")).toThrow();
  });

  it("is bound to its record (AAD)", () => {
    const enc = encryptText(A, "secret", "file:report-1");
    expect(() => decryptText(A, enc, "file:report-2")).toThrow();
  });

  it("detects tampering", () => {
    const blob = encryptBytes(A, Buffer.from("payload"), "x");
    blob[blob.length - 1] ^= 1;
    expect(() => decryptBytes(A, blob, "x")).toThrow();
  });

  it("supports key rotation via ENCRYPTION_KEY_PREVIOUS", () => {
    const old = encryptText(A, "old data", "x");
    process.env.ENCRYPTION_KEY_PREVIOUS = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    resetEnvCache();
    try {
      expect(decryptText(A, old, "x")).toBe("old data");
      const fresh = encryptText(A, "new data", "x");
      expect(decryptText(A, fresh, "x")).toBe("new data");
    } finally {
      process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY_PREVIOUS;
    }
  });
});
