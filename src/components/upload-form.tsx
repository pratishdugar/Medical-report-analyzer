"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { Alert, Button, Field, Input, Select } from "./ui";

const CATEGORIES = ["auto", "lab", "prescription", "discharge", "imaging", "other"];

export function UploadForm({ profiles, activeId, maxMb, aiOn }: {
  profiles: { id: string; name: string }[];
  activeId: string;
  maxMb: number;
  aiOn: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return setError(t("upload.errors.noFile"));
    if (file.size > maxMb * 1024 * 1024) return setError(t("upload.errors.tooLarge", { max: maxMb }));
    setBusy(true);
    try {
      const res = await fetch("/api/reports", { method: "POST", body: fd, credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (res.ok && body.id) {
        router.push(`/reports/${body.id}`);
        router.refresh();
        return;
      }
      if (res.status === 409 && body.id) {
        setError(t("upload.errors.duplicate"));
        setTimeout(() => router.push(`/reports/${body.id}`), 1500);
      } else if (res.status === 401) {
        router.push("/login");
      } else {
        setError(body.error && body.error.includes(".") ? t(body.error, { max: maxMb }) : t("common.genericError"));
      }
    } catch {
      setError(t("common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert tone="bad">{error}</Alert>}
      <Field label={t("upload.file")} htmlFor="file">
        <label htmlFor="file" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-2 px-4 py-8 text-center hover:border-primary">
          <Upload aria-hidden className="text-primary" />
          <span className="font-medium">{fileName ?? t("upload.choose")}</span>
          <span className="text-xs text-muted">PDF · JPG · PNG · WEBP · ≤ {maxMb} MB</span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? null)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("upload.profile")} htmlFor="profileId">
          <Select id="profileId" name="profileId" defaultValue={activeId}>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label={t("upload.category")} htmlFor="category">
          <Select id="category" name="category" defaultValue="auto">
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`reports.categories.${c}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("upload.date")} htmlFor="reportDate" hint={t("upload.dateHint")} optional={t("common.optional")}>
          <Input id="reportDate" name="reportDate" type="date" max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label={t("upload.reportTitle")} htmlFor="title" hint={t("upload.titleHint")} optional={t("common.optional")}>
          <Input id="title" name="title" maxLength={120} />
        </Field>
      </div>
      <Alert tone={aiOn ? "primary" : "neutral"}>{aiOn ? t("upload.aiOn") : t("upload.aiOff")}</Alert>
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? t("upload.uploading") : t("upload.submit")}</Button>
    </form>
  );
}
