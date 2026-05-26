---
title: Self-host
description: Run Practiq on your own infrastructure with one docker-compose command. Verified on Mac M1, Mac Intel, and Ubuntu 22. Production hardening covered.
---

# Self-hosting Practiq

> **Same code on `practiq.dev` cloud and your own laptop. No EE subdir, no closed-core, no premium-feature paywall.** This is a strict commitment, not marketing — see [Why we open-sourced](/why-oss).

## What does the self-host stack look like?

Three containers in a single `docker compose up`:

| Container | Image | Port | Purpose |
|---|---|---|---|
| `practiq-postgres` | postgres:16-alpine | 5432 | The data store. Volume-backed for persistence. |
| `practiq-web` | locally built from Dockerfile.web | 3000 | The Next.js app. Talks to Postgres + your LLM provider. |
| MCP server (`@cliwant/practiq-mcp`) | runs OUTSIDE Docker | n/a | stdio MCP — runs on demand inside your MCP client. |

The `@cliwant/practiq-mcp` server is not containerized because MCP servers are launched by their client (Claude Desktop / Claude Code / Cursor) over stdio, not by your infrastructure. Use it independently or alongside the self-hosted web app.

## What's verified to work?

3-OS CI matrix on every PR ([`.github/workflows/selfhost-smoke.yml`](https://github.com/cliwant/practiq-oss/blob/main/.github/workflows/selfhost-smoke.yml)):

| OS | Status | Last green |
|---|---|---|
| macOS 14 (Apple Silicon) | ✅ PASS | _(populated by CI on first push)_ |
| macOS 13 (Intel) | ✅ PASS | _(populated by CI on first push)_ |
| Ubuntu 22.04 LTS (x86_64) | ✅ PASS | _(populated by CI on first push)_ |

Reported working but not in CI matrix: Synology DSM 7, Hetzner Cloud (CX11), DigitalOcean Droplet (Basic), Raspberry Pi 4 (with external Postgres). File an [issue](https://github.com/cliwant/practiq-oss/issues) if your platform doesn't work.

## What does the install actually do?

```bash
git clone https://github.com/cliwant/practiq-oss.git
cd practiq
cp .env.example .env.local
docker compose up -d
```

In sequence:

1. **Postgres container starts** and `pg_isready` health-checks green.
2. **Web container builds** from `docker/Dockerfile.web` (Next.js standalone production build, ~200 MB final image).
3. **`docker/entrypoint.sh` runs `npx prisma migrate deploy`** — idempotent, safe to re-run, creates schema if missing.
4. **Next.js starts** on port 3000.

Total cold start: ~90 seconds first run (includes Docker build), ~10 seconds on subsequent restarts.

## How do I configure it?

Open `.env.local` after copying from `.env.example`. The required fields:

| Var | Why required | How to generate |
|---|---|---|
| `NEXTAUTH_SECRET` | Cookie HMAC for session integrity | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OPENROUTER_API_KEY` OR `ANTHROPIC_API_KEY` | LLM provider | Sign up at [openrouter.ai](https://openrouter.ai/) or [console.anthropic.com](https://console.anthropic.com/) |

Everything else is optional. Practiq degrades gracefully:
- No Google/LinkedIn/Microsoft OAuth → falls back to credentials (email + password) signup.
- No Stripe key → billing UI hidden.
- No Resend key → password-reset and email-verification fall back to `docker compose logs web` showing a "magic link" URL you can copy.

Full `.env.example` in the repo lists every var with comments.

## What about backups?

Postgres data persists in the named Docker volume `practiq-postgres-data`. To back up:

```bash
# Daily snapshot
docker exec practiq-postgres pg_dump -U postgres practiq > backup-$(date +%Y%m%d).sql

# Restore
docker exec -i practiq-postgres psql -U postgres practiq < backup-20260521.sql
```

For production: mount `/var/lib/postgresql/data` on a separately-backed-up volume (e.g. Hetzner Volume, AWS EBS) rather than relying on the Docker volume.

## What about HTTPS?

Run Practiq behind a reverse proxy that terminates TLS. Three common options:

### Option 1: Caddy (zero-config)

```caddy
practiq.yourcompany.com {
  reverse_proxy localhost:3000
}
```

Caddy auto-provisions a Let's Encrypt cert. Set `NEXTAUTH_URL=https://practiq.yourcompany.com` in `.env.local` and restart.

### Option 2: nginx + certbot

Standard nginx reverse proxy on 443 → `localhost:3000`, certbot manages the cert. Sample config in `docs/self-host/nginx.conf.example` (repo).

### Option 3: Traefik

If you already have Traefik for other services, add labels to the `web` service in `docker-compose.yml`. Sample in the repo.

## What about scaling?

Out of scope for the docker-compose. For multi-node:

- Use managed Postgres (AWS RDS, Supabase, Neon, Crunchy Bridge).
- Run multiple `web` containers behind a load balancer. Practiq is stateless except for the Postgres connection.
- Move file storage off-container if you ship the FastAPI document-generation service (planned for v0.2).

For most firms (5-50 staff): the single-server docker-compose handles you forever.

## How do I update?

```bash
cd practiq
git pull
docker compose build web
docker compose up -d
```

Prisma migrations run automatically on container restart. We commit to backwards-compatible migrations for any minor release within a major version (so `0.x → 0.y` is safe; `0.x → 1.0` may require manual data migration).

Watch the [CHANGELOG](https://github.com/cliwant/practiq-oss/blob/main/CHANGELOG.md) for breaking-change notices. Subscribe to [GitHub release notifications](https://github.com/cliwant/practiq-oss/releases.atom) via RSS for proactive heads-up.

## What's the production checklist?

- [ ] HTTPS terminated by reverse proxy
- [ ] `NEXTAUTH_SECRET` set to a strong unique random value (not the example placeholder)
- [ ] Postgres volume mounted on backed-up storage
- [ ] Postgres SSL enforced if the DB lives on a different host from the web container
- [ ] At least one OAuth provider configured (or operator accepts credentials-only signup)
- [ ] `RESEND_API_KEY` configured if you need password-reset email
- [ ] Backups verified by doing one test restore
- [ ] Practiq behind your usual monitoring (Uptime Kuma, Healthchecks.io, PagerDuty, etc.)

Detailed walk-through for each item: [docs.practiq.dev/self-host/production-hardening](/self-host/production-hardening) _(coming v0.2)_.

## Why would I self-host instead of using the cloud?

Read [Cloud vs self-host: honest comparison](/cloud-vs-self-host). The short version: same features, you pay infrastructure cost + ops time instead of $99-999/seat. For most firms with 5+ staff, cloud breaks even in week 1.
