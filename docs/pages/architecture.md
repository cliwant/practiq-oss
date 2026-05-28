---
title: Architecture
description: Practiq's stack — Next.js 15 + React 19 + Prisma 7 + Postgres + OpenRouter. AGPL-3.0. The full design rationale, including the AI-Native Agent paradigm and what we deliberately chose NOT to build.
---

# Practiq architecture

> **Practiq is structurally three things: a Next.js web app, an MCP server, and a Postgres schema.** The interesting part is how they relate — and the design decision that they all run the same paradigm, "AI as operator, you as approver."

## What stack does Practiq use?

| Layer | Tech | Why this choice |
|---|---|---|
| Frontend | Next.js 15 (App Router) + React 19 | Server Components by default reduces hydration cost. Mature ecosystem. |
| Language | TypeScript strict mode | Catches client-context-isolation bugs at compile time. |
| Styling | Tailwind CSS v4 + motion (framer-motion) | Design tokens enforce visual consistency per `DESIGN.md`. |
| Backend (HTTP) | Next.js API Routes | Single-process; same deploy as frontend. |
| Backend (docs gen) | Python FastAPI + python-docx + openpyxl | Better at .docx/.xlsx than Node. Optional service. |
| DB | Postgres 16 + Prisma 7 (`@prisma/adapter-pg`) | Practiq runs on ARM64 Windows for dev, so the Wasm adapter is mandatory. |
| Auth | NextAuth.js v5 (Auth.js) | Credentials + Google + LinkedIn + Microsoft Entra OAuth. |
| LLM | OpenRouter (primary) + Anthropic direct (fallback) | Single key, multi-provider; provider abstraction in `packages/core/src/llm/provider.ts`. |
| MCP server | `@modelcontextprotocol/sdk` 1.29+ | Anthropic's reference SDK. stdio transport for v0.1. |
| File storage | Local filesystem (`storage/`) | Optional S3 swap-in for production. |
| Search | Postgres full-text + (future) pgvector | Keyword for v0.1; semantic in v0.2 when we wire pgvector for client knowledge base. |

License for everything: **AGPL-3.0-only**, permanent. See [Why we open-sourced](/why-oss).

## How is the code organized?

```
practiq/
├── apps/web/                  Next.js 15 web app
│   ├── src/app/               App Router pages
│   ├── src/lib/               Server-side libraries (Claude provider, agents, etc.)
│   ├── src/components/        React components (Server-first, "use client" only when needed)
│   ├── prisma/                Postgres schema + migrations
│   └── public/                Static assets including IndexNow key
├── packages/
│   ├── mcp/                   @cliwant/practiq-mcp — the npm package
│   │   ├── src/server.ts      Tool registration + dispatch
│   │   ├── src/tools/         10 tool implementations
│   │   ├── src/store/         JSON file CRUD layer
│   │   └── src/utils/         scoring (health) + date helpers
│   └── core/                  Shared types + LLM provider abstraction
├── docker/
│   ├── docker-compose.yml     Self-host orchestration
│   ├── Dockerfile.web         Multi-stage Next.js production build
│   └── entrypoint.sh          Prisma migrate + Next.js start
└── docs/                      Source for practiq.dev/docs (this site)
```

## What is the "AI-Native Agent" paradigm?

The product paradigm split:

| Paradigm | Example | Bottleneck assumption |
|---|---|---|
| Traditional Tool | QuickBooks, TaxDome, Karbon, Canopy | User decides what to do, then does it. |
| AI-Assisted Tool | ChatGPT + "AI buttons" | User asks AI for help, AI responds. |
| **AI-Native Agent (Practiq)** | The Command Center model | AI autonomously detects, prepares, suggests. User reviews and approves. |

The question that distinguishes the three: **"When the user logs in at 9am, what did the AI do overnight?"**

- Traditional / AI-Assisted: nothing.
- AI-Native Agent: scanned 120 clients' QuickBooks data, drafted 8 financial statements, queued 5 reminder emails, flagged 3 anomalies — all waiting in the approval queue.

For the full philosophical statement, see `docs/strategy/AI-NATIVE-AGENT-PHILOSOPHY.md` in the repo.

