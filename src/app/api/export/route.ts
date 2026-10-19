import { asc } from "drizzle-orm";
import { strToU8, zipSync, type Zippable } from "fflate";
import { audit } from "@/lib/audit";
import { hit } from "@/lib/auth/rate-limit";
import { aad, decryptOptional } from "@/lib/crypto";
import { getSession } from "@/lib/dal";
import { withUser } from "@/lib/db";
import { auditEvents, historyEntries, observations, profiles, reports, shareLinks } from "@/lib/db/schema";
import { extensionFor, type AllowedMime } from "@/lib/files";
import { clientIpFrom } from "@/lib/request";
import { readEncryptedFile } from "@/lib/storage";

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** DPDP Act right of access / portability: everything we hold about the account, as a ZIP. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.session.mfaPending) return new Response("Unauthorized", { status: 401 });
  const { user } = session;
  if (!(await hit("exportPerUser", user.id)).ok) return new Response("Too many requests", { status: 429 });

  const data = await withUser(user.id, async (tx) => ({
    profiles: await tx.select().from(profiles).orderBy(asc(profiles.createdAt)),
    reports: await tx.select().from(reports).orderBy(asc(reports.createdAt)),
    observations: await tx.select().from(observations).orderBy(asc(observations.observedAt)),
    history: await tx.select().from(historyEntries).orderBy(asc(historyEntries.createdAt)),
    shareLinks: await tx.select().from(shareLinks),
    audit: await tx.select().from(auditEvents).orderBy(asc(auditEvents.createdAt)),
  }));

  const profileName = new Map(data.profiles.map((p) => [p.id, p.name]));
  const json = {
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email, locale: user.locale, createdAt: user.createdAt, aiConsent: user.aiConsent },
    profiles: data.profiles.map(({ abhaEnc, ...p }) => ({ ...p, abhaNumber: decryptOptional(user.id, abhaEnc, aad.profileAbha(p.id)) })),
    reports: data.reports.map(({ rawTextEnc, extrasEnc, aiSummaryEnc, notesEnc, fileNameEnc, fileKey, ...r }) => ({
      ...r,
      fileName: decryptOptional(user.id, fileNameEnc, aad.reportField(r.id, "file_name")),
      notes: decryptOptional(user.id, notesEnc, aad.reportField(r.id, "notes")),
      aiSummary: decryptOptional(user.id, aiSummaryEnc, aad.reportField(r.id, "ai_summary")),
      extracted: JSON.parse(decryptOptional(user.id, extrasEnc, aad.reportField(r.id, "extras")) ?? "null"),
      extractedText: decryptOptional(user.id, rawTextEnc, aad.reportField(r.id, "raw_text")),
      hasFile: !!fileKey,
    })),
    observations: data.observations,
    history: data.history.map(({ detailsEnc, ...h }) => ({ ...h, details: decryptOptional(user.id, detailsEnc, aad.historyDetails(h.id)) })),
    shareLinks: data.shareLinks.map((l) => ({ id: l.id, profileId: l.profileId, label: l.label, createdAt: l.createdAt, expiresAt: l.expiresAt, revokedAt: l.revokedAt, accessCount: l.accessCount, hasPin: !!l.pinHash, includeFiles: l.includeFiles })),
    activity: data.audit,
  };

  const header = ["profile", "date", "test", "code", "value", "unit", "ref_low", "ref_high", "flag", "source", "report_id"];
  const csv = [header.join(","), ...data.observations.map((o) =>
    [profileName.get(o.profileId), o.observedAt, o.name, o.biomarkerCode, o.valueNum ?? o.valueText, o.unit, o.refLow, o.refHigh, o.flag, o.source, o.reportId].map(csvCell).join(","),
  )].join("\r\n");

  const files: Zippable = {};
  for (const r of data.reports) {
    if (!r.fileKey || !r.mimeType) continue;
    try {
      const buf = await readEncryptedFile(user.id, r.fileKey);
      const folder = (profileName.get(r.profileId) ?? "profile").replace(/[^\p{L}\p{N} _-]/gu, "_");
      files[`files/${folder}/${r.reportDate ?? r.createdAt.toISOString().slice(0, 10)}_${r.id.slice(0, 8)}.${extensionFor[r.mimeType as AllowedMime] ?? "bin"}`] = new Uint8Array(buf);
    } catch {
      /* skip unreadable file */
    }
  }
  const zip = zipSync({
    "data.json": strToU8(JSON.stringify(json, null, 2)),
    "observations.csv": strToU8(`﻿${csv}`),
    "README.txt": strToU8("SehatLens data export.\n- data.json: everything stored for your account\n- observations.csv: all test results (opens in Excel/Sheets)\n- files/: your original uploaded reports\n"),
    ...files,
  });
  await audit(user.id, "data_exported", { ip: clientIpFrom(request.headers) });
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="sehatlens-export-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
