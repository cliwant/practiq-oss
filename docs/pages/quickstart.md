---
title: Quickstart
description: Install Practiq MCP in Claude Desktop in under 60 seconds. Or self-host the full web app with one docker-compose command.
---

# Practiq Quickstart

> **Practiq is an open-source AI-native Command Center for boutique professional services firms managing 50-200 clients each.** This page gets you running in under 60 seconds, whether you want the MCP server, the web app, or both.

You have two paths. Pick whichever matches your need today; you can add the other later.

| If you want | Use | Time |
|---|---|---|
| AI inside Claude Desktop / Cursor that knows your clients | **Path A — MCP server** | 60 seconds |
| Full Command Center web app (signup, dashboard, billing) | **Path B — self-host the web app** | 30 seconds |
| The hosted version with managed Postgres + backups | Sign up at [practiq.dev](https://practiq.dev) | 30 seconds |

---

## Path A — Install the MCP server

### Why would I want this?

Because you already work inside Claude Desktop or Cursor and want practice-management tools right there. Ten tools — morning briefing, client context, prepare meeting, log interaction, deadline tracker, and six more.

### What you need

- Node.js 20 or newer (`node -v` to check).
- Claude Desktop, Claude Code, or Cursor.
- BYOK — an OpenRouter API key (recommended) or Anthropic direct key. Sign up at [openrouter.ai](https://openrouter.ai/) (free $5 credit on signup).

### Install for Claude Desktop

Open your config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add or merge this entry:

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

Fully quit Claude Desktop, then re-open it. Practiq is now available.

### Install for Claude Code

```bash
claude mcp add practiq -- npx -y @cliwant/practiq-mcp
```

### Install for Cursor

Add to `.cursor/mcp.json`:

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

### Try the first prompt

> "Good morning, what do I need to focus on today?"

Practiq reads your local `~/.practiq/` data and returns a prioritized briefing across all clients. First run, the directory is empty — add a client next with:

> "Add Johnson Corp as a new accounting client. Sarah Johnson is the CEO, email sarah@johnson.com. Monthly retainer at $2,500."

Then ask:

> "Brief me on Johnson Corp before my 2pm meeting."

The full tool list is at [MCP reference →](/mcp-reference).

---

## Path B — Self-host the full web app

### What you need

- Docker Desktop or Docker Engine.
- Git.
- 1 GB RAM minimum. Works on a $5/mo VPS.

### Start

```bash
git clone https://github.com/cliwant/practiq-oss.git
cd practiq
cp .env.example .env.local
# Minimum: set NEXTAUTH_SECRET (any random 32-byte hex) and OPENROUTER_API_KEY
docker compose up -d
```

That spins up Postgres 16 + the Next.js app. Open `http://localhost:3000`, sign up with the credentials provider (email + password), and you have your own Practiq instance.

Full self-host guide → [Self-host docs](/self-host).

---

## What does Practiq do with my data?

For the MCP server: data lives at `~/.practiq/` on YOUR machine as JSON files. Practiq doesn't ship a cloud component. Your LLM key (OpenRouter or Anthropic) handles inference; we don't proxy it.

For the self-hosted web app: same idea, but the data lives in YOUR Postgres on YOUR infrastructure. The Practiq cloud at `practiq.dev` only sees data when you use the cloud version specifically.

For the Practiq cloud (`practiq.dev`): standard SaaS — your data lives in our managed Postgres, encrypted at rest. Same Postgres schema as self-host, so you can export and switch any time.

---

## Where to next?

- **You're a developer**: see [Architecture](/architecture) for the full stack.
- **You're a CPA / EA / consultant**: try the [practiq.dev demo](https://practiq.dev/dashboard?firm=meridian-accounting&view=home&tour=1) — no signup needed.
- **You're evaluating cloud vs self-host**: [pricing + honest comparison](/cloud-vs-self-host).
- **You're skeptical it's really open source**: [Why we open-sourced + license commitment](/why-oss).

---

## How do I uninstall?

For the MCP server: remove the `practiq` entry from your MCP client config. Optionally `rm -rf ~/.practiq/` to delete the data.

For self-host: `docker compose down -v` removes everything, including the Postgres volume.

We respect that you might leave. No telemetry, no remote disable switch, no "phone home" calls. Goodbye is a feature.
