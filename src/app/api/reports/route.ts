import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { hit } from "@/lib/auth/rate-limit";
import { aad, encryptText, sha256Hex } from "@/lib/crypto";
import { getOwnedProfile, getSession } from "@/lib/dal";
import { withUser } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { isHeic, sanitizeFileName, sniffMime } from "@/lib/files";
import { processReport } from "@/lib/reports/process";
import { clientIpFrom, isSameOrigin } from "@/lib/request";
import { saveEncryptedFile } from "@/lib/storage";
import { optionalIsoDate, REPORT_CATEGORIES } from "@/lib/validation";

export const maxDuration = 300;

const err = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  Response.json({ error, ...extra }, { status });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return err("forbidden", 403);
  const session = await getSession();
  if (!session || session.session.mfaPending) return err("unauthorized", 401);
  const { user } = session;
  if (!(await hit("uploadPerUser", user.id)).ok) return err("common.rateLimited", 429);

  const maxBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes + 1024 * 1024) return err("upload.errors.tooLarge", 413);

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return err("upload.errors.badType", 400);
  }
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return err("upload.errors.noFile", 400);
  if (file.size > maxBytes) return err("upload.errors.tooLarge", 413);

  const profileId = String(fd.get("profileId") ?? "");
  if (!(await getOwnedProfile(user.id, profileId))) return err("upload.errors.profile", 400);

  const data = Buffer.from(await file.arrayBuffer());
  if (isHeic(data)) return err("upload.errors.heic", 415);
  const mime = sniffMime(data);
  if (!mime) return err("upload.errors.badType", 415);

  const category = z.enum(REPORT_CATEGORIES).catch("auto").parse(String(fd.get("category") ?? "auto"));
  const reportDate = optionalIsoDate.catch(null).parse(String(fd.get("reportDate") ?? ""));
  const title = String(fd.get("title") ?? "").trim().slice(0, 120);
  const sha = sha256Hex(data);

  const existing = await withUser(user.id, (tx) =>
    tx.select({ id: reports.id }).from(reports).where(and(eq(reports.fileSha256, sha), eq(reports.profileId, profileId))).limit(1),
  );
  if (existing[0]) return err("upload.errors.duplicate", 409, { id: existing[0].id });

  const id = crypto.randomUUID();
  await saveEncryptedFile(user.id, id, data);
  await withUser(user.id, (tx) =>
    tx.insert(reports).values({
      id,
      userId: user.id,
      profileId,
      // File names often contain the patient's name, so they're only stored encrypted.
      title: title || "",
      category,
      reportDate,
      status: "processing",
      fileKey: id,
      fileNameEnc: encryptText(user.id, sanitizeFileName(file.name), aad.reportField(id, "file_name")),
      mimeType: mime,
      fileSize: data.length,
      fileSha256: sha,
    }),
  );
  await audit(user.id, "report_uploaded", { ip: clientIpFrom(request.headers), userAgent: request.headers.get("user-agent")?.slice(0, 300) });
  after(() => processReport(user.id, id));
  return Response.json({ id }, { status: 201 });
}
