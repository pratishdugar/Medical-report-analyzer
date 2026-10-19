"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { aad, encryptOptional } from "@/lib/crypto";
import { PROFILE_COOKIE, getOwnedProfile, requireUser } from "@/lib/dal";
import { isUuid, withUser } from "@/lib/db";
import { profiles, reports } from "@/lib/db/schema";
import { requestMeta } from "@/lib/request";
import { deleteEncryptedFile } from "@/lib/storage";
import { BLOOD_GROUPS, DIETS, optionalIsoDate, RELATIONS, SEXES, str, type ActionState } from "@/lib/validation";

async function setActiveProfile(id: string) {
  (await cookies()).set(PROFILE_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 31536000 });
}

export async function switchProfileAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "profileId");
  if (await getOwnedProfile(user.id, id)) await setActiveProfile(id);
  const back = str(fd, "back");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back.replace(/\/reports\/[^/]+$/, "/reports") : "/dashboard");
}

const empty = (v: string) => (v.trim() === "" ? null : v.trim());

export async function saveProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(100),
      relation: z.enum(RELATIONS),
      dateOfBirth: optionalIsoDate,
      sex: z.enum(SEXES).nullable(),
      bloodGroup: z.enum(BLOOD_GROUPS).nullable(),
      heightCm: z.number().min(40).max(250).nullable(),
      diet: z.enum(DIETS).nullable(),
      abha: z.string().nullable(),
    })
    .safeParse({
      id: str(fd, "id") || undefined,
      name: str(fd, "name"),
      relation: str(fd, "relation") || "other",
      dateOfBirth: str(fd, "dateOfBirth"),
      sex: empty(str(fd, "sex")),
      bloodGroup: empty(str(fd, "bloodGroup")),
      heightCm: empty(str(fd, "heightCm")) === null ? null : Number(str(fd, "heightCm")),
      diet: empty(str(fd, "diet")),
      abha: empty(str(fd, "abha")),
    });
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    if (fields.has("dateOfBirth")) return { fieldErrors: { dateOfBirth: "family.errors.dob" } };
    if (fields.has("name")) return { fieldErrors: { name: "auth.errors.nameRequired" } };
    return { error: "common.genericError" };
  }
  const d = parsed.data;
  if (d.dateOfBirth && (d.dateOfBirth > new Date().toISOString().slice(0, 10) || d.dateOfBirth < "1900-01-01")) {
    return { fieldErrors: { dateOfBirth: "family.errors.dob" } };
  }
  const abhaDigits = d.abha?.replace(/\D/g, "") ?? null;
  if (abhaDigits !== null && abhaDigits.length !== 14) return { fieldErrors: { abha: "family.errors.abha" } };

  const id = d.id && isUuid(d.id) ? d.id : crypto.randomUUID();
  const values = {
    name: d.name,
    relation: d.relation,
    dateOfBirth: d.dateOfBirth,
    sex: d.sex,
    bloodGroup: d.bloodGroup,
    heightCm: d.heightCm,
    diet: d.diet,
    // Only overwrite the stored ABHA when a new one is typed.
    ...(abhaDigits ? { abhaEnc: encryptOptional(user.id, abhaDigits, aad.profileAbha(id)) } : {}),
    updatedAt: new Date(),
  };
  const isNew = !(d.id && (await getOwnedProfile(user.id, d.id)));
  await withUser(user.id, async (tx) => {
    if (isNew) {
      await tx.insert(profiles).values({ id, userId: user.id, ...values, isPrimary: false });
    } else {
      await tx.update(profiles).set(values).where(eq(profiles.id, id));
    }
  });
  if (isNew) {
    await audit(user.id, "profile_created", await requestMeta());
    await setActiveProfile(id);
  }
  revalidatePath("/", "layout");
  if (str(fd, "first") === "1") redirect("/dashboard");
  return { ok: true, message: "common.save" };
}

export async function deleteProfileAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  const profile = await getOwnedProfile(user.id, id);
  if (!profile) redirect("/family");
  const files = await withUser(user.id, async (tx) => {
    const others = await tx.select({ id: profiles.id }).from(profiles).where(ne(profiles.id, id));
    if (!others.length) return null;
    const rows = await tx.select({ fileKey: reports.fileKey }).from(reports).where(and(eq(reports.profileId, id)));
    await tx.delete(profiles).where(eq(profiles.id, id));
    if (profile.isPrimary) await tx.update(profiles).set({ isPrimary: true }).where(eq(profiles.id, others[0].id));
    return rows;
  });
  if (files === null) redirect("/family?error=last");
  await Promise.all(files.filter((f) => f.fileKey).map((f) => deleteEncryptedFile(user.id, f.fileKey!)));
  await audit(user.id, "profile_deleted", await requestMeta());
  (await cookies()).delete(PROFILE_COOKIE);
  revalidatePath("/", "layout");
  redirect("/family");
}
