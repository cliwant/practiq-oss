---
title: Why we open-sourced Practiq
description: TaxDome got acquired. Karbon raised at $400M. Canopy is at $75M ARR. None of them open source. So why are we?
---

# Why we open-sourced Practiq

> **This is the longest page in the docs because the decision deserves it. If you're evaluating Practiq, this is the one page that tells you what the company actually believes — and what we've publicly committed to.**

## The short version

We open-sourced Practiq under **AGPL-3.0 permanently** at v0.1.0, with 2 customers, because:

1. **Building is cheap now.** AI-assisted coding made our 50,000-line codebase a 6-week solo project. Defensible-via-closed-source isn't the right strategy when the marginal cost of code is collapsing.
2. **Mike Knoop's `mikeoss.com` playbook just proved the OSS-B2B approach works.** 3,300 stars + 992 forks in 22 days. Same stack as Practiq. We're applying the same playbook to a different vertical.
3. **The 41,600 small accounting / law / HR / consulting / agency firms in the US are not on TaxDome.** They're on Excel + QuickBooks + email. They'll pay for the right open-source tool that respects their data — but only if the OSS is real, not bait-and-switch.

We commit to AGPL-3.0 forever. Won't re-license to BSL. Won't re-license to closed-core. If we change our minds, we expect — and accept — a 400-point critical HN thread the same day, like Cal.com got in April 2026.

## The market context

Practice-management is a real market with real revenue:

| Incumbent | Status (2026) |
|---|---|
| TaxDome | Acquired by TPG (~$350M) in 2024 |
| Karbon | Series B+, ~$400M valuation |
| Canopy | $75M ARR, profitable |
| Practice Ignition / Ignition | ~$100M ARR |
| Sage Intacct | Public market |

All five are good products. All five are CRMs with calendar bolted on. All five were architected before LLMs existed.

The new bottleneck for a 6-person CPA firm with 120 clients is not "which task should I do next." Their task list is fine. The new bottleneck is **context** — knowing across 120 clients what needs your attention, which deliverables AI prepared overnight, which clients are about to churn, which deadlines are sneaking up.

That's what Practiq treats as Job To Be Done. We call it the Command Center model. AI works overnight; you approve in the morning.

## Why open source instead of building this as a closed-source SaaS?

Three structural arguments.

### Argument 1 — AI cost-collapse changes the optimal strategy

In 2018, a 50,000-line TypeScript codebase was a $300K-500K engineering investment. Open-sourcing it meant giving away half a million dollars of work. The optimal strategy was clear: closed-source, raise capital, sell.

In 2026, with Claude Code, the same 50,000 lines is six weeks of solo work. That's not a $300K asset; that's a $30K asset. **Defensibility shifted from code to distribution + community + trust.**

If you have a six-week-built codebase and twenty plausible competitors, your competitive moat is: "we get hundreds of firms to install it because their CTO trusts open source." Not the code itself.

So we open-sourced. The asymmetric bet: distribute first, monetize later.

### Argument 2 — Will Chen's `mikeoss.com` is the working precedent

Will Chen — former Latham & Watkins associate, technical co-founder of OpenJuris — released Mike (mikeoss.com) on 2026-04-29 as an open-source clone of Harvey ($11B valuation) and Legora ($5.5B valuation). Same stack: Next.js + Supabase. License: AGPL-3.0. Zero commercialization at launch.

22 days later: **3,306 stars, 992 forks, daily commits from external contributors.** Two interviews in Artificial Lawyer and LegalFutures. He's now publicly in the conversation with companies he can't possibly outspend.

The product is not at parity with Harvey. It doesn't need to be. **AGPL-3.0 open source gives a solo founder a position to talk from.** The legal community now talks about "Harvey vs Mike" as if it's a real comparison. It functionally is — because the open source signal of trust changes what's true in the market.

Practiq applies the same playbook to professional services (CPA / law / HR / consulting / agency). Same stack. Same AGPL-3.0. Same BYOK posture. The window is open right now because TaxDome / Karbon / Canopy haven't realized their moat is gone. They're still pricing as if writing software is hard.

### Argument 3 — Cal.com's 2026 closed-source pivot showed what NOT to do

In April 2026, Cal.com — the canonical "open source Calendly clone" — announced they were going closed-source, citing "AI-powered hacking threats." Within 24 hours, the HN thread hit 391 points, **almost all of them negative**. The community forked the last MIT-licensed commit as `cal.diy`.

