# E2E Fixtures

This file documents the deterministic fixture state the authenticated
Playwright suite (`auth-chat-flow.spec.ts`, `plan-gates.spec.ts`,
`pattern-learner.spec.ts`) depends on, plus the env contract and the
order of operations to seed and run.

## What `scripts/seed-e2e-user.ts` provisions

The seed script is **idempotent** — re-running it leaves the database
in the same state regardless of prior runs. It seeds three users and
one rich client fixture:

### Users

| Env var | Fallback email                | Fallback password           | Plan      |
|---------|-------------------------------|-----------------------------|-----------|
| `E2E_TEST_EMAIL`     | `e2e@practiq.dev`        | `Practiq-E2E-2026!`         | free trial |
| `E2E_FREE_EMAIL`     | `e2e-free@practiq.dev`   | `Practiq-E2E-Free-2026!`    | free trial |
| `E2E_SOLO_EMAIL`     | `e2e-solo@practiq.dev`   | `Practiq-E2E-Solo-2026!`    | Solo (active sub) |

The free-trial users have NO `Subscription` row — the gate code resolves
them through the trial-window path. The Solo user gets a synthetic
`Subscription` row with `status="active"`, `plan="solo"`, and a fake
Stripe id (prefixed `test_sub_…`) so it cannot collide with a real
webhook.

The userIds default to fixed UUIDs so failing tests can reference the
exact row in CI:

| Env var               | Fallback userId                          |
|-----------------------|------------------------------------------|
| `E2E_TEST_USER_ID`    | `e2e00000-0000-4000-8000-000000000001`   |
| `E2E_FREE_USER_ID`    | `e2e00000-0000-4000-8000-000000000002`   |
| `E2E_SOLO_USER_ID`    | `e2e00000-0000-4000-8000-000000000003`   |

### Fixture client (only on `E2E_TEST_EMAIL`)

- **Client** — `Park CPA Group — E2E Test`, industry `accounting`,
  `userRole=CPA`, `relationshipMonths=12`, casual report tone.
- **3 ClientContext rows** — one pinned (`Client profile`), two
  unpinned (`Recent meeting summary`, `Latest financial snapshot`).
- **1 ApprovalItem** — `type="briefing"`, `status="pending_review"`,
  `priority=50`, `aiConfidence=0.92`, title starts with
  `E2E briefing fixture`.

The `E2E_FREE_EMAIL` and `E2E_SOLO_EMAIL` accounts are intentionally
**bare** (no clients, no approvals). The plan-gate tests verify
ceiling-from-zero behavior, so we don't want pre-seeded rows.

## Env contract for the test runs

The Playwright config defaults `baseURL` to `https://practiq.dev`. To
run against a different deploy:

```bash
export PRACTIQ_BASE_URL=https://practiq.dev   # or the preview URL
```

The auth-gated specs (`auth-chat-flow`, `plan-gates`, `pattern-learner`)
hard-skip when `E2E_TEST_EMAIL` is unset, so a CI job that doesn't have
the seeded DB available will simply skip them rather than fail noisily.

The markdown-content spec runs without auth and requires only
`PRACTIQ_BASE_URL`.

## Order of operations

1. **Seed the DB** — point `DATABASE_URL` at the same database the
   target deploy reads from (production reads `DATABASE_URL` from
   `<studio root>/.env.local`):

   ```bash
   cd ventures/fractional-ai-command-center
   npx dotenv -e ../../.env.local -- tsx scripts/seed-e2e-user.ts
   ```

2. **Export the test env** (or rely on the fallback values baked into
   the spec defaults):

   ```bash
   export PRACTIQ_BASE_URL=https://practiq.dev
   export E2E_TEST_EMAIL=e2e@practiq.dev
   export E2E_TEST_PASSWORD='Practiq-E2E-2026!'
   ```

3. **Run a single spec** to scope the surface area:

   ```bash
   npx playwright test tests/e2e/markdown-content.spec.ts --reporter=line
   ```

4. **Run the full E2E set** (smoke + new specs):

   ```bash
   npx playwright test --reporter=line
   ```

## Cleanup

The seed script does not clean up — it's idempotent, so the next run
just resets the fixture rows it owns. To wipe everything seeded by the
script, run the following SQL against the same database:

```sql
DELETE FROM practiq.users WHERE email IN (
  'e2e@practiq.dev',
  'e2e-free@practiq.dev',
  'e2e-solo@practiq.dev'
);
-- ON DELETE CASCADE drops every dependent client / context / approval row.
```

Override the emails via the matching env vars if your local fixture
uses different values.
