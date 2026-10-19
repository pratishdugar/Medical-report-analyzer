import { withUser, type Tx } from "./db";
import { auditEvents } from "./db/schema";

export type AuditAction =
  | "signup"
  | "login"
  | "login_failed"
  | "logout"
  | "logout_all"
  | "password_changed"
  | "password_reset"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_failed"
  | "report_uploaded"
  | "report_viewed_file"
  | "report_deleted"
  | "report_reprocessed"
  | "profile_created"
  | "profile_deleted"
  | "share_created"
  | "share_revoked"
  | "share_accessed"
  | "data_exported"
  | "consent_changed";

export type AuditMeta = { ip?: string; userAgent?: string; [k: string]: unknown };

/**
 * Record a security event (shown to the user under Settings → Activity).
 * Metadata must never contain health data or secrets.
 */
export async function logAudit(tx: Tx, userId: string, action: AuditAction, meta: AuditMeta = {}) {
  const { ip, userAgent, ...rest } = meta;
  await tx.insert(auditEvents).values({
    userId,
    action,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
    metadata: Object.keys(rest).length ? rest : null,
  });
}

/** Same as logAudit, in its own RLS-scoped transaction. */
export async function audit(userId: string, action: AuditAction, meta: AuditMeta = {}) {
  await withUser(userId, (tx) => logAudit(tx, userId, action, meta));
}
