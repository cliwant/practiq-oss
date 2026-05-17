# Playbook — First Real Paid Customer

**Trigger**: Slack alert `🎉 FIRST REAL PAYMENT — Practiq 결제 성공` with `<!here>` mention.

**Why this playbook matters**: The first real paying customer is the single most important commercial event for Practiq's first year. Everything you do in their first 30 days disproportionately shapes:
- Whether they renew at month 2
- Whether they refer (boutique services firms talk to each other)
- Whether you have a case study to show prospect #2-10
- Whether you actually understand your ICP yet

Default automation gives them a welcome email and access. **You need to give them a relationship.**

---

## Within 1 hour of the alert

### 1. Verify in Stripe (3 min)

Click the Slack message's `Stripe에서 열기` link or open Stripe Dashboard directly.

Confirm:
- Subscription status = `active` (not `incomplete` or `past_due`)
- Payment method captured (card or other)
- Founding price applied? Check `unit_amount`: $10/client (founding) vs $15/client (standard)
- Quantity = number of clients they expect to add (usually 1-3 on first checkout)
- Email matches the user record in `practiq.users`

If anything looks off (e.g., subscription incomplete due to 3DS pending), wait 15 min and re-check. If still incomplete after 1 hour, reach out personally to confirm: "I noticed your payment didn't fully process — can I help?"

### 2. Pull their full history (5 min)

```sql
-- All their signal up to this point
SELECT
  type, url, properties, created_at
FROM practiq.analytics_events
WHERE user_id = (SELECT id FROM practiq.users WHERE email = '{their_email}')
ORDER BY created_at ASC
LIMIT 100;
```

**What you're building**: A 60-second mental model of who this person is and how they arrived.

Specifically:
- When did they sign up vs when did they pay? (Same day = strong intent; 7+ days = thoughtful)
- What did they do BEFORE paying? (Used /demo? Ran workflow-audit? Read 3+ blog posts?)
- Did they get blocked by anything? (plan_gate_blocked, signup_blocked events)
- First touch attribution — Google? Cold email? AEO citation? Direct?

### 3. Founder thank-you (within 1h) (10 min)

**From your personal email.** Short. No marketing copy.

```
Subject: thank you (and a small request)

Hey [first name],

I'm Seungdo — I built Practiq. You're literally our first
paying customer. Thank you.

A small request: can we get on a 30-min call this week? I want
to learn what made you decide to pay, walk through your setup,
and make sure your first 30 days are smooth. I'll be your direct
line for anything — feature requests, bugs, questions about
how to use it for [your firm name's specific work].

What times work for you in the next 3 days?

— Seungdo
```

**Why this template**:
- Acknowledges the moment (don't hide that they're first)
- Offers value (direct founder access)
- Asks for one specific thing (call) with one specific constraint (within 3 days)
- Doesn't oversell or apologize

### 4. Schedule the kickoff (within 1h)

If they reply with availability, lock it in immediately.

If they don't reply within 4 hours, send a Calendly-style link with 3-5 specific slots in the next 3 business days.

If they reply "I don't have time for a call right now":
- Don't push. Reply: "Totally understood. I'll keep watch on your usage — if anything breaks or feels off, just email me at [your direct address]. And I'll check back in 2 weeks."

---

## Day 0-7 — Onboarding done right

### Day 0 (payment day): Kickoff call (30 min)
If they agreed to a call, structure:

| Time | What you do |
|---|---|
| 0-5 min | Personal intro. Why Practiq exists. (Brief.) |
| 5-15 min | Listen. Ask: what's your firm like, how many clients, what's the current biggest pain. **Take notes.** |
| 15-25 min | Walk through the product live, on their actual data (have them share screen). Demo: adding a client, the overnight scan, the approval queue. |
| 25-30 min | Set 7-day check-in. Ask: what would have to be true at the end of 7 days for them to feel this was worth it? |

**Post-call action** (same day, 30 min):
- Write 300-word summary to `.cycle/research/conversations/{date}-{firm}-kickoff.md`
- Update `.cycle/research/design-partners.md` with their pinned context
- Drop notes into PostHog person profile (annotations on their distinct_id)

