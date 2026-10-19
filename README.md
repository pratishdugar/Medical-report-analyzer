# SehatLens — medical report analyzer for Indian families

Upload lab reports (PDFs or phone photos) for yourself and your family. SehatLens
extracts the values, charts them over time, compares reports side by side and
gives plain-language, India-specific suggestions in **English or हिंदी** — while
making sure **no account can ever see another account's data**.

> Information only — not a medical device and not a substitute for a doctor.

## What it does

| | |
|---|---|
| **Accounts** | Sign up / sign in, optional TOTP two-factor auth with recovery codes, password reset, device/session management, activity log |
| **Family profiles** | Separate profiles for parents, spouse, children (age & sex pick the right reference ranges), optional ABHA number (encrypted) |
| **Upload** | PDF, JPG, PNG, WEBP up to 15 MB; content-sniffed, de-duplicated, encrypted at rest |
| **Extraction** | PDF text layer → local OCR for scans → free LLM (redacted text only) → offline rule-based parser as fallback/back-fill. Every value is checked against the source text; anything unverifiable is flagged "Please verify" and kept out of charts until confirmed |
| **80+ biomarkers** | Indian lab naming ("SGPT", "PPBS", "TLC", "S. Creatinine"), units ("2.5 lakhs/cumm", "cells/cumm", mmol/L→mg/dL), day-first dates |
| **Graphs** | Per-marker trend charts with normal-range band, sparklines, range meters, dashboard tiles |
| **Comparative views** | Report-vs-report comparison table + dumbbell chart (improved / worsened / unchanged relative to the normal range) |
| **Suggestions** | Result-specific guidance (Indian diet: millets, dal, ragi, amla…; vegetarian B12; dengue-season platelets), trend messages, metabolic-syndrome pattern, derived eGFR (CKD-EPI 2021) and BMI (Asian-Indian cut-offs), retest reminders, age-based screening nudges. Critical values point to 112/108 |
| **Medical history** | Conditions, medicines, allergies, surgeries, vaccinations, family history; medicines/diagnoses found in prescriptions can be added with one click |
| **Home readings** | Log BP, glucometer sugar, pulse, SpO₂, weight, waist, temperature (°F or °C) |
| **Share with doctor** | Expiring, revocable read-only link with optional 6-digit PIN; WhatsApp share button; optional access to original files |
| **Doctor summary** | Printable one-page summary (conditions, medicines, allergies, out-of-range values, trends) |
| **Your data, your rights** | One-click ZIP export (JSON + CSV + original files) and permanent account deletion (DPDP Act 2023) |

## Architecture

```
Browser ──HTTPS──▶ Next.js 16 (App Router, server components + server actions)
                      │  proxy.ts: per-request nonce CSP, optimistic auth redirect
                      │  Data Access Layer (src/lib/dal.ts): session → user id
                      ▼
                 withUser(userId, tx => …)   ← sets app.user_id for the transaction
                      ▼
                 PostgreSQL with FORCED row-level security on every health table
                      │
   Encrypted file store (AES-256-GCM, per-user HKDF keys, record-bound AAD)
                      │
   Extraction worker (after()): unpdf text → Tesseract OCR → PII redaction →
   Groq / Gemini / OpenRouter / Ollama / custom (OpenAI-compatible) → rules parser
```

Key directories:

```
src/app/(auth)        sign-up, sign-in, 2FA, password reset (+ server actions)
src/app/(app)         dashboard, reports, trends, compare, history, vitals, family, share, summary, settings
src/app/s/[token]     public, PIN-protected doctor view
src/app/api           upload, file download, status, export, health
src/lib/db            Drizzle schema + withUser()/withShareToken() RLS helpers
src/lib/extraction    PDF/OCR, redaction, LLM providers, prompt, rules parser, pipeline
src/lib/medical       biomarker catalog, units, normalisation, insights, advice, comparison
drizzle/              SQL migrations (0001_rls.sql = row-level security policies)
tests/                unit, Postgres RLS integration, Playwright e2e isolation tests
```

## Quick start (local)

Requirements: Node 22+, PostgreSQL 14+, optionally `tesseract-ocr` + `poppler-utils` for scanned reports.

```bash
npm install

# 1. A dedicated, NON-superuser database role (RLS does not apply to superusers)
psql -U postgres -c "CREATE ROLE sehat LOGIN PASSWORD 'sehat' NOSUPERUSER NOBYPASSRLS;"
psql -U postgres -c "CREATE DATABASE sehat OWNER sehat;"

# 2. Configuration
cp .env.example .env.local
# set ENCRYPTION_KEY=$(openssl rand -base64 32) and DATABASE_URL

# 3. Schema + RLS policies, then run
npm run db:migrate
npm run dev           # http://localhost:3000
```

Try it with the fictional sample reports in `samples/` (two lab reports six
months apart plus a phone-photo style scan): upload both PDFs, then open
**Trends** and **Compare**.

## Free LLMs for extraction

Extraction works fully offline with the built-in parser. Adding a free LLM
improves accuracy on unusual layouts, prescriptions and discharge summaries.
Providers are tried in `LLM_PROVIDERS` order and fall back automatically.

