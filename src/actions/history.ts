"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aad, encryptOptional } from "@/lib/crypto";
import { getOwnedProfile, requireUser } from "@/lib/dal";
import { isUuid, withUser } from "@/lib/db";
import { historyEntries } from "@/lib/db/schema";
import { checkbox, HISTORY_TYPES, optionalIsoDate, str, type ActionState } from "@/lib/validation";

export async function saveHistoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const parsed = z
    .object({
      profileId: z.string(),
      type: z.enum(HISTORY_TYPES),
      title: z.string().trim().min(1).max(200),
      details: z.string().trim().max(2000),
      startDate: optionalIsoDate,
      endDate: optionalIsoDate,
      active: checkbox,
    })
    .safeParse({
      profileId: str(fd, "profileId"),
      type: str(fd, "type"),
      title: str(fd, "title"),
      details: str(fd, "details"),
      startDate: str(fd, "startDate"),
      endDate: str(fd, "endDate"),
      active: fd.get("active"),
    });
  if (!parsed.success) return { error: "common.genericError" };
  const d = parsed.data;
  if (!(await getOwnedProfile(user.id, d.profileId))) return { error: "common.notFound" };
  const id = crypto.randomUUID();
  await withUser(user.id, (tx) =>
    tx.insert(historyEntries).values({
      id,
      userId: user.id,
      profileId: d.profileId,
      type: d.type,
      title: d.title,
      detailsEnc: encryptOptional(user.id, d.details || null, aad.historyDetails(id)),
      startDate: d.startDate,
      endDate: d.endDate,
      active: d.active && !d.endDate,
    }),
  );
  revalidatePath("/", "layout");
  return { ok: true, message: "common.save" };
}

export async function toggleHistoryAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  if (!isUuid(id)) return;
  await withUser(user.id, async (tx) => {
    const [row] = await tx.select({ active: historyEntries.active }).from(historyEntries).where(eq(historyEntries.id, id)).limit(1);
    if (row) await tx.update(historyEntries).set({ active: !row.active, updatedAt: new Date() }).where(eq(historyEntries.id, id));
  });
  revalidatePath("/", "layout");
}

export async function deleteHistoryAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  if (isUuid(id)) await withUser(user.id, (tx) => tx.delete(historyEntries).where(eq(historyEntries.id, id)));
  revalidatePath("/", "layout");
}
