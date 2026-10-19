"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardList,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Printer,
  Settings,
  Share2,
  TrendingUp,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "./i18n-provider";
import { cn } from "./ui";

const ITEMS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/reports", key: "nav.reports", icon: FileText },
  { href: "/reports/upload", key: "nav.upload", icon: Upload },
  { href: "/trends", key: "nav.trends", icon: TrendingUp },
  { href: "/compare", key: "nav.compare", icon: GitCompareArrows },
  { href: "/vitals", key: "nav.vitals", icon: Activity },
  { href: "/history", key: "nav.history", icon: ClipboardList },
  { href: "/family", key: "nav.family", icon: Users },
  { href: "/share", key: "nav.share", icon: Share2 },
  { href: "/summary", key: "nav.summary", icon: Printer },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/reports") return pathname === "/reports" || (pathname.startsWith("/reports/") && !pathname.startsWith("/reports/upload"));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              active ? "bg-primary-soft text-primary" : "text-fg hover:bg-surface-2",
            )}
          >
            <Icon size={18} aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}

const TABS = ["/dashboard", "/reports", "/reports/upload", "/trends", "/vitals"];

/** Bottom tab bar for phones. */
export function MobileTabs() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden no-print" aria-label="Quick">
      <ul className="grid grid-cols-5">
        {ITEMS.filter((i) => TABS.includes(i.href)).map(({ href, key, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-primary" : "text-muted")}>
                <Icon size={20} aria-hidden />
                <span className="truncate max-w-full px-1">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
