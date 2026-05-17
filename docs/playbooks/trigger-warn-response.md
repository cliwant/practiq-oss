# Playbook — ⚠ Warning Trigger Response Matrix

**Trigger**: Daily Pulse Slack card shows ⚠ in the header, or `npm run pulse` shows trigger condition fired.

**Why this playbook matters**: ⚠ warnings are not break-the-mode events — they're course-correction signals. Each one points to a specific failure mode in the marketing/product loop. Without a written response, ⚠ warnings get ignored until they compound into a 🚨 (or worse, until they don't compound but also don't improve).

There are **6 documented ⚠ trigger conditions** that the pulse evaluates. Each has its own response sequence below.

---

## Trigger 1: `⚠ CTR < 0.3% on >1k imp → title rewrites not landing`

**What it means**: Google Search Console shows >1,000 impressions on Practiq pages over 28 days, but clicks are <0.3% of those impressions. People see our results in search but don't click.

### Diagnostic (10 min)

```bash
cd ventures/fractional-ai-command-center
npm run pulse  # confirm trigger is still firing
```

Then pull which pages are getting impressions but no clicks:

```bash
# We have a pre-built script — adapt the queries
node --env-file=../../.env.local -e "
$(cat scripts/daily-pulse.mjs | head -180)
# ... or just open Google Search Console directly:
# https://search.google.com/search-console
# → Performance → Pages → sort by Impressions desc, filter CTR < 0.5%
"
```

What you're looking for:
1. **Page at SERP position < 10 with 0% CTR**: Title rewrite candidate. Same playbook we ran 5/16-17.
2. **Page at SERP position > 30 with 1000+ impressions**: Different problem — content is showing up but for irrelevant queries. Don't rewrite title; rewrite the body or add internal links.
3. **Page at SERP position 10-30 with low CTR**: Stuck in page-2-3 zone. Title rewrite + internal linking pass + (in 2-3 weeks) check if more backlinks appeared.

### Action ladder (try in order)

| If… | Then… |
|---|---|
| 1-3 page-1 results have 0 clicks | Rewrite title + meta description (proven leverage). Use existing 2026-05-17 rewrites as template — lead with specific numbers or contrarian hook. |
| Title rewrites already done last 7d | Wait. Google takes 3-7 days to re-index titles. Re-check in 7d. |
| Title rewrites done >14d ago, still no movement | The title isn't the problem. Improve the page body: add a more compelling H1, add a TL;DR box at the top, add comparison tables. |
| Position regressed (e.g. pos 5 → pos 15) on a previously good page | Check if a competitor took the slot. View the SERP yourself. If yes, audit their page for what they did better. |

### What NOT to do
- Don't rewrite titles weekly — Google penalizes thrash. Once per 2-3 weeks max per page.
- Don't add keyword stuffing. CTR comes from clarity + curiosity, not keyword density.

### When to escalate to "real work"
If 4+ weeks of trying and 28d CTR still < 0.3%, the issue is structural — likely the queries our pages target are buyer-research queries where users prefer 3rd-party listicles over vendor sites. Build backlinks from listicles instead of trying to win first-party.

---

## Trigger 2: `⚠ 0/N AEO citations → content gap deeper`

**What it means**: The `geo-citation-scan` cron ran 12 probe queries against AI search engines (OpenRouter / Perplexity / Brave) in the last 7 days, and Practiq was cited in **0** of them.

### Diagnostic (15 min)

```sql
-- Which queries did we NOT get cited for, and who got cited instead?
SELECT
  query, source, cited_practiq,
  ARRAY_TO_STRING(competitors_cited, ', ') AS competitors,
  LEFT(response_text, 300) AS preview
FROM public.geo_citations
WHERE scanned_at > NOW() - INTERVAL '7 days'
ORDER BY cited_practiq DESC, scanned_at DESC;
```

What you're looking for:
- **Which queries got us cited at least once?** Those are the categories we own.
- **Which queries reliably cited competitors but not us?** Those are the gaps. Note who got cited — those names are the competitive set in the LLM's training data.
- **Are competitor names consistent across queries?** Single dominant competitor = we need a /alternatives/{them} page. Multiple competitors = listicle needed.

### Action ladder

