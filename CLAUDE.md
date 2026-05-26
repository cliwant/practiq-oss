# Practiq — developer notes for Claude Code / Cursor / Claude Desktop

Pointers for AI-assisted contributors. Not a substitute for the docs site;
go to [docs.practiq.dev](https://docs.practiq.dev) for the real docs.

## Quick commands

```bash
npm install                           # install root + packages/* deps
npm run dev                           # Next.js dev (port 3000)
npm run type-check                    # tsc --noEmit across workspaces
npm run lint                          # eslint
npm run build                         # prisma generate + next build
npm run test                          # vitest (unit + integration)
npm run e2e                           # playwright e2e
docker compose up -d                  # one-command self-host
```

## Tech stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind v4 + Lucide + motion
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma 7 (`@prisma/adapter-pg`, Wasm engine)
- **Auth**: NextAuth.js v5 (credentials + Google + LinkedIn + Microsoft Entra)
- **LLM**: OpenRouter (recommended) or Anthropic direct, via the provider abstraction
- **MCP**: `@cliwant/practiq-mcp` server in `packages/mcp/`

## Architecture decisions (load-bearing)

- **AI-Native Agent paradigm.** AI is the operator, you are the approver. See `docs/architecture/ARCHITECTURE.md` for the full theory.
- **App-level auth, not RLS.** Every Prisma query MUST include a `where: { userId }` filter. See `docs/setup/database.md` for the pattern.
- **OpenRouter primary, Anthropic fallback.** LLM provider abstraction in `src/lib/claude/provider.ts` handles routing. BYOK in OSS.
- **Conversation model 2-level.** `Conversation` (session) → `ConversationMessage`. Not flat messages.
- **PostgreSQL only.** No Supabase coupling in OSS (cloud variant exists but OSS uses plain Postgres). See `docs/architecture/ARCHITECTURE.md`.

## Coding conventions

- TypeScript **strict** mode. Path alias `@/*` → `./src/*`.
- Server Components by default; add `"use client"` only when needed.
- 2-space indent, single quotes for strings.
- Prisma client singleton from `src/lib/prisma.ts`.
- Run `npm run type-check` before committing.

## Git workflow

- `main`: always passes `type-check` + `lint` + `build`. Protected branch.
- Branches: `feat/<short>`, `fix/<short>`, `refactor/<short>`, `docs/<short>`.
- Conventional commits required (`feat:`, `fix:`, `chore:`, etc.).
- Squash-merge default. PR review SLA: 5 business days (24h for security).
- See `CONTRIBUTING.md` for the full contributor guide.

## Reading order for new contributors

1. `README.md` — what is this and why
2. `docs/architecture/ARCHITECTURE.md` — the 3-layer system design
3. `docs/product/PRD.md` — what the product does for the user
4. `DESIGN.md` — visual design tokens (colors, type, components)
5. `prisma/schema.prisma` — DB schema (single source of truth)
6. `packages/mcp/README.md` — MCP server reference

## Useful greps

```bash
# Find all auth boundary check sites
grep -rn "getServerSession\|auth()" src/app/api

# Find missing userId filters (potential security bugs)
grep -rn "findMany()" src/

# Find Server Component vs Client Component boundary
grep -rn "\"use client\"" src/
```

## Licensing

[AGPL-3.0-only](./LICENSE), permanent. Contributions are accepted under the same license per CONTRIBUTING.md.
