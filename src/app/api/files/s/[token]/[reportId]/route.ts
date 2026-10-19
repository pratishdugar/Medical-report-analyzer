import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { hit } from "@/lib/auth/rate-limit";
import { isUuid } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { fileResponse, type AllowedMime } from "@/lib/files";
import { clientIpFrom } from "@/lib/request";
import { shareCookieName, verifyShareCookie, withSharedLink } from "@/lib/share";
import { readEncryptedFile } from "@/lib/storage";

/** Original report file for a doctor share link that allows files. */
export async function GET(request: Request, ctx: RouteContext<"/api/files/s/[token]/[reportId]">) {
  const { token, reportId } = await ctx.params;
  if (!isUuid(reportId)) return new Response("Not found", { status: 404 });
  if (!(await hit("sharePerIp", clientIpFrom(request.headers))).ok) return new Response("Too many requests", { status: 429 });
  const jar = await cookies();
  const res = await withSharedLink(token, async (tx, link) => {
    if (!link.includeFiles) return null;
    if (link.pinHash && !verifyShareCookie(link.id, jar.get(shareCookieName(link.id))?.value)) return null;
    const [r] = await tx
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.profileId, link.profileId)))
      .limit(1);
    return r ?? null;
  });
  const report = res?.result;
  if (!res || !report?.fileKey || !report.mimeType) return new Response("Not found", { status: 404 });
  const data = await readEncryptedFile(res.link.userId, report.fileKey);
  return fileResponse(data, report.mimeType as AllowedMime, null, false);
}