## How does the data flow at runtime?

Three flows matter.

### Flow 1 — Background agent (the autonomous part)

```
[node-cron tick]                               every 6 hours
  ↓
[Agent Runner] reads client list from Postgres
  ↓
[for each client]
  ↓
[Claude provider via OpenRouter] reads system prompt + recent transactions
  ↓
[parse response] → findings (anomalies, deliverables, intervention suggestions)
  ↓
[Postgres] save AgentTask + ApprovalItem rows
  ↓
[SSE push] notify the dashboard if user is connected
  ↓
[AuditLog] record every AI judgement for compliance
```

### Flow 2 — User chat (the conversational part)

```
[User types into chat]
  ↓
[/api/chat] → auth → load client context + recent agent findings
  ↓
[System prompt builder] assemble (client profile + agent findings + 10 most-recent context entries)
  ↓
[Claude provider streaming] → SSE to browser
  ↓
[Tool use] — generate_document → FastAPI; search_knowledge_base → Prisma; draft_email → local
  ↓
[Postgres] save Conversation + ConversationMessage
```

### Flow 3 — Approval queue (the human-in-the-loop part)

```
[Agent generates ApprovalItem (status=pending_review)]
  ↓
[Operator opens /approval-queue]
  ↓
[Operator clicks Approve / Edit / Request Changes / Comment]
  ↓
[if Modified] → Pattern Learner records the diff → AgentRule
  ↓
[if Approved] → Output table → optionally auto-send to client
  ↓
[AuditLog] records the decision + reviewer + timestamp
```

## How does Practiq isolate client data?

No Postgres RLS — application-level filtering. Every Prisma query that touches client-scoped data MUST filter by `userId`:

```typescript
// ✅ Correct
const clients = await prisma.client.findMany({
  where: { userId: session.user.id }
});

// ❌ Forbidden (lint-checked)
const clients = await prisma.client.findMany();
```

For sub-resources (`ClientContext`, `Output`, `Interaction`), the API route MUST first verify Client ownership:

```typescript
const client = await prisma.client.findFirst({
  where: { id: clientId, userId: session.user.id },
});
if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
// only NOW can we touch the client's sub-resources
```

Code review rules: any new query in `src/lib/` without a `userId` clause needs explicit justification in the PR description. See `.cursor/rules/database.md` in the repo.

## What's in the future (v0.2 / v0.3)?

| Version | Focus |
|---|---|
| 0.1.x (current) | MCP server stable; web app feature-complete for solo CPA; docker-compose self-host; AGPL-3 launch |
| 0.2.x | FastAPI document generation service; pgvector semantic search; QuickBooks Online OAuth read; multi-tenant SSO (Microsoft Entra fully wired) |
| 0.3.x | Background agent system (node-cron MVP → BullMQ + Redis); QuickBooks write (with explicit approval queue); team RBAC |
| 0.4.x | Cross-client insights (vertical benchmarks, anomaly detection trained on historical patterns) |
| 1.0 | Production-ready for 50-person firms; SOC2 compliance package; managed cloud parity with self-host fully verified at scale |

We publish the roadmap at [github.com/cliwant/practiq-oss/projects](https://github.com/cliwant/practiq-oss/projects) and update it weekly.

## What did we deliberately not build?

- **No multi-tenant data co-mingling**. Cross-client insights are a v0.4 feature and will be opt-in only.
- **No closed-source EE subdir**. Documenso's `/packages/ee` pattern is explicitly rejected. Every feature ships in OSS.
- **No telemetry on by default**. `PRACTIQ_TELEMETRY=on` is opt-in. We'd rather have 100 honest installs than 10,000 zombie installs.
- **No vendor lock-in**. Same Postgres schema in cloud and self-host; `pg_dump` exports cleanly; AGPL guarantees the code keeps working forever even if we shut down.

## How can I influence the roadmap?

- Open an issue with the `feature-request` template — describe the workflow, not the implementation.
- Vote on existing issues with 👍 reactions.
- For paying cloud customers: roadmap requests have priority routing.
- For OSS contributors who ship the feature: open a PR. We have CONTRIBUTING.md.