| If… | Then… |
|---|---|
| 0/12 cited and same 3-5 competitors dominate | Write a /best/{category} listicle that includes those competitors honestly + positions Practiq credibly at #3-4 (use the 2026-05-17 listicle template). |
| 0/12 cited and competitors vary wildly per query | We have a NAMING problem — the LLM doesn't know "Practiq" maps to "AI workspace for boutique firms". Spike presence on directories (AlternativeTo, futurepedia, theresanaiforthat) + writing 1-2 thought pieces with "Practiq" mentioned heavily so future LLM scrapes pick it up. |
| 1-2/12 cited consistently | Don't panic. AEO compounds slowly. Wait 30 days, re-scan. |
| Some queries cite us, others don't | Look at the cited queries — what's structurally similar about them? Often it's queries we have a strong matching /best/ or /vs/ page for. Build more pages with that pattern. |

### What NOT to do
- Don't pay for "AEO services" claiming guaranteed inclusion. Most are scams.
- Don't change Practiq's positioning to chase LLM training data. The positioning has to be true even if it takes longer to seed.
- Don't add more probe queries until the existing 12 stabilize.

### When to escalate
If after 60 days of /best/ + /alternatives/ + directory submissions we're still 0-1/12, the strategy needs change. Options: pay for content placement on existing high-AEO domains (Reddit, dev.to, Medium publications), or partner with an existing tool that's well-cited for distribution.

---

## Trigger 3: `⚠ 10+ step_blocked → audit form friction`

**What it means**: The `workflow_audit_step_blocked` event fired 10+ times in 7 days — visitors clicked "Next" on the workflow-audit form and got blocked by validation.

### Diagnostic (5 min)

```sql
SELECT
  properties->>'step_number' AS step,
  properties->>'step_name' AS step_name,
  properties->>'reason' AS reason,
  COUNT(*) AS occurrences,
  COUNT(DISTINCT distinct_id) AS unique_users
FROM practiq.analytics_events
WHERE type = 'workflow_audit_step_blocked'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY 1,2,3
ORDER BY occurrences DESC;
```

This tells you exactly which step + which validation reason is breaking people.

### Action ladder

| Pattern | Action |
|---|---|
| One step + one reason dominates (e.g. 80% of blocks are step 1, reason "vertical_required") | UX fix: that field needs to be more obvious. Look at the input — is it a hidden dropdown? Has it got a clear label? Is the error message inline (not a browser tooltip)? |
| One step but spread across reasons | The step is asking too many things. Split it. |
| Blocks spread evenly across all 8 steps | Form is just too long. Consider: progressive disclosure (skip optional steps), or auto-save + resume later. |
| Blocks concentrate on step 2-3 then taper | The form is OK but the first 2 steps lose ~50% of users. Add a one-time progress reassurance: "30 seconds left", or split into two pages. |

### What NOT to do
- Don't remove validation. Bad data downstream is worse than friction upstream.
- Don't auto-skip validation by setting defaults — users will not realize what they answered.

---

## Trigger 4: `⚠ <30% audit completion at 10+ starts → form drop-off`

**What it means**: 10+ users started the workflow-audit form but fewer than 30% completed it.

### Diagnostic (5 min)

```sql
-- Per-step funnel breakdown
SELECT
  COUNT(DISTINCT distinct_id) FILTER (WHERE type = 'workflow_audit_started')::int AS started,
  COUNT(DISTINCT distinct_id) FILTER (WHERE type = 'workflow_audit_step_viewed' AND properties->>'step_number' = '1')::int AS viewed_step_1,
  COUNT(DISTINCT distinct_id) FILTER (WHERE type = 'workflow_audit_step_viewed' AND properties->>'step_number' = '4')::int AS viewed_step_4,
  COUNT(DISTINCT distinct_id) FILTER (WHERE type = 'workflow_audit_step_viewed' AND properties->>'step_number' = '8')::int AS viewed_step_8,
  COUNT(DISTINCT distinct_id) FILTER (WHERE type = 'workflow_audit_completed')::int AS completed
FROM practiq.analytics_events
WHERE created_at > NOW() - INTERVAL '7 days';
```

This shows the precise drop-off curve. Combined with trigger 3 (`step_blocked`), you'll see:
- High drop between started → viewed_step_1: form intro is wrong (most users bail before they even start).
- Drop between viewed_step_N → viewed_step_N+1 with NO step_blocked event: people aren't bailing on validation, they're closing the tab. The step is uninteresting/too long.
- Drop concentrated at step 8 (contact info): people don't want to give email yet. Consider showing partial results before email gate.

### Action ladder

