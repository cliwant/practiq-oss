---
title: MCP Reference
description: The @cliwant/practiq-mcp npm package exposes 10 tools that let Claude Desktop / Claude Code / Cursor reason about your practice. Every tool, every input, every example.
---

# `@cliwant/practiq-mcp` reference

> **One npm package, 10 tools, ~50 KB packed. Works in any MCP-compatible client.** Install in 60 seconds with `npx -y @cliwant/practiq-mcp` (see [Quickstart](/quickstart)). Source at [github.com/cliwant/practiq-oss/tree/main/packages/mcp](https://github.com/cliwant/practiq-oss/tree/main/packages/mcp).

## How does Practiq's MCP server work under the hood?

Plain Node stdio MCP server. Listens on stdin for JSON-RPC requests, replies on stdout. Logs to stderr only (because stdout is the protocol channel). Data persists at `~/.practiq/` as human-readable JSON files — no database, no cloud connection. You can override the data directory with `PRACTIQ_DATA_DIR`.

The tools are pure local file operations. No LLM calls happen inside the server itself — your MCP client (Claude Desktop, etc.) is the LLM. Practiq is the toolbelt.

## Where does my data live?

```
~/.practiq/
├── clients/
│   ├── kim-restaurant.json     # one file per client
│   ├── techstart-inc.json
│   └── ...
├── interactions/
│   ├── kim-restaurant.jsonl    # append-only log per client
│   ├── techstart-inc.jsonl
│   └── ...
└── deadlines/
    └── deadlines.json          # global deadline list across clients
```

Human-editable. Diff-able. Backup-friendly. If you decide to leave, take the directory with you.

---

## The 10 tools

### 1. `morning_briefing`

**What it does**: Generates a prioritized daily briefing across all clients. Shows clients needing attention today, upcoming deadlines, stale clients, and recent interactions summary.

**Inputs**: `{ vertical?: "accounting" | "law" | "hr" | "consulting" | "agency" | "other" }` — optional filter.

**Example Claude prompt**:
> "Good morning, what do I need to focus on today?"

Or filtered:
> "Give me the morning briefing for just my law clients."

---

### 2. `client_context`

**What it does**: Full context dump for one client — profile, contacts, engagement details, interaction history, deadlines, health score, notes. Use before any meeting.

**Inputs**: `{ client_name: string }` — required. Fuzzy-matches by slug, full name, or partial name.

**Example Claude prompt**:
> "Tell me everything about Smith & Associates."

> "Brief me on Kim's Restaurant before my 2pm meeting."

---

### 3. `add_client`

**What it does**: Adds a new client. Stores the profile as JSON at `~/.practiq/clients/`. Validates vertical and status enums; rejects duplicates by slug.

**Inputs**:
- `name` (required), `vertical` (required, one of accounting/law/hr/consulting/agency/other)
- `contacts[]` — optional list of `{ name, role, email, phone, isPrimary, notes }`
- `notes`, `engagement_type`, `start_date`, `value`, `scope`, `tags`, `status` — all optional

**Example Claude prompt**:
> "Add Johnson Corp as a new accounting client. Sarah Johnson is the CEO, email sarah@johnson.com. Monthly retainer at $2,500."

---

### 4. `log_interaction`

**What it does**: Logs a meeting, email, call, or note. Appends to the client's interaction log (`~/.practiq/interactions/<slug>.jsonl`) and updates the client's `lastInteraction` date.

**Inputs**:
- `client_name`, `type` (meeting/email/call/note), `summary` — all required
- `action_items[]` — optional list of follow-ups
- `date` — optional (defaults to today)

**Example Claude prompt**:
> "I just had a meeting with Smith & Associates. Revenue is up 15%. We discussed Q4 tax planning. I need to send them an updated projection and schedule a follow-up in 2 weeks."

---

### 5. `week_priorities`

**What it does**: Scores clients by overdue deadlines, upcoming deadlines, days since last interaction, and health indicators. Returns a ranked list. Use for weekly planning.

**Inputs**: none — returns everyone, ranked.

**Example Claude prompt**:
> "What should I focus on this week?"

---

### 6. `prepare_meeting`

**What it does**: Pre-meeting context bundle. Includes recent interactions, open action items, key contacts, engagement history, active deadlines, and suggested talking points.

**Inputs**: `{ client_name: required, meeting_purpose?: string }`

**Example Claude prompt**:
> "I have a meeting with Johnson Corp in an hour. Prepare me."

Or with specific purpose:
> "Prepare me for the Johnson Corp quarterly review meeting."

---

### 7. `search_clients`

**What it does**: Full-text search across all client data — names, notes, contacts, tags, interactions. Returns matching clients with relevant excerpts.

**Inputs**: `{ query: string }` — required.

**Example Claude prompt**:
> "Which clients have we discussed tax planning with?"

> "Find every client where we mentioned QuickBooks issues."

---

### 8. `client_health`

**What it does**: Health score 0-100 across four weighted dimensions (interaction recency 30%, deadline status 30%, engagement depth 15%, risk signals 25%). Bands: Healthy (80+), Watch (60-79), At Risk (40-59), Critical (0-39).

**Inputs**: `{ client_name?: string }` — optional. If omitted, returns the health dashboard for all clients.

**Example Claude prompt**:
> "Show me the health of all my clients."

> "How is Smith & Associates doing?"

The risk signal detection scans for keywords like "unhappy", "frustrated", "cancel", "terminate", "overdue", "complaint" in client notes and interaction summaries.

---

### 9. `handoff_brief`

**What it does**: Generates a comprehensive handoff document for transitioning a client from one team member to another. Includes full profile, contacts, interaction history, deadlines, notes, and a handoff checklist.

**Inputs**: `client_name`, `outgoing_person`, `incoming_person` — all required.

**Example Claude prompt**:
> "Generate a handoff brief for Smith & Associates. I'm transitioning them from Jennifer to Emily."

---

### 10. `deadline_tracker`

**What it does**: Track and manage deadlines across all clients. Three sub-actions:

- **`list`** — view deadlines (optionally filtered by client)
- **`add`** — create a new deadline
- **`complete`** — mark a deadline as done

**Inputs**: `action: "list" | "add" | "complete"` required. Other fields depend on action:
- `add`: `client_name`, `description`, `due_date` (YYYY-MM-DD) required; `priority` (low/medium/high/critical) optional
- `complete`: `deadline_id` required (get it from `list`)
- `list`: `client_name` optional

**Example Claude prompts**:
> "What deadlines are coming up?"

> "Add a deadline for Smith's Q1 tax filing, due April 15, high priority."

> "Mark the Kim's Restaurant March close deadline as complete."

---

## What are the return shapes?

Every tool returns the MCP-standard:

```json
{
  "content": [
    { "type": "text", "text": "Human-readable output here" }
  ]
}
```

Errors come back as:

```json
{
  "content": [{ "type": "text", "text": "Error: <reason>" }],
  "isError": true
}
```

Your MCP client parses these automatically; you don't see the JSON.

## Can I extend it?

Yes — it's AGPL-3.0. Fork [github.com/cliwant/practiq-oss](https://github.com/cliwant/practiq-oss), add tools in `packages/mcp/src/tools/`, register in `server.ts`. Open a PR if you think your tool is generally useful.

If you're building something proprietary on top of `@cliwant/practiq-mcp`, the AGPL network-use clause applies. Most teams using Practiq internally (not as a hosted SaaS) are fine; see [Why OSS](/why-oss) for the licensing thinking.
