import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--primary)" />
      <circle cx="28" cy="28" r="15" fill="none" stroke="var(--primary-fg)" strokeWidth="5" />
      <path d="M39 39l11 11" stroke="var(--primary-fg)" strokeWidth="6" strokeLinecap="round" />
      <path d="M18 29h5l3-6 4 11 3-5h4" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ name, href = "/" }: { name: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold text-lg tracking-tight">
      <LogoMark />
      <span>{name}</span>
    </Link>
  );
}
