/**
 * Content sniffing for uploads. The browser-supplied MIME type and file name
 * are never trusted; only the magic bytes decide what a file is.
 */
export type AllowedMime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

export function sniffMime(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return "image/webp";
  }
  return null;
}

export function isHeic(buf: Buffer): boolean {
  const brand = buf.subarray(4, 12).toString("latin1");
  return /^ftyp(heic|heix|hevc|mif1|msf1)/.test(brand);
}

export const extensionFor: Record<AllowedMime, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Strip path components and control characters from a user supplied file name. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "report";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").trim().slice(0, 120);
  return cleaned || "report";
}

/** Response for serving a decrypted original file to an authorised viewer. */
export function fileResponse(data: Buffer, mime: AllowedMime, name: string | null, download: boolean) {
  const ext = extensionFor[mime] ?? "bin";
  const safeName = (name ?? `report.${ext}`).replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