| Drop point | Action |
|---|---|
| started → viewed_step_1 high | The /workflow-audit page intro is unconvincing. Rewrite the hero copy + lead with a stronger why-bother. |
| Drops at one mid-step | Combine with trigger 3 data — likely validation issue. |
| Drop at final step (contact info) | Show partial value before the email gate. Or remove the gate (give the audit, ask for email after). |
| Drops uniformly at every step | Form is just too long for the perceived value. Cut steps. |

---

## Trigger 5: `⚠ 7d zero signups + flat traffic → distribution problem`

**What it means**: Traffic is steady (no large +/- change in 7d), but zero real prospects signed up. This signals that traffic quality is low OR the on-site conversion is broken.

### Diagnostic (10 min)

```sql
-- Are real-prospect-shaped visitors hitting key pages but not signing up?
SELECT
  url,
  COUNT(DISTINCT distinct_id) AS unique_visitors,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS signups
FROM practiq.analytics_events
WHERE type = '$pageview'
  AND created_at > NOW() - INTERVAL '7 days'
  AND url IN (
    SELECT 'https://practiq.dev/signup' UNION
    SELECT 'https://practiq.dev/pricing' UNION
    SELECT 'https://practiq.dev/'
  )
GROUP BY url
ORDER BY unique_visitors DESC;
```

What you're looking for:
- **High traffic to /signup, no signups** → form/flow broken. Check for blocked events, validation errors, or recent regressions.
- **High traffic to /pricing, low traffic to /signup** → pricing page CTA broken or unconvincing.
- **Low traffic to /signup overall** → distribution problem (people not finding us).

### Action ladder

| If… | Then… |
|---|---|
| Traffic OK to signup but no completions | Check signup_blocked + form_validation_failed events. Probably a regression. |
| Traffic OK to pricing, low to signup | Test /pricing → /signup flow manually. Is the founding-member CTA working? |
| Traffic low across the board | Distribution problem. Activate cold-send (cron is already scheduled). Consider manual SNS reposting of strongest assets (operator-side action). |
| Mixed | Run the conversion funnel SQL — pageview → form_field_focused → signup_form_submitted → signup_completed. Find the leak. |

### What NOT to do
- Don't immediately blame "the market" — diagnose the funnel first.
- Don't add new channels before fixing the existing leak. A leaky bucket loses water from every new tap.

---

## Trigger 6: `⚠ /demo visitors < 25/wk despite home CTA promotion`

**What it means**: We promoted /demo from tertiary link to btn-outline CTA on 2026-05-16 expecting traffic lift to 25+ unique/week. If still <25 after 7+ days, the CTA isn't pulling.

### Diagnostic (5 min)

```sql
-- Where do /demo visitors arrive from?
SELECT
  referrer, COUNT(DISTINCT distinct_id) AS visitors
FROM practiq.analytics_events
WHERE type = '$pageview'
  AND url LIKE '%/demo%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY referrer
ORDER BY visitors DESC;
```

If most /demo visitors come from referrer = `https://practiq.dev/` then the CTA IS working. If referrers are external or null, the CTA didn't drive the visits.

### Action ladder

| If… | Then… |
|---|---|
| /demo traffic mostly from practiq.dev/ | CTA works. Demo conversion is the next funnel — what % of /demo visitors sign up? If <5%, the demo workspace itself doesn't sell. |
| /demo traffic from external | The CTA didn't matter — these visitors found /demo independently. Either the CTA is invisible or the homepage flow doesn't push to it. |
| /demo traffic mostly bots (filtered) | Already filtered out. Real /demo traffic still <25 means low intent or low homepage traffic. |

---

## Trigger 7 (escalated): `🚨 1+ real signup` or `🎉 1+ real paid`

These are 🚨 / 🎉 — NOT ⚠. They break observation mode. See:
- `first-real-signup.md`
- `first-real-payment.md`

---

## General principle

**The pulse fires ⚠ as a signal to investigate, not as an emergency to fix.** Investigate within 24h. Decide within 72h. Don't make code changes the same day you see the warning — give yourself one cycle of observation to confirm the pattern is real.

The only ⚠ that requires same-day action is **Trigger 1 if a SERP regression is happening** (e.g., a page that was on page 1 last week is now page 3-4 — that suggests a Google penalty or content de-indexing, which compounds fast).

---

## When to update this playbook

After each ⚠ trigger response:
1. Log the trigger + your diagnostic + action taken to `.cycle/decisions.md`
2. If the action worked, note it here under the relevant trigger
3. If the action didn't work, update the action ladder to remove that step

*This playbook compounds in value as we accumulate trigger responses.*
