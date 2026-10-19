import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { NavLinks, MobileTabs } from "@/components/app-nav";
import { LanguageSwitcher } from "@/components/forms";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/mobile-menu";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const [{ t }, { active, all }] = await Promise.all([getI18n(), getActiveProfile(user.id)]);
  const signOut = (
    <form action={logoutAction}>
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2">
        <LogOut size={18} aria-hidden /> {t("common.signOut")}
      </button>
    </form>
  );
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-4 md:flex no-print">
        <Logo name={t("app.name")} href="/dashboard" />
        <NavLinks />
        <div className="mt-auto space-y-3">
          <LanguageSwitcher />
          <p className="truncate px-3 text-xs text-muted" title={user.email}>{user.email}</p>
          {signOut}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur sm:px-6 no-print">
          <div className="flex items-center gap-1">
            <MobileMenu footer={<div className="space-y-3 border-t border-border pt-3"><LanguageSwitcher />{signOut}</div>} />
            <span className="md:hidden"><Logo name={t("app.name")} href="/dashboard" /></span>
          </div>
          <ProfileSwitcher profiles={all.map((p) => ({ id: p.id, name: p.name, relation: p.relation }))} activeId={active.id} />
        </header>
        <main className="mx-auto max-w-6xl px-3 pb-28 pt-5 sm:px-6 md:pb-12">{children}</main>
        <footer className="mx-auto max-w-6xl px-3 pb-24 text-xs text-muted sm:px-6 md:pb-6 no-print">
          {t("disclaimer.short")} {t("disclaimer.emergency")}
        </footer>
        <MobileTabs />
      </div>
    </div>
  );
}
