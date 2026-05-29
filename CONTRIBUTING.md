# Contributing to Practiq

Thanks for considering a contribution. Practiq is a solo-founded open source project,
maintained primarily by one person, so we are deliberate about what we merge — but
high-quality PRs always get a response.

## Code of conduct

We follow [Contributor Covenant 2.1](CODE_OF_CONDUCT.md). Behavior outside the
covenant gets one warning, then a ban. The maintainer's read is final.

## Quick start (dev loop)

```bash
git clone https://github.com/cliwant/practiq-oss && cd practiq
npm install                                    # uses pnpm workspaces under the hood
cp .env.example .env.local                     # fill in at least OPENROUTER_API_KEY
docker compose up -d postgres                  # start Postgres only
npm run dev                                    # Next.js dev server at repo root (port 3000)
npm run dev --workspace=packages/mcp           # MCP server in watch mode
```

To run a single MCP tool locally against your `~/.practiq/` data:
```bash
node packages/mcp/dist/bin/practiq-mcp.js
# Then in another terminal, use the MCP inspector or a test harness
```

## Type-check, lint, test before pushing

```bash
npm run type-check         # tsc --noEmit across all workspaces
npm run lint               # eslint
npm run test               # vitest where present
```

CI runs all three on every PR.

## What we eagerly merge

- **Bug fixes with a regression test.** If you found a bug, a 5-line PR plus a
  test that would have caught it is the best contribution we can receive.
- **New MCP tools that follow the existing pattern.** Tools live in `packages/mcp/src/tools/`,
  share the data layer in `packages/mcp/src/store/`, register in `server.ts`, and
  follow the MCP-standard `{ content: [{ type: "text", text }] }` return shape.
- **Self-host quality-of-life improvements.** Docker Compose, env var docs,
  one-command bootstrap scripts, OS-specific fixes (especially Windows ARM64 —
  the operator's primary dev box).
- **Docs.** Real-world write-ups of how you use Practiq inside your firm.

## What we discuss before merging

- **Architecture changes.** If a PR moves a package or restructures the workspace,
  open an issue first describing the migration so other contributors aren't blocked.
- **New dependencies.** Adding an npm dep adds a maintenance + supply-chain
  surface. Justify it in the PR description.
- **Adding "premium" / EE features.** We do not maintain a proprietary EE subdir.
  All features in this repo are AGPL-3.0. If you want to build a closed-source
  fork, fork the repo and respect the license obligations.

## What we close without merging

- Drive-by lint refactors that touch hundreds of files.
- "Add support for X library" PRs without a concrete user need.
- AGPL-incompatible code (e.g. attempting to add closed-source binary blobs).
- Anything that ships customer PII or operator-private data in tests or fixtures.

## PR process

1. Fork → branch → push → open PR against `main`.
2. PR description must answer:
   - **What changed and why?** (the operator reads this first)
   - **How did you test it?** (manual? unit? e2e?)
   - **Any breaking change?** (label `breaking` if yes)
3. Maintainer review within **5 business days** for normal PRs, 24 hours for
   security-related PRs.
4. Squash-and-merge is default. Commit message gets a Conventional Commit prefix.

## Commit messages

Conventional Commits style. Examples:
```
feat(mcp): add morning_briefing vertical filter
fix(web): correct timezone math for deadline_tracker
docs(self-host): add Mac Intel Docker tips
chore(deps): bump @modelcontextprotocol/sdk to 1.30
```

## Release process

The operator cuts releases manually:
- Patch releases (`0.1.x`) for security or critical bugs — usually within 7 days
  of merge to main.
- Minor releases (`0.x.0`) when there's a meaningful new feature or breaking
  internal change.
- npm publish of `@cliwant/practiq-mcp` happens at the same cadence; the package version
  tracks the repo version.

## Security

**Do not file public issues for security bugs.** See [SECURITY.md](SECURITY.md)
for the private reporting process.
