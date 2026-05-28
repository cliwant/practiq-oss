# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-MM-DD (TBD)

### Added

- **Initial open-source release.**
- `apps/web` — Next.js 15 + React 19 web app with sign-in, dashboards, client list,
  deadline tracking, approval queue, and Stripe billing flow.
- `packages/mcp` — `@cliwant/practiq-mcp` MCP server with 10 practice management tools:
  - `morning_briefing` — prioritized daily briefing across all clients
  - `client_context` — full context dump for a specific client
  - `add_client` — add a new client to the practice roster
  - `log_interaction` — log meetings, emails, calls, and notes
  - `week_priorities` — prioritized focus list for the week
  - `prepare_meeting` — pre-meeting context bundle
  - `search_clients` — full-text search across all client data
  - `client_health` — 0–100 health score across four dimensions
  - `handoff_brief` — generate a client handoff document
  - `deadline_tracker` — track deadlines across the practice
- `docker-compose.yml` — one-command self-host (Postgres + web + MCP).
- Documentation site at `practiq.dev/docs` covering quickstart, self-host, MCP
  reference, architecture, cloud-vs-self-host comparison, and Why-OSS essay.
- AGPL-3.0 LICENSE, Contributor Covenant 2.1 CODE_OF_CONDUCT, SECURITY.md vulnerability
  disclosure process, CONTRIBUTING.md, issue + PR templates.
- CI workflows: build + type-check + lint + test on every PR, CodeQL static analysis,
  multi-OS self-host smoke matrix (Mac M1 / Mac Intel / Ubuntu 22.04), release-build.

### Notes

- This is the first public release. The hosted product at practiq.dev has been live
  since April 2026 — the OSS release is the same codebase, with no proprietary EE
  carve-outs.
- License is AGPL-3.0 permanently. We will not re-license to closed-core, BSL, or SSPL.
- Inspired by Will Chen's [`mike`](https://mikeoss.com) (open-source legal AI). Different
  vertical, same principle.

[Unreleased]: https://github.com/cliwant/practiq-oss/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cliwant/practiq-oss/releases/tag/v0.1.0
