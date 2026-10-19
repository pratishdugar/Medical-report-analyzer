# Security design

Health records are among the most sensitive personal data there is. The core
requirement — *no one can see anyone else's data* — is enforced in several
independent layers, so a single bug does not become a breach.

## Threat model (what we defend against)

| Threat | Main controls |
|---|---|
| A user requests another user's report/file by guessing or copying an ID (IDOR) | RLS on every health table, `withUser()` transactions, UUIDs, 404 for anything not owned, e2e test |
| An application bug forgets an ownership check | Forced RLS: queries without `app.user_id` return nothing; composite FKs prevent cross-account links |
| Database dump / backup leak | Files and sensitive free text encrypted with per-user keys; session tokens, reset tokens, share tokens, PINs and recovery codes stored only as hashes; passwords Argon2id |
| Stolen encrypted file copied onto another record or account | AES-GCM associated data binds ciphertext to `record + field`; per-user keys |
| Credential stuffing / brute force | Argon2id, per-IP and per-email rate limits, account lockout, optional TOTP 2FA, generic error messages, timing equalisation for unknown emails |
| Session theft | HttpOnly, SameSite=Lax, `__Host-`/Secure cookies, hashed server-side sessions, sliding + absolute expiry, revoke per device, revoke all on password change/reset |
| XSS | React escaping, per-request nonce CSP with `strict-dynamic`, no `dangerouslySetInnerHTML`, strict content-type + nosniff on file downloads |
| CSRF | Server Actions are origin-checked by Next.js; API routes require same-origin `Origin`; SameSite cookies |
| Clickjacking | `frame-ancestors 'none'`, `X-Frame-Options: DENY` |
| Malicious uploads | Magic-byte sniffing (PDF/JPEG/PNG/WEBP only), size limits, UUID-only storage paths, files never served from a public directory, original names stored encrypted and sanitised |
| Leaking data to AI providers | Opt-in consent, PII redaction, no images to untrusted providers, de-identified explanations, provider fallback (see README) |
| Share links forwarded / previewed by chat apps | 192-bit tokens stored hashed, expiry, revocation, optional PIN with lockout, generic page titles, `no-referrer`, `noindex`, view counter + audit log |
| Error pages or logs exposing health data | Generic error UI, no PHI in logs or audit metadata, no data caching (`no-store`, Cache Components disabled) |
| Health data baked into build artefacts | `outputFileTracingExcludes` for `data/`, `.dockerignore` |

## Layer 1 — Data Access Layer

`src/lib/dal.ts` is the only way pages and actions obtain the current user. The
user id always comes from the server-side session; ids in URLs or forms are
treated as untrusted lookups that RLS will scope.

## Layer 2 — PostgreSQL row-level security

`drizzle/0001_rls.sql` enables **and forces** RLS on `profiles`, `reports`,
`observations`, `history_entries`, `share_links` and `audit_events`:

```sql
CREATE POLICY reports_owner ON reports
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
```

`withUser(userId, fn)` (`src/lib/db/index.ts`) opens a transaction and sets
`app.user_id` with `set_config(..., true)` — transaction-local, so pooled
connections can never leak one user's context to the next request.

* Without the setting, `app_current_user_id()` is NULL and **no rows match**.
* `FORCE ROW LEVEL SECURITY` makes the policies apply to the table owner too.
* Superusers and `BYPASSRLS` roles skip RLS, so the app checks its role on first
  use and refuses to serve health data in production if the role could bypass it.
* Composite foreign keys `(profile_id, user_id) → profiles(id, user_id)` and
  `(report_id, user_id) → reports(id, user_id)` make it impossible to attach a
  row to another account's profile or report, even with a bug.
* Share links: a visitor's transaction sets only `app.share_token_hash`; a
  dedicated policy reveals exactly the one link with that hash. After the link
  is validated, the owner context is set and every query is additionally
  filtered by the link's profile id.

## Layer 3 — application-level encryption

`src/lib/crypto.ts`: AES-256-GCM with a 96-bit random IV per message. Each user
gets a key derived with HKDF-SHA256 from the master `ENCRYPTION_KEY` and their
user id. Associated data such as `file:<reportId>` or `reports.notes:<id>` binds
ciphertext to its record and field. A 4-byte key id in the header allows
rotation: set the new key as `ENCRYPTION_KEY` and the old one as
`ENCRYPTION_KEY_PREVIOUS`; old data stays readable and new writes use the new key.

Encrypted: original files, extracted OCR text, AI explanations, extraction
extras (medicines/diagnoses), notes, history details, original file names, ABHA
numbers, TOTP secrets. Structured lab values stay queryable for charts and are
protected by RLS plus disk/backup encryption of the managed database.

## Authentication

* Argon2id (m=19 MiB, t=2, p=1); password policy per NIST 800-63B (length + common-password list incl. Indian favourites, no composition rules).
* Sessions: 256-bit random token in the cookie, SHA-256 in the DB. 12-hour sliding sessions by default (shared family phones are common), 30 days with "keep me signed in", 90-day absolute cap.
* Lockout after 10 failures for 15 minutes; rate limits per IP and per email stored in Postgres (works across instances).
* TOTP (RFC 6238) 2FA with ten single-use recovery codes stored as hashes; MFA-pending sessions cannot reach any data.
* Password reset: 30-minute single-use hashed tokens; all sessions revoked after reset; identical response whether or not the email exists.

## HTTP hardening

`src/proxy.ts` sets a per-request nonce CSP; `next.config.ts` adds HSTS,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, COOP/CORP and a sandboxing CSP for JSON APIs.

## Privacy by design

* Consent is captured per purpose at sign-up (`consentVersion`, `consentAt`), AI processing is a separate opt-in and can be withdrawn.
* Users can export everything (`/api/export`) and delete their account (cascades to every table and removes files).
* The activity log shows sign-ins, failed attempts, file views, exports and doctor-link views.

## Operational responsibilities

* Run behind TLS; set `APP_URL=https://…` and `TRUSTED_PROXY_HOPS`.
* Keep `ENCRYPTION_KEY` in a secrets manager with an offline backup.
* Use a dedicated `NOSUPERUSER NOBYPASSRLS` database role (see `docker/initdb`).
* Encrypt and regularly test-restore backups; keep them in-region.
* Patch dependencies (`npm audit`, Dependabot) and the base image regularly.
* Monitor auth failures and rate-limit hits; have a breach-response plan (DPDP requires notifying the Data Protection Board and affected users).

## Verifying the controls

```bash
npm test          # tests/integration/rls.test.ts: cross-user reads/writes/inserts fail at the database
npm run test:e2e  # tests/e2e/isolation.spec.ts: pages, files, status and export APIs refuse other users
```

## Reporting a vulnerability

Please email the address configured as `GRIEVANCE_OFFICER_EMAIL` (or open a
private GitHub security advisory). Do not test against other users' data.
