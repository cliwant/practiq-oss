# Playbook — First Real Prospect Signup

**Trigger**: Slack alert `🚨 REAL PROSPECT — Practiq 신규 가입` with `<!here>` mention.

**Why this playbook matters**: As of 2026-05-17 we've had **1 real prospect signup in 30 days** (anonymousjc59@gmail.com on 2026-05-04). The next one is data of inestimable value. **Default automation will not extract the value — you need to act personally within hours.**

What "real" means: the Slack header reads `🚨 REAL PROSPECT`, not `(test)`. The gate filters operator/test emails (`@grindworks.ai`, `@practiq.dev`, `+e2e-`, `smoke-test*`, etc.) so anything that hits this playbook is genuinely external.

---

## Within 30 minutes of the alert

### 1. Verify with eyes (2 min)

Open the Slack message. Click `관리자에서 보기` link → `/admin?user={userId}`.

Quick sanity checks:
- Email domain — does it look like a real business address?
- Firm name — non-empty? Generic ("Test") or specific ("Park Accounting")?
- Vertical — was a vertical selected (accounting/law/hr/consulting/agency) or null?
- Provider — credentials (email/password) or Google OAuth?

If anything reads "still feels like a test" (e.g. domain is a free webmail + firm name is "asdf"), drop a note in the team Slack and continue but treat with skepticism.

### 2. Pull attribution (3 min)

```sql
-- Run via Supabase SQL editor or `npm run pulse` repurpose
SELECT
  first_touch_referrer, first_touch_landing_page,
  first_touch_utm_source, first_touch_utm_medium, first_touch_utm_campaign,
  url, referrer, created_at
FROM practiq.analytics_events
WHERE user_id = '{userId}'
ORDER BY created_at ASC
LIMIT 30;
```

**What you're looking for**:
- First-touch source: Google search? Reddit? cold email reply? a /vs/* page?
- Landing page that pulled them in
- Time from first hit → signup (immediate = strong intent; days = nurtured)
- What pages they visited before signing up (signal of what convinced them)

### 3. Check what they did after signing up (5 min)

```sql
SELECT type, url, created_at, properties
FROM practiq.analytics_events
WHERE user_id = '{userId}' AND created_at > (SELECT created_at FROM practiq.users WHERE id = '{userId}')
ORDER BY created_at ASC LIMIT 50;
```

**Signal hierarchy**:
- `first_client_created` → they're trying it. Highest signal.
- `first_chat_message_sent` → they're engaging the AI.
- `client_workspace_opened` → they're exploring.
- `approval_queue_opened` → they understand the value prop.
- Just pageviews → they signed up to look around. Lower signal but still worth outreach.

### 4. Personal welcome (15 min)

**From your own email** (not `hello@practiq.dev` automated). Subject: short, no "Welcome to" boilerplate.

Template (tune by vertical):

```
Subject: about your Practiq signup — quick question

Hey [first name],

I'm Seungdo — I built Practiq. I saw you signed up [N hours] ago.

I'm curious what brought you here. Was it the [first-touch
landing page they hit, e.g. "TaxDome vs Karbon vs Canopy
comparison"] or something else?

Also happy to give you a personal 20-min walkthrough if useful
— I'm trying to learn what actually works for folks in [their
vertical] before we open this up wider. No sales pitch.

— Seungdo
```

**Why this template works**:
- Founder-personal, not marketing
- Asks for information (their motivation) before giving anything
- Offers value (walkthrough) without pressure
- Acknowledges they did the work to sign up

### 5. Pin them in a tracker (5 min)

Add to `.cycle/research/first-prospects.md` (create if missing):

```markdown
## {Date} — {firmName} ({email})
- Vertical: {accounting|law|hr|consulting|agency}
- First touch: {landing page} from {referrer}
- Sign-up provider: {credentials|google}
- Behaviour: {created N clients, sent N chat messages, etc.}
- Outreach: sent {timestamp}
- Response: pending
- Notes:
```

This is the seed of your design-partner CRM. You'll add to it every time.

---

## Within 24 hours

### If they responded to your email
- Schedule the 20-min call. Same day if possible, max 48h.
- On the call: 80% listening. Ask about their current workflow, what made them try Practiq, what they hoped it would do.
- Don't pitch. Don't demo unless asked. **Their words become your marketing copy.**
- Within 1 hour of the call, write a 200-word summary to `.cycle/research/conversations/{date}-{firmName}.md`.

### If they didn't respond
- Check their activity: did they keep using the product?
- If yes: send a *second* light-touch email asking about a specific feature they used
- If no: one more attempt at the 24h mark, then let it rest 7 days

### Specifically watch for
- Are they trying to invite teammates? If yes → engaged
- Are they adding multiple clients? If yes → adoption signal
- Are they hitting plan-gate / quota errors? If yes → reach out with a token-budget bump as a goodwill gesture

---

## Within 72 hours

### Founding member outreach (if not already)
If they signed up but did NOT enter the founding-member flow (`/signup?plan=founding_member` or via /pricing → founding tier), send:

```
Subject: founding member spot is yours if you want it

Hey [first name],

You're one of the first ~5 firms to try Practiq. I'm holding
50 founding-member spots at $10/client/month for life (vs.
$15 standard) — locked at that price forever for those who
sign on now.

If your firm has 30-100 clients, this is a meaningful
difference. Want me to send you the founding pricing checkout
link directly? No pressure either way.

— Seungdo
```

### Case-study seed (if they're active)
After 7 days of activity, ask if they'd be open to a 30-min recorded call about their workflow. Frame as research, not marketing. Their permission to use quotes is the asset.

---

## What NOT to do

- ❌ Don't auto-send a welcome sequence in addition to your personal email. They'll get the operator email and the "Day 0 welcome" automation, which makes you look spammy.
  - Actually we already filter this — the practiq_signup auto sequence is paused for the first 20 real users. Verify in `src/lib/email/sequences.ts`.
- ❌ Don't pitch features that don't exist. Note what they asked for, build what's repeated.
- ❌ Don't ask for testimonials/referrals in week 1.
- ❌ Don't add them to general marketing email lists.
- ❌ Don't reveal they're "one of the first" until 7 days in — it can feel intimidating.

---

## Decision tree if they go silent

After your initial outreach + 48h:

| Signal | Action |
|---|---|
| Product usage continuing, no email reply | Wait. Send "anything I can help with?" at day 7. |
| Product usage stopped, no email reply | Send "what made you stop?" candid ask at day 5. |
| Product usage stopped, email replied "tried it, not for us" | Ask why. The honest answer is the most valuable artifact you'll get this month. |
| Total silence + product usage stopped | Add to research log as "lapsed". One more honest email at day 14 max. |

---

## Quick reference — Slack alert → first action map

| Alert | First action (within 30 min) |
|---|---|
| `🚨 REAL PROSPECT signup` | Personal welcome email from operator address |
| `🎯 REAL PROSPECT audit complete` | Read their audit answers, reply with one specific observation |
| `📄 REAL PROSPECT policy generated` | Email asking about their compliance program, offer a deeper look |
| `🎉 FIRST REAL PAYMENT` | See `first-real-payment.md` — different playbook |

---

*This playbook is alive. Update it after each real signup with what worked / didn't.*
