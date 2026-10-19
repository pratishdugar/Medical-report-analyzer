"use client";

import { usePathname } from "next/navigation";
import { switchProfileAction } from "@/actions/profile";
import { useI18n } from "./i18n-provider";

export function ProfileSwitcher({ profiles, activeId }: { profiles: { id: string; name: string; relation: string }[]; activeId: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <form action={switchProfileAction} className="flex items-center gap-2">
      <input type="hidden" name="back" value={pathname} />
      <label htmlFor="profile-switch" className="text-xs text-muted whitespace-nowrap">{t("nav.viewing")}</label>
      <select
        id="profile-switch"
        name="profileId"
        defaultValue={activeId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-[11rem] rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({t(`family.relations.${p.relation}`)})
          </option>
        ))}
      </select>
      <noscript><button className="text-sm underline">OK</button></noscript>
    </form>
  );
}
