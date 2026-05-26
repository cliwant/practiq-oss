---
name: Bug report
about: Something is broken
title: "[bug] "
labels: bug
assignees: ''
---

## What happened

A clear, concise description of the bug.

## Expected behavior

What you expected to happen.

## Reproduction

Minimum steps to reproduce:
1. ...
2. ...
3. ...

## Environment

- **Where**: cloud (practiq.dev) / self-hosted Docker / `@cliwant/practiq-mcp` npm / dev clone
- **MCP client** (if relevant): Claude Desktop X.Y / Claude Code X.Y / Cursor X.Y / other
- **OS**: macOS X.Y / Ubuntu X.Y / Windows X
- **Node version** (if relevant): `node -v`
- **Practiq version**: `npm view @cliwant/practiq-mcp version` or commit SHA
- **Browser** (if web app): Chrome X / Firefox X / Safari X

## Logs / error output

```
paste relevant log snippet, stack trace, or screenshot here
```

If on self-hosted Docker: `docker compose logs --tail=200 web`
If `@cliwant/practiq-mcp`: stderr from the MCP server (Claude Desktop logs it).

## Anything else

Optional — links to related issues, hypotheses about root cause, etc.

---

**Security?** Do not file a public issue for security bugs. See [SECURITY.md](../../SECURITY.md).
