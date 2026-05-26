# Practiq

> **Open-source AI practice management for boutique professional services firms.**

CPA, law, HR advisory, consulting, agency — Practiq is the AI-native context layer for
the firm that manages 50–200 clients with one person's brain. It runs in your
terminal (via [@cliwant/practiq-mcp](packages/mcp/)) and in your browser (via `apps/web/`).

[**Try the demo →**](https://practiq.dev) · [**Self-host →**](#self-host) · [**MCP install →**](#mcp-install) · [**Docs →**](https://docs.practiq.dev)

---

## Why this exists

TaxDome was acquired. Karbon raised at $400M. Canopy is at $75M ARR. Every existing
practice-management tool is a CRM with calendar bolted on. None of them understand
that a 6-person CPA firm managing 120 clients needs an **AI that knows every client's
context across every channel** — not another inbox.

Practiq is what you would build if you started a practice-management product in 2026,
not 2010.

- **Local-first MCP server.** No cloud lock-in. Bring your own LLM key. Works inside
  Claude Desktop, Claude Code, Cursor.
- **Same code on practiq.dev cloud and your own laptop.** No "open source" → "actually
  the EE features are paid" bait-and-switch.
- **AGPL-3.0 permanent.** We commit to AGPL forever. No surprise re-license to BSL or
  closed-core.

## What you can do in 5 minutes

```bash
# Option 1 — MCP server only (recommended starting point)
npx -y @cliwant/practiq-mcp

# Option 2 — Full self-host (Postgres + web + MCP)
git clone https://github.com/cliwant/practiq-oss && cd practiq
cp .env.example .env.local
docker compose up
```

Open `http://localhost:3000` → sign in → first morning briefing across all your
clients in under a minute.

---

## MCP install

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "practiq": {
      "command": "npx",
      "args": ["-y", "@cliwant/practiq-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add practiq -- npx -y @cliwant/practiq-mcp
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "practiq": {
      "command": "npx",
      "args": ["-y", "@cliwant/practiq-mcp"]
    }
  }
}
```

Now ask: *"Good morning, what do I need to focus on today?"* — Practiq scans your
local `~/.practiq/` data and returns a prioritized briefing across overdue deadlines,
upcoming items, stale clients, and health-flagged accounts. Ten tools total — full
list in [packages/mcp/README.md](packages/mcp/README.md).

---

## Self-host

A complete self-hosted Practiq runs on one box with Docker:

```bash
git clone https://github.com/cliwant/practiq-oss
cd practiq
cp .env.example .env.local
# Edit .env.local — minimum: OPENROUTER_API_KEY (or ANTHROPIC_API_KEY)
docker compose up -d
```

That spins up:
- Postgres 16 (data store)
- `apps/web` (Next.js, port 3000)
- `packages/mcp` (stdio MCP server, on demand)

Verified working on Mac M1, Mac Intel, Ubuntu 22.04. See
[docs/self-host.md](https://docs.practiq.dev/self-host) for production
deployment notes, backup strategy, and OAuth provider setup.

---

## Cloud vs self-host — honest answer

| Feature | OSS / self-host | Practiq Cloud (practiq.dev) |
|---|---|---|
| All 10 MCP tools | ✅ | ✅ |
| Web app (sign in, dashboards, clients, deadlines) | ✅ | ✅ |
| Bring your own LLM key | ✅ | ✅ (or use ours) |
| Stripe billing UI | ✅ | ✅ |
| Multi-tenant SSO (Google / LinkedIn / Microsoft) | ✅ | ✅ |
| Postgres + auth + auth | ✅ self-managed | ✅ managed |
| Pricing | $0 (your infra cost only) | from $99/seat/mo |

**We are not running a "cloud-only feature" trick.** Self-hosting Practiq gives you
the same feature surface as practiq.dev. The cloud sells managed infra (Postgres,
backups, scaling, support, single-tenant deploys for enterprise), not premium features
behind a paywall in the OSS.

---

## How it's structured

```
practiq/
├── apps/web/                Next.js 15 + React 19 web app
├── packages/
│   ├── mcp/                 @cliwant/practiq-mcp — local-first MCP server (this is the npm pkg)
│   └── core/                shared types + LLM provider abstraction
├── docker/
│   └── docker-compose.yml   one-command self-host
├── docs/                    docs.practiq.dev source
└── .github/                 CI workflows + issue/PR templates
```

---

## Contributing

We follow Contributor Covenant 2.1 ([CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)).
Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, dev loop, and how PRs work.
Security issues — please use [SECURITY.md](SECURITY.md), not public issues.

## License

[AGPL-3.0](LICENSE). Permanent. We will not re-license to closed-core or BSL.

## Built by

Practiq is built by [Cliwant](https://cliwant.com) — a one-person venture studio
operating on the principle that AI-assisted development has made building cheap,
and the right thing to do is ship real product first, then market, then operate.

> _Inspired by Will Chen's `mike` ([mikeoss.com](https://mikeoss.com)). The legal
> world got their open Harvey. The accounting / law / HR / consulting / agency
> world deserves the same._
