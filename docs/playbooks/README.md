# Practiq Operator Playbooks

Concrete playbooks for operator action when key Slack alerts fire. Each
playbook covers a single triggering event and tells the operator exactly
what to do, in what order, within what time window.

## Index

| Alert | Playbook | Time-to-first-action |
|---|---|---|
| 🚨 `REAL PROSPECT signup` | [`first-real-signup.md`](./first-real-signup.md) | Within 30 min |
| 🎉 `FIRST REAL PAYMENT` | [`first-real-payment.md`](./first-real-payment.md) | Within 1 hour |
| ⚠ Daily pulse warnings | [`trigger-warn-response.md`](./trigger-warn-response.md) | Within 24 hours |

## When to read these

- **On every Slack 🚨 / 🎉**: Read the matching playbook *before* responding. Don't trust memory — these are designed to capture lessons we'd otherwise lose.
- **At the daily 04:30 UTC pulse arrival**: If ⚠ triggers fired, open `trigger-warn-response.md` for the matching trigger row.
- **Monthly review**: Re-read all three. Update what worked / didn't.

## Design principle

These playbooks assume that **the moment of a real prospect arriving is too
high-stakes to improvise**. We've spent 6 weeks building infrastructure to
generate these moments. When one finally arrives, the operator should not
be thinking "wait, what do I do?" — the answer is written down already.

The playbooks are deliberately specific: timestamps, SQL queries, email
templates. Adapt freely, but the structure exists so we don't lose data on
the first real customer experience.

## Related infrastructure

- Slack notification gate (real vs test): `src/lib/notifications/slack.ts` — `isRealProspectEmail()` decides if 🚨 fires
- Daily pulse: `src/app/api/cron/daily-pulse/route.ts` + `scripts/daily-pulse.mjs`
- PostHog dashboard: https://us.i.posthog.com/project/413414/dashboard/1555086
- Stripe dashboard: https://dashboard.stripe.com
- GSC dashboard: https://search.google.com/search-console (auth via `seungdo.keum@cliwant.com`)

---

*Created 2026-05-17. Update after every real event with what was learned.*
