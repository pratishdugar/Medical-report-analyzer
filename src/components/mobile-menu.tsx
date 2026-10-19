"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLinks } from "./app-nav";
import { useI18n } from "./i18n-provider";

export function MobileMenu({ footer }: { footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-surface-2" aria-label={t("nav.menu")} aria-expanded={open}>
        <Menu size={22} />
      </button>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label={t("common.close")} onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col gap-4 overflow-y-auto bg-surface p-4 shadow-xl">
            <button type="button" onClick={() => setOpen(false)} className="self-end rounded-lg p-2 hover:bg-surface-2" aria-label={t("common.close")}>
              <X size={20} />
            </button>
            <NavLinks onNavigate={() => setOpen(false)} />
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
