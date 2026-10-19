import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { aad, decryptOptional } from "@/lib/crypto";
import { getSession } from "@/lib/dal";
import { isUuid, withUser } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { fileResponse, type AllowedMime } from "@/lib/files";
import { clientIpFrom } from "@/lib/request";
import { readEncryptedFile } from "@/lib/storage";

/** Streams the decrypted original report to its owner only. */
export async function GET(request: Request, ctx: RouteContext<"/api/files/[reportId]">) {
  const { reportId } = await ctx.params;
  const session = await getSession();
  if (!session || session.session.mfaPending) return new Response("Unauthorized", { status: 401 });
  if (!isUuid(reportId)) return new Response("Not found", { status: 404 });
  const userId = session.user.id;
  const [report] = await withUser(userId, (tx) => tx.select().from(reports).where(eq(reports.id, reportId)).limit(1));
  if (!report?.fileKey || !report.mimeType) return new Response("Not found", { status: 404 });

  const data = await readEncryptedFile(userId, report.fileKey);
  await audit(userId, "report_viewed_file", { ip: clientIpFrom(request.headers) });
  return fileResponse(data, report.mimeType as AllowedMime, decryptOptional(userId, report.fileNameEnc, aad.reportField(report.id, "file_name")), new URL(request.url).searchParams.has("download"));
}