The lesson — for any OSS-curious B2B founder: **you cannot re-license without paying a massive trust tax.** Cal.com had 43,800 stars and lost what was probably the deciding factor for ~30% of their pipeline (developers who picked Cal because of OSS).

Practiq's solution is structural: we commit to AGPL-3.0 forever. Won't move to BSL (HashiCorp's 2023 anti-pattern). Won't move to SSPL (MongoDB's anti-pattern). Won't move to closed-core (Cal.com's 2026 anti-pattern).

If we change our minds: the same 400-point HN thread will land on us, and we'll deserve it.

## What does "AGPL-3.0 permanent" actually commit us to?

These six things are public commitments. We expect to be held to them.

### 1. Every feature in the cloud also ships in the OSS repo.
No `/packages/ee` proprietary subdir. No license-keyed premium tiers. Same code on `practiq.dev` and on your self-host VPS.

### 2. The license will not change.
AGPL-3.0-only forever. If a board pushes for re-license, the answer is no. If we get acquired, the AGPL is a condition of acquisition. If we go bankrupt, the code keeps working.

### 3. Daily commits to main for the first 30 days post-launch.
This is the Mike-pattern anti-pattern protection: "is this dead?" comments. We commit to public commit log discipline.

### 4. Weekly retro posts with real numbers.
GitHub stars, forks, npm @cliwant/practiq-mcp downloads, self-host install count (opt-in telemetry only), signups, churn, AGPL deal-block rate. Posted on LinkedIn + IndieHackers every Sunday.

### 5. AGPL deal-block transparency.
When an enterprise legal team blocks AGPL adoption, we'll publish the count (anonymized) in the weekly retro. We're betting most legal concerns are inherited folklore. The data will show.

### 6. 30-day public roadmap milestones.
[github.com/cliwant/practiq-oss/projects](https://github.com/cliwant/practiq-oss/projects). Updated weekly. Anyone can vote on issues or submit PRs.

## What are we explicitly NOT doing?

- **Not raising VC at this stage.** The cloud is the business model; if cloud doesn't work in 12 months we shut down responsibly. We're not optimizing for a "next round."
- **Not building a competitor moat through closed-source feature differentiation.** Competitors can copy any feature in 6 weeks of AI-assisted dev. The moat is distribution + community trust.
- **Not pretending Practiq has product-market fit yet.** We have 2 customers and ~30-50 organic weekly visitors. Open-sourcing IS the path to PMF — community contributions + self-host installs are the validation signal.
- **Not making promises we can't keep.** No "Series A by 2027" goalposts. The goal is: ship daily, gather signal, adjust. If the signal says shut down, we shut down honestly.

## Inspired by

This wouldn't exist without:

- **Will Chen** ([mikeoss.com](https://mikeoss.com)) for the recent proof that OSS-B2B works under AGPL-3 with BYOK and no commercialization at launch.
- **Peer Richelsen + Bailey Pumfleet** for building Cal.com — and, perhaps unintentionally, for being the case study in why re-licensing fails.
- **Paul Copplestone** for documenting Supabase's launch playbook publicly at [supabase.com/blog/supabase-how-we-launch](https://supabase.com/blog/supabase-how-we-launch).
- **James Hawkins & Tim Glaser** for PostHog's 28-day Launch HN approach.
- **Timur Ercan & Lucas Smith** for Documenso's LinkedIn-first founder narrative.
- **Mintlify** as the counter-example (closed-core wrapped in OSS branding) of what to avoid.

## Where to next?

- **Try Practiq**: [practiq.dev](https://practiq.dev) (demo, no signup) or [Quickstart](/quickstart) (60 seconds to MCP server).
- **Self-host**: `docker compose up` — [Self-host docs](/self-host).
- **Read the cloud vs self-host honest comparison**: [/cloud-vs-self-host](/cloud-vs-self-host).
- **Read the architecture**: [/architecture](/architecture).
- **File the first issue**: [github.com/cliwant/practiq-oss/issues](https://github.com/cliwant/practiq-oss/issues).
- **Watch the daily commits**: [github.com/cliwant/practiq-oss/commits](https://github.com/cliwant/practiq-oss/commits).

If you're another OSS-B2B founder thinking about this — DM me on X or email `seungdo.keum@cliwant.com`. I want to compare notes with people who've held the line.

Building loud.

— Seungdo, Practiq