| Provider | Free option | Privacy notes |
|---|---|---|
| **Groq** (`GROQ_API_KEY`) | Free tier with per-minute/day limits; Llama 3.3 70B, GPT-OSS | Cloud — receives redacted text only |
| **Google Gemini** (`GEMINI_API_KEY`) | AI Studio free tier (Flash / Flash-Lite) | Free-tier prompts may be used by Google to improve products — redacted text only, opt-in |
| **OpenRouter** (`OPENROUTER_API_KEY`) | `:free` community models | Logging depends on the upstream model provider — redacted text only |
| **Ollama** (`OLLAMA_BASE_URL`) | Self-hosted open models (e.g. `qwen2.5:7b`, vision: `qwen2.5vl:7b`) | Data never leaves your server; marked *trusted* (may receive images) |
| **Custom** (`CUSTOM_LLM_*`) | Any OpenAI-compatible endpoint, e.g. an India-hosted model | Untrusted unless listed in `LLM_TRUSTED_PROVIDERS` |

Safeguards, regardless of provider:

- **Consent**: third-party (untrusted) providers are used only if the user opted in at sign-up or in Settings.
- **Redaction**: names, phone numbers, emails, UHID/lab IDs, Aadhaar/ABHA numbers, addresses and doctor names are removed before text leaves the server (`src/lib/extraction/redact.ts`).
- **No images to third parties**: scans/photos are OCR'd locally with Tesseract; only trusted (self-hosted) providers may receive images.
- **Anti-hallucination**: every extracted value must appear in the source text, OCR decimal slips (31.5 → 315) and implausible printed ranges are detected, and unverified values are excluded from charts and suggestions until the user confirms them.
- **Schema validation**: model output is parsed with zod; malformed output falls back to the next provider and finally the offline parser.
- The plain-language report explanation sends only de-identified structured values (age, sex, results) — never names or raw text.

Model names change frequently; check each provider's current model list and free-tier limits and set `*_MODEL` accordingly.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for the full design. In short:

- **Isolation in depth**: every query on health data runs inside `withUser()`, and Postgres **forced row-level security** filters rows by `app.user_id` — a forgotten ownership check can only ever return the signed-in user's own rows, and queries outside `withUser()` return nothing. Composite foreign keys stop rows being attached to another account's profile or report. In production the app refuses to serve health data if its DB role could bypass RLS.
- **Encryption**: original files and sensitive free text (OCR text, notes, file names, ABHA, TOTP secrets) are AES-256-GCM encrypted with per-user HKDF-derived keys and record-bound associated data. Key rotation via `ENCRYPTION_KEY_PREVIOUS`.
- **Auth**: Argon2id (OWASP parameters), 256-bit session tokens stored only as SHA-256 hashes, HttpOnly `__Host-` SameSite cookies, short sessions unless "keep me signed in" (shared family devices), account lockout, DB-backed rate limits, TOTP 2FA, sessions revoked on password change.
- **Web**: per-request nonce CSP with `strict-dynamic`, `frame-ancestors 'none'`, HSTS, nosniff, strict Referrer-Policy (no-referrer on share links), same-origin checks on API routes (server actions are origin-checked by Next.js), content-sniffed uploads.
- **Tests that prove it**: `tests/integration/rls.test.ts` (real Postgres, non-superuser role) and `tests/e2e/isolation.spec.ts` (two real accounts trying to reach each other's pages, files, status API and export).

## Built for India

See [docs/INDIA.md](docs/INDIA.md): DPDP Act 2023 / DPDP Rules 2025 mapping, data
residency guidance, Indian lab formats and units, Asian-Indian cut-offs, Hindi,
family-centric design, ABHA/ABDM readiness, WhatsApp-friendly sharing, low-end
phone and slow-network considerations, and regulatory notes.

## Testing

```bash
npm run lint && npm run typecheck
npm test                 # unit + Postgres RLS integration (uses DATABASE_URL or postgres://sehat:sehat@localhost:5432/sehat_test)
npm run build
npm run test:e2e         # Playwright; set E2E_BASE_URL to test a running server
```

The test database must be owned by a non-superuser role (the integration suite
asserts this). CI (`.github/workflows/ci.yml`) runs all of the above against
Postgres 16 with Tesseract installed.

## Deploying

**Docker Compose (single VM)** — includes Postgres with a dedicated RLS-enforced
role, a migration step, the app (with Tesseract + poppler) and an optional
self-hosted Ollama:

```bash
cp .env.example .env    # ENCRYPTION_KEY, APP_URL=https://…, POSTGRES_PASSWORD, APP_DB_PASSWORD, SMTP_URL, LLM keys
docker compose up -d --build
docker compose --profile ollama up -d && docker compose exec ollama ollama pull qwen2.5:7b
```

Put a TLS-terminating reverse proxy (Caddy, nginx, a cloud load balancer) in
front and set `TRUSTED_PROXY_HOPS` to the number of proxies. For Indian data
residency, run the VM, database, backups and object storage in an Indian region
(AWS `ap-south-1`/`ap-south-2`, GCP `asia-south1`/`asia-south2`, Azure Central India).

Operational checklist before going live:

1. `APP_URL` is `https://…` (enables Secure/`__Host-` cookies and `upgrade-insecure-requests`).
2. `ENCRYPTION_KEY` is generated once, stored in a secrets manager and **backed up** — losing it makes stored reports unreadable.
3. `DATABASE_URL` uses a `NOSUPERUSER NOBYPASSRLS` role (otherwise health-data requests are refused in production).
4. `STORAGE_DIR` is on persistent, backed-up storage; DB backups are encrypted and kept in-region.
5. `SMTP_URL` is configured for password-reset mail; `GRIEVANCE_OFFICER_*` is set (shown on the privacy notice).
6. Review the privacy notice and terms (`src/app/privacy`, `src/app/terms`) with legal counsel.
