# FractionalOS

AI workspace for boutique professional services firms (accounting/tax/bookkeeping, 2-10 people, 50-200 clients). AI-native agent platform where AI proactively monitors, drafts deliverables, and orchestrates workflows — users review/approve.

## Quick Reference

```bash
fnm use 22                  # Node.js 22 LTS (ARM64 Windows — MUST use fnm)
npm run dev                 # Next.js dev server (Turbopack, port 3000)
npm run build               # Production build
npm run lint                # ESLint
npm run type-check          # tsc --noEmit (run before committing)
npx prisma dev              # Start embedded PostgreSQL (port 51214, separate terminal)
npx prisma db push          # Sync schema to DB
npx prisma generate         # Regenerate Prisma client after schema changes
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + Lucide React + motion (framer-motion)
- **Backend API**: Next.js API Routes (auth, CRUD, chat streaming)
- **Backend Docs**: Python FastAPI (python-docx, openpyxl) — NOT yet implemented
- **Database**: PostgreSQL (Prisma embedded) + Prisma 7 (`@prisma/adapter-pg`, Wasm engine)
- **Auth**: NextAuth.js v5 (email/password + Google OAuth)
- **AI**: Claude API via Anthropic SDK (Tool Use, SSE streaming)
- **Storage**: Local filesystem (`storage/`) — S3 on deploy

## Architecture Decisions

- **Hybrid backend**: Next.js API Routes for all web APIs; FastAPI only for document generation (.docx/.xlsx). FastAPI is NOT yet built.
- **No Supabase**: Chose local PostgreSQL + Prisma + NextAuth + local storage over Supabase bundle for local-first development simplicity.
- **App-level auth**: No PostgreSQL RLS. Every Prisma query MUST include `where: { userId }` filter. Client sub-resources require Client ownership check first.
- **User-Client 1:N**: MVP uses single-owner model (`Client.userId`). Phase 2 adds N:M via `UserClientMapping`.
- **Conversation model**: 2-level (Conversation session → ConversationMessage). Not flat messages.
- **AI-native agent paradigm**: AI acts autonomously (monitoring, drafting, orchestrating). Users review/approve. Human-in-the-loop for regulatory/legal decisions only. See @docs/strategy/AI-NATIVE-AGENT-PHILOSOPHY.md
- **Embedding**: Deferred. MVP uses keyword search. pgvector column exists but unused.
- **Dashboard UI**: Dark theme (Plus Jakarta Sans font, glass panels, bento cards). 3-column layout: GlobalNav (64px icon rail) + ContextNav (260px collapsible sidebar) + Content area. 5 views: Overview, Agent Thread, Knowledge Base, Artifacts, Workstream.

## Coding Conventions

- TypeScript strict mode. Path alias `@/*` → `./src/*`
- Server Components by default. Add `"use client"` only when client state/effects needed.
- API routes use `NextRequest`/`NextResponse` with try-catch at boundary
- Prisma client singleton from `src/lib/prisma.ts`
- Tailwind CSS v4 with `@import "tailwindcss"` and `@theme {}` syntax (NOT v3 `tailwind.config.js`)
- 2-space indentation. No semicolons in imports. Single quotes for strings.
- Korean comments are fine for domain logic. English for function names and API.

## Environment

- **IMPORTANT**: ARM64 Windows (Snapdragon). Prisma MUST use Wasm engine (`@prisma/adapter-pg`). Native binary may fail.
- Prisma embedded PostgreSQL runs on port 51214 with `npx prisma dev`. Must be running before `npm run dev`.
- Required env vars: see `.env.example`. NEVER commit `.env`.

## Git Workflow

- `main` branch: stable. Always passes `type-check` + `build`.
- Feature branches: `feat/description`, `fix/description`, `refactor/description`
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- Run `npm run type-check` before every commit.
- Push to `origin` (GitHub: seungdo-keum/fractional-ai-command-center, private)

## Lighthouse CI gate

Every PR that touches `src/app/**`, `src/components/**`, `src/styles/**`,
`public/**`, or the Next.js / Tailwind / Lighthouse config files triggers
`.github/workflows/lighthouse.yml`. It waits for the Vercel preview to come
up, runs a mobile-profile Lighthouse audit (4× CPU throttle) against `/`,
`/pricing`, `/workflow-audit`, and `/tools/ai-policy-generator`, and fails
the check if any surface drops below Performance ≥ 90, Accessibility ≥ 95,
Best Practices ≥ 95, or SEO ≥ 95 (the levels locked in by waves 4 and 7).
Results are posted as a sticky PR comment with per-surface scores plus
public links to the full reports (Lighthouse temporary public storage).
Thresholds live in `.lighthouserc.json` at the repo root. To intentionally
ship a known regression — e.g. an oversized hero image for a campaign —
add `[skip lighthouse]` to the PR title or the head commit message. The
job runs in parallel with the existing eval-on-pr workflow and adds no
latency to the build pipeline. Operators can replay it locally with
`npm run lighthouse:local` from this venture's dir (audits production).

## Key References

Project context (product, roadmap, architecture, environment): @.claude/context.md
Design system (colors, typography, spacing, components): @DESIGN.md
Product vision and strategy: @Fractional_AI_Command_Center_기획서.md
Detailed PRD and feature specs: @docs/product/PRD.md
Architecture deep-dive: @docs/architecture/ARCHITECTURE.md
UX design spec: @docs/product/UX-DEEP-DESIGN.md
User scenarios: @docs/product/USER-SCENARIOS.md
DB schema (single source of truth): @prisma/schema.prisma
