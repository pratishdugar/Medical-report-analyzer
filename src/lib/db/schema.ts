import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Two classes of tables:
 *
 *  - Account/auth tables (users, sessions, password_reset_tokens, rate_limits)
 *    are used by the auth module before a user is known.
 *
 *  - Health-data tables (profiles, reports, observations, history_entries,
 *    share_links, audit_events) carry a user_id and are protected by FORCED
 *    Postgres row-level security (see drizzle/0001_rls.sql). Queries only see
 *    rows whose user_id matches the transaction-local `app.user_id` setting,
 *    which is set by `withUser()` in ./index.ts. Composite foreign keys
 *    (child.profile_id, child.user_id) -> profiles(id, user_id) make it
 *    impossible to attach one user's data to another user's profile.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    locale: text("locale").notNull().default("en"),
    totpSecretEnc: text("totp_secret_enc"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    recoveryCodes: jsonb("recovery_codes").$type<string[]>(),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: ts("locked_until"),
    /** consent to send (redacted) report text to third-party AI providers */
    aiConsent: boolean("ai_consent").notNull().default(false),
    consentVersion: text("consent_version").notNull(),
    consentAt: ts("consent_at").notNull(),
    passwordChangedAt: ts("password_changed_at").notNull().defaultNow(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only lives in the cookie */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mfaPending: boolean("mfa_pending").notNull().default(false),
    remember: boolean("remember").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: ts("window_start").notNull(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relation: text("relation").notNull().default("self"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    sex: text("sex"),
    bloodGroup: text("blood_group"),
    heightCm: real("height_cm"),
    diet: text("diet"),
    /** ABHA (Ayushman Bharat Health Account) number, encrypted */
    abhaEnc: text("abha_enc"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("profiles_id_user_uq").on(t.id, t.userId), index("profiles_user_idx").on(t.userId)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull().default("lab"),
    labName: text("lab_name"),
    reportDate: date("report_date", { mode: "string" }),
    status: text("status").notNull().default("processing"),
    fileKey: text("file_key"),
    fileNameEnc: text("file_name_enc"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    fileSha256: text("file_sha256"),
    extractionMethod: text("extraction_method"),
    ocrUsed: boolean("ocr_used").notNull().default(false),
    rawTextEnc: text("raw_text_enc"),
    /** JSON (encrypted): AI suggested history items, doc summary, warnings */
    extrasEnc: text("extras_enc"),
    aiSummaryEnc: text("ai_summary_enc"),
    aiSummaryLang: text("ai_summary_lang"),
    notesEnc: text("notes_enc"),
    error: text("error"),
    processedAt: ts("processed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("reports_id_user_uq").on(t.id, t.userId),
    foreignKey({
      name: "reports_profile_fk",
      columns: [t.profileId, t.userId],
      foreignColumns: [profiles.id, profiles.userId],
    }).onDelete("cascade"),
    index("reports_user_profile_idx").on(t.userId, t.profileId, t.reportDate),
    index("reports_sha_idx").on(t.userId, t.fileSha256),
  ],
);

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull(),
    reportId: uuid("report_id"),
    biomarkerCode: text("biomarker_code"),
    /** test name as printed on the report */
    name: text("name").notNull(),
    valueNum: doublePrecision("value_num"),
    valueText: text("value_text"),
    unit: text("unit"),
    refLow: doublePrecision("ref_low"),
    refHigh: doublePrecision("ref_high"),
    refText: text("ref_text"),
    flag: text("flag").notNull().default("unknown"),
    observedAt: date("observed_at", { mode: "string" }).notNull(),
    source: text("source").notNull().default("report"),
    /** true when the extracted value was found verbatim in the source text */
    verified: boolean("verified").notNull().default(false),
    userEdited: boolean("user_edited").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "observations_profile_fk",
      columns: [t.profileId, t.userId],
      foreignColumns: [profiles.id, profiles.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "observations_report_fk",
      columns: [t.reportId, t.userId],
      foreignColumns: [reports.id, reports.userId],
    }).onDelete("cascade"),
    index("observations_lookup_idx").on(t.userId, t.profileId, t.biomarkerCode, t.observedAt),
    index("observations_report_idx").on(t.reportId),
  ],
);

export const historyEntries = pgTable(
  "history_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    detailsEnc: text("details_enc"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "history_profile_fk",
      columns: [t.profileId, t.userId],
      foreignColumns: [profiles.id, profiles.userId],
    }).onDelete("cascade"),
    index("history_user_profile_idx").on(t.userId, t.profileId),
  ],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull(),
    /** SHA-256 of the URL token; the token itself is shown to the owner once */
    tokenHash: text("token_hash").notNull(),
    pinHash: text("pin_hash"),
    label: text("label"),
    includeFiles: boolean("include_files").notNull().default(false),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
    accessCount: integer("access_count").notNull().default(0),
    failedPinCount: integer("failed_pin_count").notNull().default(0),
    lastAccessedAt: ts("last_accessed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("share_links_token_idx").on(t.tokenHash),
    foreignKey({
      name: "share_links_profile_fk",
      columns: [t.profileId, t.userId],
      foreignColumns: [profiles.id, profiles.userId],
    }).onDelete("cascade"),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_user_created_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Observation = typeof observations.$inferSelect;
export type NewObservation = typeof observations.$inferInsert;
export type HistoryEntry = typeof historyEntries.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
