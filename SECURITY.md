# Security Policy

## Supported Versions

The latest minor release on `main` is the only supported version. Patch releases
are cut as needed for security fixes.

| Version | Supported |
|---|---|
| Latest minor on `main` | ✅ |
| Previous minor | ⚠️ for 90 days after a new minor releases |
| Older | ❌ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report privately via one of the following channels, in this order
of preference:

1. **GitHub Security Advisory (preferred):**
   Go to <https://github.com/cliwant/practiq-oss/security/advisories/new> and submit
   privately. GitHub will not surface the report publicly until we coordinate
   disclosure with you.
2. **Email:** `security@practiq.dev` — PGP key fingerprint TBD; we will respond
   in plaintext within 48 hours and provide a key if you want to encrypt
   follow-up correspondence.

### What to include

- A clear description of the vulnerability and its impact.
- Steps to reproduce, ideally with a minimal proof-of-concept.
- Your assessment of the severity (CVSS 3.1 vector if you can).
- Whether you intend to publicly disclose, and on what timeline.

### What to expect from us

- Acknowledgement within **48 hours** of your report.
- A first triage response (confirmed / not-a-bug / need-more-info) within **5
  business days**.
- For confirmed vulnerabilities, a patch timeline:
  - **Critical** (RCE, auth bypass, data exfiltration): patch in `main` within 7
    days, release within 14 days.
  - **High** (privilege escalation, IDOR, exploitable XSS): patch within 30 days.
  - **Medium / Low**: rolled into the next regular release.
- A CVE will be requested for any vulnerability that affects users (including
  self-hosters who pulled a vulnerable image).
- Public disclosure is coordinated with you. We default to **30-day embargo from
  patch release** unless the vulnerability is already being exploited in the wild.

### Hall of fame

Reporters whose vulnerabilities lead to a patch will be credited in the release
notes and in [SECURITY-HALL-OF-FAME.md](SECURITY-HALL-OF-FAME.md) unless they
request to remain anonymous. We do not currently run a paid bug bounty program.

## Scope

In scope:
- The `apps/web/` Next.js application (including API routes).
- The `@cliwant/practiq-mcp` npm package (`packages/mcp/`).
- The `docker-compose.yml` shipped in this repo and any official Docker images.
- The `practiq.dev` hosted cloud (same code as OSS — see [Cloud vs self-host](README.md#cloud-vs-self-host--honest-answer)).

Out of scope:
- Third-party dependencies' vulnerabilities (please report those upstream;
  we'll bump versions in response to CVE notifications and Dependabot).
- Issues in self-hosting that are clearly the operator's misconfiguration
  (e.g. running Postgres with `password=postgres` on the public internet).
- Social-engineering attacks on Practiq maintainers or users.

## Hardening guidance for self-hosters

- Always run behind HTTPS. Practiq is not designed to be exposed over plaintext HTTP.
- Rotate `NEXTAUTH_SECRET` periodically (it's a cookie HMAC; rotating invalidates
  active sessions, which is intentional).
- The MCP server (`@cliwant/practiq-mcp`) writes data to `~/.practiq/` by default — on
  multi-user machines, override with `PRACTIQ_DATA_DIR` to a user-scoped path.
- We recommend enabling Postgres SSL in production. The default `docker-compose.yml`
  does NOT enforce SSL between the web container and Postgres (they share a Docker
  network), but you should add `sslmode=require` in any deploy that crosses a
  network boundary.
