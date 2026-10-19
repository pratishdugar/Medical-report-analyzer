import Link from "next/link";
import { LanguageSwitcher } from "./forms";
import { Logo } from "./logo";

export function LegalLayout({ appName, title, updated, children }: { appName: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Logo name={appName} />
        <LanguageSwitcher />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{updated}</p>
        <div className="legal mt-6 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{children}</div>
        <p className="mt-10 text-sm"><Link href="/" className="text-primary hover:underline">← {appName}</Link></p>
      </main>
    </div>
  );
}
