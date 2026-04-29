# Practiq — Client-centric AI workspace for boutique professional services firms

Live: **https://practiq.dev**
Admin: **https://admin.grindworks.ai/admin/login**

> *AI built around your clients, not your chats.*

Practiq is the AI workspace for 2-10 person accounting, law, HR-advisory,
consulting, and marketing-agency firms managing 30-200 client relationships.
Unlike chat-session AI agents (ChatGPT, Copilot) where memory is scoped to a
conversation and vanishes when you close the thread, Practiq scopes memory
to the **client** — every conversation, file, and agent action lives inside
a dedicated client workspace.

## Core differentiation

**Three product paradigms — Practiq is the only one in the third tier:**

| Paradigm | Behavior | Examples |
|---|---|---|
| Traditional tool | User does everything | QuickBooks, TaxDome, Excel |
| AI-assisted tool | User asks, AI replies | ChatGPT, Copilot, "AI button" |
| **AI-Native Agent** | **AI scans + drafts overnight; user reviews + approves** | **← Practiq** |

The defining question: *"What did the AI do while you slept?"* For Practiq
it's "scanned 200 client workspaces, flagged 3 anomalies, drafted 12 close-
of-month reports, queued 5 reminder emails — all of it greets you in the
morning Approval Queue."

## Tech stack (production-deployed)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS v4 |
| Backend | Next.js API Routes (Node runtime) |
| Database | Postgres on Supabase (`practiq` schema isolation) |
| ORM | Prisma 7 with `@prisma/adapter-pg` (Wasm engine for ARM64 Windows) |
| Auth | NextAuth.js v5 (credentials + Google + LinkedIn + Microsoft Entra) |
| AI | Anthropic SDK (Claude Sonnet 4.5 / Haiku 4.5 / Opus 4.1) + OpenRouter fallback |
| Billing | Stripe Checkout + Webhooks (Solo $39 / Practice $99 / Firm $299; Founding cohort $49 lifetime) |
| Email | Resend (transactional) — verified domain `practiq.dev` |
| Hosting | Vercel Pro (15 cron schedules; 60s default function maxDuration, 300s for agent runners) |
| Observability | Pino-shape logger, Vercel Analytics, Vercel Insights, Plausible-OSS, Prometheus exposition at `/api/admin/metrics`, `/api/health` readiness probe |

## Routes overview

```
/                         Marketing home
/pricing                  Pricing tiers + Founding Member counter
/founding-member          Founding cohort signup
/blog                     Field notes from boutique-firm operators
/blog/[slug]              Per-post pages (also served as .md via content negotiation)
/use-cases, /faq, /demo,  Marketing surfaces
/contact, /thesis,        (with Practiq-style structured-data graph)
/research, /docs, ...

/login, /signup           Auth entry
/forgot-password,         Auth recovery
/reset-password/[token],
/verify-email/[token]

/app                      Dashboard home — "what AI prepared overnight"
/app/clients/[id]         Client workspace (per-client scoped memory + chat)
/app/clients/new          Onboarding — add a client
/app/tasks                Approval Queue
/app/settings             Profile / Billing / Agent (model picker) / Team

/build-dashboard          Anonymous demo tour (Meridian Accounting et al.)
/admin/*                  Operator-only (admin.grindworks.ai host)

/api/auth/*               NextAuth + signup + forgot/reset/verify-email
/api/chat                 SSE chat with Anthropic + tool use
/api/agents/run           Per-user "run my own briefing now" trigger
/api/cron/*               15 cron schedules (nightly-briefing, anomaly-detector,
                          comms-drafter, factedge-inference, freshness-refresh,
                          founding-slot-cleanup, ...)
/api/stripe/checkout      Server-side Stripe session creation
/api/stripe/webhook       Stripe → Practiq event sink
/api/health               Anonymous readiness probe (db + stripe + resend + anthropic)
/api/csp-report           CSP violation log sink (log-only, see route header)
```

## Local development

ARM64 Windows (Snapdragon) hosts must use Prisma 7's Wasm engine. Node 22
LTS only — Node 23 isn't supported by Prisma 7 yet. We pin via `fnm`.

```bash
# from this directory
fnm use 22
npm install
npx prisma dev          # spins up an embedded Postgres on :51214 (separate terminal)
npx prisma db push      # syncs the schema
npx prisma generate     # regenerates the Prisma client
npm run dev             # Next.js dev server with Turbopack (uses dotenv to load ../../.env.local)
```

`.env.local` lives at the **studio root** (`<repo>/.env.local`), NOT in
this venture folder. Every venture's `package.json` reads it via
`dotenv-cli`. Variable names are documented in `<repo>/.env.example`.

## Testing

```bash
npm run type-check       # tsc --noEmit
npm run test             # vitest unit/integration suite
npm run test:e2e         # node tests/e2e/run-all.mjs (smoke-only, against dev)
PRACTIQ_BASE_URL=https://practiq.dev npx playwright test    # production E2E
```

Production E2E coverage as of Round 10 (2026-04-29):
**107 passed / 19 skipped / 0 failed across 17 spec files (~2.6 min)**.

The 19 skipped require operator-only secrets (CRON_SECRET, DOGFOOD
credentials) that aren't mirrored into local `.env.local`.

Spec files in `tests/e2e/`:
| Spec | Coverage |
|---|---|
| `persona-journey.spec.ts` | full funnel signup → /app → settings → chat → Stripe Checkout |
| `auth-flows.spec.ts` | forgot/reset/verify-email pages + chat/users-me 401 anon |
| `token-flows.spec.ts` | verify-email + reset-password DB write paths via fabricated tokens |
| `stripe-webhook.spec.ts` | webhook signature validation + FoundingClaim flip |
| `founding-slot-cleanup.spec.ts` | cron auth gates + stale-claim error path |
| `csp-report.spec.ts` | CSP report endpoint regression (Round 4 emergency fix lock-in) |
| `mobile-viewport.spec.ts` | 360 / 768 / 1024 × / + /pricing + /login no-overflow check |
| `health.spec.ts` | /api/health readiness probe shape + cache headers |
| `misc-endpoints.spec.ts` | OAuth providers + agents/run + team-invites + robots/sitemap/llms/og |
| `post-qa-fixes.spec.ts` | regression locks for Round 1 fixes (industry nav, login link, blog) |
| `agent-pipeline.spec.ts`, `auth-chat-flow.spec.ts`, `markdown-content.spec.ts`, `memory-tiering.spec.ts`, `pattern-learner.spec.ts`, `plan-gates.spec.ts`, `smoke.spec.ts` | RUN-N era infrastructure tests |

## Cycle state

This venture is part of `cycle-1` of the venture-harness studio.
Cycle progress lives at `<repo>/.cycle/`:

- `events.jsonl` — append-only event log (canonical ground truth)
- `state.json` + `metrics.json` — projections of the event log
- `BOARD.md` — narrative status
- `decisions.md` — decision log
- `wave-progress.md` (this venture only) — per-wave detail

## Documentation

| Document | Location |
|---|---|
| Product paradigm | `docs/strategy/AI-NATIVE-AGENT-PHILOSOPHY.md` |
| PRD with personas | `docs/product/PRD.md` |
| UX deep-design | `docs/product/UX-DEEP-DESIGN.md` |
| User scenarios | `docs/product/USER-SCENARIOS.md` |
| Architecture | `docs/architecture/ARCHITECTURE.md` |
| Design system + WCAG ratings | `DESIGN.md` |
| Project context (cross-session) | `.claude/context.md` |

## License

Private. Cliwant, Inc.