### Day 1-2: They add their first clients
Watch for:
- ✅ `first_client_created` event → great
- ⚠ `plan_gate_blocked` → reach out within 2 hours, offer help
- ❌ No events at all → drop a Slack note, send "anything I can help with?" email at end of day 2

### Day 3: Mid-week check-in
Short email:
```
Subject: how's it going?

Hey [name],

Day 3 check-in — anything that's surprised you (good or bad)?
Any features you're looking for that you can't find?

— Seungdo
```

If they reply with feature requests, log to `.cycle/research/feature-requests.md`. Don't promise anything specific yet.

### Day 7: Usage report + qualitative feedback
- Pull their analytics_events for the week
- Send them a short "your first week" summary:
  - X clients added
  - X chat messages sent
  - X documents prepared
  - First-impression observation from operator side
- Ask: "If we shut Practiq off tomorrow, what would you most miss?"

That last question is the most diagnostic 8 words you'll ask all year. The answer tells you what to double down on.

---

## Day 8-30 — Build the relationship

### Day 14: Renewal preview + testimonial seed

```
Subject: 2 weeks in — quick thought

Hey [name],

You're 2 weeks into Practiq. Quick thought from my side:
your renewal is on [date] at [$amount]. Founding pricing
($10/client/month) is locked for you for life — that's the
trade-off for being one of the first.

Two questions:
1. Anything that would make you pause on renewal?
2. If [their workflow benefit, specific] keeps working, would
   you be open to me using a quote from you on the site? No
   commitment, just asking.

— Seungdo
```

### Day 21: Network-effect ask
If they're happy and engaged:

```
Subject: anyone in your network I should talk to?

Hey [name],

You mentioned [specific peer-firm scenario from your call].
If you know anyone running a similar firm who might benefit,
I'd love an intro — happy to give them founding pricing if
it's a fit.

— Seungdo
```

### Day 30: Renewal + case study
Renewal happens automatically. Don't make a big deal of it.

If they renewed without issue, ask:
- 15-min recorded call to capture their story (will be used in marketing if they consent)
- Permission to quote them on the site by name (with their firm name)

If they didn't renew (rare, but possible):
- Same-day candid email: "I'd love to know what didn't work. No sales pitch, just honest feedback."
- The post-mortem is more valuable than the lost MRR.

---

## What NOT to do

- ❌ Don't onboard a paying customer via automated sequence only. They paid for relationship, not just product access.
- ❌ Don't pitch the credit pack add-on in week 1. Wait until they've exceeded included tokens at least once organically.
- ❌ Don't ask for a case study before day 14. They haven't formed an opinion yet.
- ❌ Don't introduce them to other "first customers" — peer comparisons are dangerous early.
- ❌ Don't promise features you might not ship. "We're considering that" is the upper bound of commitment.
- ❌ Don't disappear after day 30. Weekly check-ins for 90 days, then monthly.

---

## What "success" looks like at day 30

A first paying customer in good shape:
- Renewed without issue
- Used the product 5+ days in the month
- Added 5-30 clients
- Asked at least one specific feature question (signal of engagement)
- Replied to 3+ of your emails
- Willing to be quoted (or already quoted you back saying something useful)

If 4+ of these are true, you have a design partner. Protect that relationship — they're worth 100x their MRR.

---

## Quick reference — Stripe alert → first action

| Stripe event | Slack header | First action |
|---|---|---|
| `checkout.session.completed` + paid | `🎉 FIRST REAL PAYMENT` | This playbook, hour-1 |
| `invoice.paid` (monthly renewal) | `💰 Practiq 결제 성공` | If first renewal: separate light-touch "thank you" email |
| `invoice.payment_failed` | `billing_payment_failed` | See `trigger-warn-response.md` — payment-failure path |
| `customer.subscription.deleted` | `billing_subscription_canceled` | Same-day candid email asking why |

---

*Update this playbook after each paying customer with what worked / what was hard.*
