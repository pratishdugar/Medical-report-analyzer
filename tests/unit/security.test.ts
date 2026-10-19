import { describe, expect, it } from "vitest";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/auth/totp";
import { isHeic, sanitizeFileName, sniffMime } from "@/lib/files";
import { clientIpFrom, isSameOrigin } from "@/lib/request";
import { hashShareToken, signShareCookie, verifyShareCookie } from "@/lib/share";
import { safeNext } from "@/lib/validation";

describe("passwords", () => {
  it("hashes with argon2id and verifies", async () => {
    const h = await hashPassword("a long and memorable phrase");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, "a long and memorable phrase")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
  });
  it("rejects weak passwords", () => {
    expect(checkPasswordStrength("short")).toBe("too_short");
    expect(checkPasswordStrength("password123")).toBe("too_common");
    expect(checkPasswordStrength("india@123")).toBe("too_common");
    expect(checkPasswordStrength("rameshkumar2026", "rameshkumar@gmail.com")).toBe("contains_email");
    expect(checkPasswordStrength("chai with ginger at 5")).toBeNull();
  });
});

describe("uploads", () => {
  it("sniffs real content, not the claimed type", () => {
    expect(sniffMime(Buffer.from("%PDF-1.7\n........"))).toBe("application/pdf");
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(sniffMime(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(isHeic(Buffer.from("\0\0\0\x18ftypheic\0\0\0\0", "latin1"))).toBe(true);
  });
  it("sanitises file names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName('C:\\x\\"evil".pdf')).toBe("evil.pdf");
  });
});

describe("request helpers", () => {
  it("only allows same-site relative redirects", () => {
    expect(safeNext("/reports/1")).toBe("/reports/1");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
  });
  it("takes the client IP added by our proxy, not a spoofed left-most one", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
  });
  it("rejects cross-site API requests", () => {
    const ok = new Request("http://localhost:3000/api/reports", { method: "POST", headers: { origin: "http://localhost:3000", host: "localhost:3000" } });
    const bad = new Request("http://localhost:3000/api/reports", { method: "POST", headers: { origin: "https://evil.example", host: "localhost:3000" } });
    const none = new Request("http://localhost:3000/api/reports", { method: "POST", headers: { host: "localhost:3000" } });
    expect(isSameOrigin(ok)).toBe(true);
    expect(isSameOrigin(bad)).toBe(false);
    expect(isSameOrigin(none)).toBe(false);
  });
});

describe("2FA recovery codes and share links", () => {
  it("generates unique recovery codes stored only as hashes", () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(hashes[0]).toBe(hashRecoveryCode(codes[0].toLowerCase()));
    expect(hashes.join("")).not.toContain(codes[0]);
  });
  it("signs PIN cookies per link and rejects forgeries", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const c = signShareCookie(id);
    expect(verifyShareCookie(id, c)).toBe(true);
    expect(verifyShareCookie("44444444-4444-4444-8444-444444444444", c)).toBe(false);
    expect(verifyShareCookie(id, c.replace(/.$/, "x"))).toBe(false);
    expect(verifyShareCookie(id, "9999999999.forged")).toBe(false);
  });
  it("rejects malformed share tokens", () => {
    expect(hashShareToken("short")).toBeNull();
    expect(hashShareToken("../../etc/passwd/xxxxxxxxxxxxxxxx")).toBeNull();
    expect(hashShareToken("a".repeat(32))).toMatch(/^[0-9a-f]{64}$/);
  });
});
