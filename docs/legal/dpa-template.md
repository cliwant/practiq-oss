# Data Processing Agreement (DPA) — template

> **Status**: draft template, **needs legal review** before being executed against any customer. Practiq operates under Cliwant, Inc.'s standard terms — this DPA is offered to B2B customers (CPAs, accounting firms, agencies) who require contractually-bound data-processing terms beyond what the published Privacy Policy provides.
>
> Maintainer note: every blank `[CUSTOMER ...]` field is filled per execution. The "Schedule 1 — Sub-processors" section is the source of truth and gets updated when a sub-processor changes (we email Customer 30 days in advance, per §6).

---

## Parties

This Data Processing Agreement ("**DPA**") is entered into between:

- **Cliwant, Inc.**, a Delaware corporation with its principal place of business at [REGISTERED ADDRESS] ("**Practiq**" or "**Processor**"); and
- **[CUSTOMER LEGAL ENTITY]**, with its principal place of business at [CUSTOMER ADDRESS] ("**Customer**" or "**Controller**").

Effective as of the date last signed below ("**Effective Date**"), and forming part of the Practiq Master Subscription Agreement (or, if none, the published Terms at practiq.dev/terms).

## 1. Definitions

Capitalized terms not defined here have the meaning given in the GDPR / UK GDPR / CCPA, whichever applies to Customer. "**Personal Data**" means any data Customer submits to the Service that identifies a natural person.

## 2. Subject matter and duration

Practiq processes Personal Data on behalf of Customer for the sole purpose of providing the Service (workspace, AI assistant, agent runs, billing). Processing lasts for the duration of the subscription plus the retention windows in Schedule 2.

## 3. Nature and purpose of processing

| Processing activity | Purpose |
|---------------------|---------|
| Storage of Customer accounts, workspaces, knowledge base, chat history, agent task results | Operate the Service for Customer |
| Transmission of prompts to LLM sub-processors (OpenRouter / Anthropic / OpenAI) | Generate AI responses |
| Embedding generation for retrieval | Operate semantic search |
| Sending transactional email (welcome, invoice, password reset) | Maintain the user account |
| Billing event logging | Process payments + audit |

Practiq does not use Personal Data for any other purpose, including model training, advertising, or sale.

## 4. Customer instructions

Customer's submission of Personal Data to the Service constitutes its instruction to process such data per this DPA. Customer may issue further written instructions through `privacy@practiq.dev`. Practiq will notify Customer if a Customer instruction infringes applicable data-protection law and may suspend processing of the offending instruction.

## 5. Personnel

Practiq personnel access Personal Data only on a need-to-know basis, are bound by written confidentiality obligations, and receive ongoing data-protection training.

## 6. Sub-processors

Customer authorizes Practiq to engage the sub-processors listed in **Schedule 1**. Practiq:

- imposes data-protection terms on each sub-processor at least equivalent to this DPA;
- remains liable to Customer for the acts and omissions of its sub-processors;
- gives Customer **30 days' advance notice** by email of any new or replacement sub-processor (Customer may object on reasonable grounds in good faith within those 30 days; if the parties cannot agree, Customer may terminate the affected service for the unresolved sub-processor without penalty for the prepaid unused period).

## 7. International transfers

Practiq stores Customer's Personal Data in **us-east-1** (United States). For Customers in the EEA / UK / Switzerland, transfers from those regions to the US rely on the **EU Standard Contractual Clauses** (Module 2: Controller-to-Processor) and the **UK International Data Transfer Addendum**, both incorporated by reference and available upon request.

## 8. Security

Practiq implements the technical and organizational measures listed in **Schedule 3**, including:

- TLS 1.2+ encryption in transit, AES-256 encryption at rest (via Supabase / Stripe defaults).
- Tokenized session cookies with HttpOnly + Secure + SameSite=Lax flags.
- Strict per-firm data isolation enforced at the application layer (every database query filtered by `userId`).
- Audit log retained for 7 years.
- Annual security review and penetration test (subject to Practiq's vendor-management cycle once we exit beta).

## 9. Data subject rights

Practiq will, taking into account the nature of the processing, assist Customer in fulfilling its obligations to respond to requests for access, rectification, erasure, restriction, portability, and objection from data subjects. Customers can issue requests to `privacy@practiq.dev` with subject "Data Subject Request — [data subject email]".

## 10. Personal Data Breach

Practiq notifies Customer **without undue delay** (and in any event within 72 hours of becoming aware) of any actual or reasonably suspected Personal Data Breach affecting Customer's data, providing:

- Description of the breach (data categories, approximate volume, type of data subjects).
- Likely consequences.
- Measures taken or proposed to mitigate.

## 11. Audits

Customer (or an independent auditor mandated by Customer, subject to confidentiality) may audit Practiq's compliance with this DPA once per 12-month period, on at least 30 days' written notice, during normal business hours, at Customer's expense, and not unreasonably interfering with Practiq's operations. Practiq will respond in good faith to reasonable security questionnaires (SIG Lite, CAIQ) without an on-site audit when feasible.

## 12. Deletion or return

Within **30 days** of termination of the subscription (or earlier on Customer's written instruction), Practiq deletes or returns all Personal Data, except (a) data subject to legal retention obligations (audit log, billing records — see Schedule 2), and (b) routine backups, which expire on their normal cycle.

## 13. Liability

The limitation of liability in the Master Subscription Agreement (or published Terms) applies to claims under this DPA. Nothing limits liability that cannot be limited under applicable law (e.g. willful misconduct, gross negligence, GDPR Art. 82 statutory liability where applicable).

## 14. Conflicts

In case of conflict between this DPA and other agreements between the parties, this DPA prevails for matters of personal-data processing.

## 15. Governing law

This DPA is governed by the laws of the State of Delaware, USA, without regard to its conflict-of-law principles. For Customers in the EEA / UK, the EU Standard Contractual Clauses' governing law and jurisdiction terms control to the extent of any conflict.

---

## Schedule 1 — Sub-processors (as of [DATE])

| Sub-processor | Purpose | Region |
|---------------|---------|--------|
| Vercel (Frontier Inc.) | Hosting, edge network, analytics | USA (us-east) |
| Supabase Inc. | Postgres database | USA (us-east-1) |
| Stripe Inc. | Payment processing + metered billing | USA |
| OpenRouter (Lambda Inc.) | Primary LLM gateway (zero-data-retention enabled) | USA |
| Anthropic PBC | Fallback LLM | USA |
| OpenAI L.L.C. | Embedding generation only | USA |
| Resend Inc. | Transactional email | USA |
| PostHog Inc. | Product analytics (in-app) | USA |
| Cloudflare Inc. | DNS | USA |

The current authoritative list is published at practiq.dev/privacy → "Sub-processors". Practiq notifies the email on file 30 days before any change.

## Schedule 2 — Retention

| Category | Retention |
|----------|-----------|
| Workspace data (clients, knowledge base, chat) | While subscription active + 30 days post-cancellation |
| Audit log | 7 years (US tax-record retention norm) |
| Billing records (Stripe-side) | 7 years |
| Token usage logs | 18 months |
| Transactional email metadata | 30 days |

## Schedule 3 — Technical and organizational measures (TOMs)

- **Encryption**: TLS 1.2+ in transit, AES-256 at rest at storage layer (Supabase + Stripe defaults).
- **Authentication**: NextAuth.js v5; password rows are bcrypt-hashed (cost 10); OAuth via Google / LinkedIn / Microsoft Entra; session cookies are HttpOnly + Secure + SameSite=Lax.
- **Authorization**: Application-level — every Postgres query filtered by `userId`; strict per-firm data isolation; no Postgres-level RLS, but compensated by single-tenant per-firm scope at the application boundary.
- **Audit logging**: Every authentication event, plan change, AI conversation, agent run, and approval decision is recorded in `audit_logs` with 7-year retention.
- **Network**: Cloudflare-fronted, Vercel edge; admin surface on a separate route group with rate limit + IP allowlist option.
- **Monitoring**: Structured JSON logs on Vercel; Slack alerts for 5xx, payment failures, agent cron failures; public `/status` page.
- **Backup**: Supabase point-in-time recovery (7-day window). Backup restoration tested at least annually.
- **Access control**: Production access restricted to engineering staff with hardware-key 2FA on GitHub + Vercel + Supabase + Stripe; access reviewed quarterly.
- **Incident response**: Detection → 24-hour internal notification → 72-hour Customer notification per §10. Documented runbook covers data-loss, downtime, sub-processor outage, and credential leakage.
- **Sub-processor diligence**: Each sub-processor reviewed annually for SOC 2 / ISO 27001 / DPA terms.

---

**Signatures**

For Cliwant, Inc.: ___________________________  Date: __________
Name / Title: ___________________________________________________

For [CUSTOMER LEGAL ENTITY]: _____________________  Date: __________
Name / Title: ___________________________________________________
