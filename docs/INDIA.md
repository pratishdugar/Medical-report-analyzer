# Making SehatLens suitable for India

This document records what an Indian personal-health-records product needs and
how SehatLens addresses each point. Items marked **Roadmap** are not built yet.

## 1. Law and regulation

### Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025

The DPDP Rules were notified in November 2025 with a staggered roll-out (most
Data Fiduciary obligations apply about 18 months after notification). Health
data is personal data under the Act, so SehatLens is built to comply from day one.

| Requirement | How SehatLens handles it |
|---|---|
| Clear, itemised **notice** (English or any of the 22 scheduled languages) | Privacy notice in English and Hindi (`/privacy`), shown and linked at sign-up |
| Free, specific, informed, unambiguous **consent** | Separate checkboxes for terms, age 18+, health-data processing; AI processing is a further optional consent. Consent version and time are stored |
| **Withdrawal** as easy as giving consent | AI consent toggle in Settings; account deletion withdraws everything |
| **Purpose limitation & minimisation** | Data used only to provide the service; no ads, no selling; names/IDs redacted before any third-party AI call |
| **Reasonable security safeguards** | Row-level security, per-user encryption, access logs, 2FA (see SECURITY.md) |
| **Breach notification** to the Data Protection Board and affected users | Activity/audit log supports investigation; operator runbook required (see SECURITY.md) |
| Right to **access** / information | Settings → Download my data (JSON + CSV + original files) |
| Right to **correction & erasure** | Every value and profile is editable; per-item delete; full account deletion |
| **Grievance redressal** | Grievance Officer name/email configurable and shown on the privacy notice |
| Right to **nominate** | Via the Grievance Officer (privacy notice). **Roadmap:** in-app nominee |
| **Children's data** (under 18) needs verifiable parental consent; no tracking or targeted ads | Account holders confirm they are 18+; children are profiles managed by the parent/guardian; no tracking, analytics or ads |
| **Retention** limited to purpose | Data kept while the account exists; deletion cascades immediately |
| **Consent Managers** | **Roadmap** when the registry is operational |

### Data residency

The Act allows transfers abroad except to countries the government restricts,
but hospitals, insurers and users commonly expect health data to stay in India.
Deploy the app, database, backups and file storage in an Indian cloud region
(AWS Mumbai/Hyderabad, GCP Mumbai/Delhi, Azure Central India). Cloud LLM
providers are typically outside India — hence opt-in consent and redaction —
and a fully in-country option exists: self-hosted Ollama or any India-hosted
OpenAI-compatible model via the `custom` provider.

### Medical regulation

* SehatLens is a personal health record and information tool. It does not diagnose or prescribe; suggestions are general wellness information and every screen carries a disclaimer with the 112/108 emergency numbers.
* Software intended for diagnosis or treatment can fall under the **Medical Devices Rules, 2017** (CDSCO) as software as a medical device. Get regulatory advice before adding diagnostic or treatment claims.
* The **Telemedicine Practice Guidelines (2020)** govern consultations; SehatLens only lets patients share records with their own doctor.

### Ayushman Bharat Digital Mission (ABDM)

* Profiles can store the 14-digit **ABHA number** (encrypted).
* **Roadmap:** register in the ABDM sandbox as a PHR / Health Information User so users can pull lab and hospital records through ABDM consent artefacts instead of uploading PDFs, and link ABHA addresses.

### SMS OTP

Sending OTPs by SMS in India requires DLT (TRAI) registration of the sender and
templates. The first version therefore uses email + password + optional TOTP
2FA. **Roadmap:** phone-number OTP via a DLT-registered provider.

## 2. Medical content tuned for India

* **Report formats**: test names as Indian labs print them — "SGPT/SGOT", "FBS/PPBS", "TLC", "S. Creatinine", "Glycosylated Haemoglobin", "25-OH Vitamin D (Total)", "TSH (Ultrasensitive)", "Lipid profile" ratios — for Thyrocare, Dr Lal PathLabs, SRL/Agilus, Metropolis, Apollo, Redcliffe and local labs.
* **Units**: "Lakhs/cumm" platelets, "cells/cumm" counts, "mill/cumm" RBC, Indian digit grouping (1,50,000), mmol/L and SI units converted to the mg/dL convention used in India; day-first dates (DD/MM/YYYY, 12-Jan-2026).
* **Reference ranges & bands**: the lab's own range always wins; defaults follow ICMR/ADA glucose criteria, Lipid Association of India LDL guidance, Indian hypertension guideline grades, **Asian-Indian BMI cut-offs** (normal < 23, overweight 23–24.9, obese ≥ 25) and waist cut-offs (90 cm men / 80 cm women).
* **Common Indian health issues** in suggestions: vitamin D deficiency despite sunshine, B12 deficiency in vegetarians (and metformin users), anaemia (NFHS-5: more than half of women aged 15–49), thalassaemia trait for small red cells, dengue-season low platelets, worm-related eosinophilia, hepatitis A/E from water, early heart disease and metabolic syndrome in South Asians, high Lp(a).
* **Diet advice with familiar foods**: millets (jowar, bajra, ragi), dal, chana, rajma, paneer, curd, amla, green leafy vegetables, mustard/groundnut oil; warnings about maida, vanaspati, pickles/papad/namkeen; vegetarian and Jain diet options in profiles.
* **Screening nudges** aligned with India's national NCD programme (diabetes and BP checks from age 30), lipid profiles from the 20s–30s, Hb checks for women of reproductive age.
* **Home monitoring**: logging for BP machines, glucometers (fasting / post-meal / random), pulse oximeters and weighing scales, temperature in °F (°C accepted).

## 3. People and devices

* **Family first**: one account manages parents, spouse and children — common in Indian households where one member handles everyone's reports. A mismatch warning appears if a report's printed sex doesn't match the selected profile.
* **Language**: complete Hindi UI, Hindi suggestions and Hindi AI explanations. Adding Marathi, Bengali, Tamil, Telugu, Kannada, Gujarati etc. is a dictionary file (`src/lib/i18n/`). **Roadmap:** more languages.
* **Low-end phones and slow networks**: mobile-first layout with bottom tabs and 44 px tap targets, no web-font downloads (system fonts render Devanagari natively), server-rendered pages with small client bundles, installable as a PWA, camera upload from the phone.
* **Shared devices**: sessions expire after 12 hours unless "keep me signed in" is ticked; sign out other devices from Settings.
* **WhatsApp-friendly sharing**: one tap shares an expiring doctor link; an optional PIN keeps chat-app link previews and forwarded messages from opening the summary.
* **Paper-friendly**: a printable one-page doctor summary for clinics that work on paper files.
* **Cost**: free LLM tiers or a self-hosted model, a fully offline parser, and a single small VM are enough to run it.

## 4. Roadmap summary

1. ABDM PHR integration (pull records with consent, ABHA address linking).
2. Phone OTP login via a DLT-registered SMS provider.
3. More Indian languages; voice read-out of explanations.
4. Medicine reminders and refill tracking.
5. S3-compatible object storage adapter (in-region), for multi-instance deployments.
6. In-app nominee management under the DPDP Act.
