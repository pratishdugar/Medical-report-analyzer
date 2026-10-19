import { headers } from "next/headers";

/**
 * Client IP from X-Forwarded-For. Only the entries appended by our own
 * reverse proxies are trustworthy, so we count TRUSTED_PROXY_HOPS from the
 * right instead of taking the (client-controlled) left-most value.
 */
export function clientIpFrom(h: Headers): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1));
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    const candidate = parts[Math.max(0, parts.length - hops)];
    if (candidate) return candidate.slice(0, 64);
  }
  return (h.get("x-real-ip") ?? "unknown").slice(0, 64);
}

export async function requestMeta(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  return { ip: clientIpFrom(h), userAgent: (h.get("user-agent") ?? "").slice(0, 300) };
}

/**
 * CSRF defence for route handlers (Server Actions already verify Origin).
 * State-changing API requests must come from our own origin.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
