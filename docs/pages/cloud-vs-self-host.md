---
title: Cloud vs Self-host
description: Honest comparison between Practiq cloud (practiq.dev, $99-999/seat/mo) and self-host (free, AGPL-3). Same features, you pay for managed infra or you pay in ops time.
---

# Cloud vs Self-host: an honest comparison

> **Every feature ships in both. The cloud sells managed infrastructure (Postgres, backups, OAuth provisioning, uptime SLA, support). Not premium features behind a paywall.** This is the AGPL-3.0 permanent commitment in action — read [Why we open-sourced](/why-oss) for the reasoning.

## Are there any features that only exist in Practiq Cloud?

**No.** Every line of code shipped to `practiq.dev` is in the open source repo. The 10 MCP tools, the approval queue, the Command Center dashboard, Stripe billing integration, multi-tenant SSO — all in OSS. If you find a feature in the cloud that isn't in OSS, [file an issue](https://github.com/cliwant/practiq-oss/issues) and we'll fix it.

We explicitly do NOT do the Documenso-style `/packages/ee` proprietary subdir. There is no "EE" build configuration. Same code, same features.

## So why would I ever pay for the cloud?

Because we sell **managed infrastructure and our time**, not features:

| Cloud Starter ($99/seat/mo) | Cloud Team ($499/5 seats/mo) | Cloud Pro ($999/10 seats/mo) |
|---|---|---|
| Managed Postgres (backed up nightly) | + Team RBAC | + Single-tenant deploy option |
| Resend email provisioning | + Audit log 365-day retention | + SOC2 compliance package (Q3 2026) |
| OAuth provider setup (Google + LinkedIn + Microsoft pre-configured) | + Priority support (24h response) | + Custom data residency (EU, APAC) |
| 99.9% uptime SLA | + Quarterly architecture review | + Dedicated Slack channel + Tech Account Manager |
| Email support (72h response) | + Webhook integrations help | + Quarterly executive business review |

For a 5-person CPA firm at $499/month, the math vs DIY:
- Hetzner Cloud Postgres + backups: ~$60/mo
- Resend email: ~$20/mo
- Your CTO's time setting up OAuth + monitoring: ~10 hours @ $150/hr = $1,500 one-time
- Your CTO's time maintaining + patching: ~4 hours/month @ $150/hr = $600/mo
- **DIY total: $680/mo + $1,500 setup**
- **Cloud Team: $499/mo + 0 setup**

Cloud breaks even in month 1. The bigger your firm, the bigger the win — because the cloud overhead per seat goes DOWN, while ops time goes UP.

## When is self-host actually the right choice?

Three clear cases:

1. **You already have a sysadmin and Postgres infrastructure.** If you're running other Dockerized services, adding Practiq is 10 minutes. The marginal cost is near zero.

2. **You have a regulatory requirement to keep data on-premises.** Some jurisdictions or industries require it. Self-host gives you full control: your Postgres, your VPC, your backup region.

3. **You want to verify the code yourself before trusting it with client data.** Self-host first, evaluate for a quarter, migrate to cloud (or stay on self-host) once you're confident. Same Postgres schema = trivial migration either direction.

## What about pricing fairness over time?

We commit to:

- **No price increases for the first 12 months of any seat.** When you sign up at $99, you stay at $99 for 12 months even if we raise list pricing for new customers.
- **30-day refund, no questions.** First month at any tier is fully refundable.
- **Annual = 17% discount.** Standard 2-month-free annual deal.
- **No "Enterprise contact us" pricing trap.** Prices are public. Discounts are negotiable above 50 seats but our list is fair.
- **You can downgrade or cancel anytime.** Monthly billing, monthly cancellation, prorated.

## What happens to my data if I cancel cloud?

You get a 90-day grace period to export. Standard `pg_dump` + `~/.practiq/` JSON files. The same schema the self-host uses, so you can migrate to self-host or to a competitor.

At 90 days post-cancellation, data is permanently deleted from our servers. We notify you 14 days before deletion.

## What happens to my data if Practiq the company shuts down?

The AGPL-3.0 commitment is the ultimate insurance. If we go out of business:
1. The code keeps working forever — it's in the repo.
2. You self-host it on your own infra.
3. Your `pg_dump` export is a standard Postgres dump that any developer can work with.
4. Community forks can pick up maintenance.

This is the BSL/SSPL nightmare scenario Practiq specifically avoids by being AGPL-3.0 forever. See [Why we open-sourced](/why-oss) for the commitment in writing.

## What about feature requests — do paying customers get priority?

Yes, on roadmap routing. Paying cloud customers' feature requests get tagged `customer-request` and prioritized over generic OSS issues. We're transparent about this: open source is the welcome mat; cloud is the business model.

But anyone can ship a feature via PR. If an OSS contributor ships your feature first, it lands in OSS first, then propagates to cloud.

## Common AGPL questions

**Q: My firm uses Practiq internally. Do we have to open-source anything?**
A: No. AGPL only triggers when you serve Practiq (or a modified version) as a hosted product to others. Internal use by your team is unaffected.

**Q: I want to fork Practiq, change the branding, and run it as a competitor SaaS. Can I?**
A: Yes — AGPL-3.0 allows it — but you must:
1. Open-source your modifications under AGPL-3.0
2. Provide source code to your users
3. Not remove the AGPL license notice

This is the explicit trade-off. AGPL is the strongest copyleft for SaaS. If you don't like it, MIT-licensed alternatives exist (Cal.com's pre-2026 versions, for example).

**Q: My company's legal team says we can't use AGPL software.**
A: This is more common than it should be. The reality:
- AGPL only impacts modification + redistribution. Using Practiq as a server in your environment is not "distribution."
- Most enterprise legal concerns are inherited folklore from the GPLv2 era and don't actually apply to AGPL-3.0.
- If your legal team insists, we offer a commercial license carve-out by email. Same code, AGPL waived for an annual license fee.

## How do I switch from cloud to self-host (or back)?

Either direction:

1. Export the data — `pg_dump` in cloud, `pg_dump` in self-host.
2. Import to the other side — `pg_restore`.
3. Update your DNS or your bookmark.

Same Postgres schema. Same code. Zero data loss. The migration is whatever your team's lunchtime allows.

This is intentional — vendor lock-in is the opposite of trust, and Practiq's economics depend on trust.
