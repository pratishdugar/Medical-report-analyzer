"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteObservationAction,
  generateSummaryAction,
  saveObservationAction,
  updateReportAction,
} from "@/actions/reports";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Button, Field, Input, Select, Textarea } from "./ui";

/** Polls extraction status and refreshes the page when it changes. */
export function ReportPoller({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  useEffect(() => {
    if (status !== "processing") return;
    let stop = false;
    let delay = 2000;
    const tick = async () => {
      if (stop) return;
      try {
        const res = await fetch(`/api/reports/${id}/status`, { cache: "no-store" });
        const body = (await res.json()) as { status?: string };
        if (body.status && body.status !== "processing") {
          router.refresh();
          return;
        }
      } catch {
        /* keep polling */
      }
      delay = Math.min(delay * 1.3, 8000);
      setTimeout(tick, delay);
    };
    const timer = setTimeout(tick, delay);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id, status, router]);
  return null;
}

type EditableObs = { id: string; name: string; code: string | null; value: string; unit: string | null; range: string };

export function ObservationEditor({ obs, reportId, catalog }: { obs?: EditableObs; reportId: string; catalog: { code: string; name: string }[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await saveObservationAction(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, {} as ActionState);
  if (!open) {
    return obs ? (
      <button type="button" onClick={() => setOpen(true)} className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label={`${t("common.edit")} ${obs.name}`}>
        <Pencil size={15} />
      </button>
    ) : (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}><Plus size={16} aria-hidden /> {t("reports.detail.addRow")}</Button>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={obs ? `${t("common.edit")} ${obs.name}` : t("reports.detail.addRow")}>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label={t("common.close")} onClick={() => setOpen(false)} />
      <form action={action} className="relative grid w-full max-w-2xl gap-3 rounded-t-2xl bg-surface p-4 shadow-xl sm:grid-cols-2 sm:rounded-2xl sm:p-6">
        <input type="hidden" name="id" value={obs?.id ?? ""} />
        <input type="hidden" name="reportId" value={reportId} />
        <p className="text-lg font-semibold sm:col-span-2">{obs ? `${t("common.edit")}: ${obs.name}` : t("reports.detail.addRow")}</p>
        <div className="sm:col-span-2"><FormMessage state={state} /></div>
        <div className="sm:col-span-2">
          <Field label={t("common.test")} htmlFor={`code-${obs?.id ?? "new"}`}>
            <Select id={`code-${obs?.id ?? "new"}`} name="code" defaultValue={obs?.code ?? ""}>
              <option value="">— {obs?.name ?? t("common.name")} —</option>
              {catalog.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </Field>
          {!obs?.code && <Input name="name" defaultValue={obs?.name ?? ""} placeholder={t("common.name")} className="mt-2" maxLength={160} aria-label={t("common.name")} />}
        </div>
        <Field label={t("common.value")} htmlFor={`value-${obs?.id ?? "new"}`}>
          <Input id={`value-${obs?.id ?? "new"}`} name="value" defaultValue={obs?.value ?? ""} required maxLength={80} autoFocus />
        </Field>
        <Field label={t("common.unit")} htmlFor={`unit-${obs?.id ?? "new"}`}>
          <Input id={`unit-${obs?.id ?? "new"}`} name="unit" defaultValue={obs?.unit ?? ""} maxLength={40} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("common.range")} htmlFor={`range-${obs?.id ?? "new"}`}>
            <Input id={`range-${obs?.id ?? "new"}`} name="range" defaultValue={obs?.range ?? ""} placeholder="13 - 17" maxLength={60} />
          </Field>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <SubmitButton>{t("common.save")}</SubmitButton>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </div>
  );
}

export function DeleteObservation({ id, back, label }: { id: string; back: string; label: string }) {
  const { t } = useI18n();
  return (
    <form action={deleteObservationAction} onSubmit={(e) => { if (!window.confirm(`${t("common.delete")}: ${label}?`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-bad" aria-label={`${t("common.delete")} ${label}`}><Trash2 size={15} /></button>
    </form>
  );
}

export function ReportDetailsForm({ report }: { report: { id: string; title: string; labName: string | null; reportDate: string | null; category: string; notes: string | null } }) {
  const { t } = useI18n();
  const [state, action] = useActionState(updateReportAction, {} as ActionState);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={report.id} />
      <Field label={t("reports.detail.reportTitle")} htmlFor="title"><Input id="title" name="title" defaultValue={report.title} maxLength={120} /></Field>
      <Field label={t("reports.detail.labName")} htmlFor="labName"><Input id="labName" name="labName" defaultValue={report.labName ?? ""} maxLength={120} /></Field>
      <Field label={t("reports.detail.reportDate")} htmlFor="reportDate"><Input id="reportDate" name="reportDate" type="date" defaultValue={report.reportDate ?? ""} max={new Date().toISOString().slice(0, 10)} /></Field>
      <Field label={t("reports.detail.category")} htmlFor="category">
        <Select id="category" name="category" defaultValue={report.category}>
          {["lab", "prescription", "discharge", "imaging", "other", "auto"].map((c) => <option key={c} value={c}>{t(`reports.categories.${c}`)}</option>)}
        </Select>
      </Field>
      <Field label={t("reports.detail.notes")} htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={report.notes ?? ""} maxLength={5000} /></Field>
      <SubmitButton variant="secondary">{t("common.save")}</SubmitButton>
    </form>
  );
}

export function SummaryButton({ id, hasSummary }: { id: string; hasSummary: boolean }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(generateSummaryAction, {} as ActionState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      {state.error && <FormMessage state={state} />}
      <SubmitButton variant={hasSummary ? "secondary" : "primary"} pendingLabel={t("common.loading")}>
        {hasSummary ? t("reports.detail.aiRegenerate") : t("reports.detail.aiGenerate")}
      </SubmitButton>
    </form>
  );
}
