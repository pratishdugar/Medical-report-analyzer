import { eq } from "drizzle-orm";
import { getSession } from "@/lib/dal";
import { isUuid, withUser } from "@/lib/db";
import { reports } from "@/lib/db/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/status">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || session.session.mfaPending) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isUuid(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const [row] = await withUser(session.user.id, (tx) =>
    tx.select({ status: reports.status }).from(reports).where(eq(reports.id, id)).limit(1),
  );
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ status: row.status });
}
