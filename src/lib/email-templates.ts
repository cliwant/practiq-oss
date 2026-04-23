/**
 * Email nurture sequence templates for waitlist signups.
 *
 * Flow:
 *   Day 0 (immediate)  — Welcome + what to expect
 *   Day 3              — Problem deep-dive (context switching cost)
 *   Day 7              — Founding Member details (50% off for life)
 *   Day 14             — One concrete customer-like story (anonymized)
 *   Day 21             — "We're close to launch" + ask for 15-min intro call
 *   Day 30             — Thank-you + what's coming
 *
 * Vertical-aware: each template receives { email, vertical, firstName? }
 * and returns { subject, html, text }.
 *
 * Used by /api/cron/email-nurture which runs daily and sends emails at the
 * right Days-Since-Signup offset per recipient.
 */

export type VerticalSlug =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "marketing"
  | "agency"
  | "other"
  | "unknown";

export interface NurtureRecipient {
  email: string;
  vertical: VerticalSlug;
  firstName?: string | null;
  signedUpAt: Date;
}

export interface NurtureEmail {
  subject: string;
  html: string;
  text: string;
}

const VERTICAL_LABEL: Record<VerticalSlug, string> = {
  accounting: "accounting/tax firm",
  law: "law firm",
  hr: "HR advisory firm",
  consulting: "consulting firm",
  marketing: "agency",
  agency: "agency",
  other: "professional services firm",
  unknown: "firm",
};

const VERTICAL_PAIN: Record<VerticalSlug, string> = {
  accounting:
    "clients' QuickBooks tabs stacking up, tax deadlines compressing into hours, and context switching eating hours daily",
  law:
    "active matters piling up, client context living in partners' heads, and associate ramp-up taking 6-8 weeks",
  hr:
    "advisor context getting lost across 20+ client companies, state compliance creeping up, and institutional knowledge disappearing when advisors take vacation",
  consulting:
    "engagement context living in scattered Notion pages, senior consultants becoming bottlenecks, and deliverable quality varying by who prepared them",
  marketing:
    "client brand guidelines getting mixed up, campaign history forgotten, and account managers missing client-specific preferences",
  agency:
    "client brand guidelines getting mixed up, campaign history forgotten, and account managers missing client-specific preferences",
  other:
    "client context lost at scale, deliverable preparation eating hours, and team institutional knowledge disappearing",
  unknown:
    "client context lost at scale, deliverable preparation eating hours, and team institutional knowledge disappearing",
};

const FOOTER_HTML = `
<p style="color:#999;font-size:11px;margin-top:32px;line-height:1.6">
  You are receiving this because you joined the Practiq early access waitlist at
  <a href="https://practiq.dev" style="color:#999">practiq.dev</a>. Reply to this
  email any time — a real person reads every reply.<br/>
  Practiq · Built by Cliwant, Inc. · 1111b South Governors Ave STE 93589, Dover, DE 19904<br/>
  <a href="https://practiq.dev/unsubscribe" style="color:#999">Unsubscribe</a>
</p>`;

const FOOTER_TEXT = `

--
You are receiving this because you joined the Practiq early access waitlist.
Reply to this email any time — a real person reads every reply.
Practiq · 1111b South Governors Ave STE 93589, Dover, DE 19904
Unsubscribe: https://practiq.dev/unsubscribe`;

// ── Day 0: Welcome ──────────────────────────────────────────────────────

export function day0Welcome(r: NurtureRecipient): NurtureEmail {
  const label = VERTICAL_LABEL[r.vertical] ?? "firm";
  const greeting = r.firstName ? `Hi ${r.firstName},` : "Hi there,";

  const subject = "You're on the Practiq early access list";
  const html = `
<p>${greeting}</p>
<p>Welcome. You're on the Practiq early access list.</p>
<p>What happens next:</p>
<ul>
  <li><strong>No inbox flood.</strong> Six emails total over the next 30 days, with useful context — not sales drips.</li>
  <li><strong>Founding Member pricing.</strong> First 50 firms lock in 50% off for life. I'll tell you your position in a later email.</li>
  <li><strong>Early access invites go out in waves.</strong> You'll hear from me directly when your ${label} gets an invite.</li>
</ul>
<p>If your situation is urgent — you're currently drowning in client management and want to talk now — reply to this email. I'll set up a 15-minute call this week.</p>
<p>— SD<br/>Founder, Practiq</p>
${FOOTER_HTML}`;

  const text = `${greeting}

Welcome. You're on the Practiq early access list.

What happens next:
- No inbox flood. Six emails total over the next 30 days, with useful context.
- Founding Member pricing. First 50 firms lock in 50% off for life.
- Early access invites go out in waves — you'll hear from me when your ${label} gets an invite.

If your situation is urgent and you want to talk now, reply to this email.

— SD
Founder, Practiq${FOOTER_TEXT}`;

  return { subject, html, text };
}

// ── Day 3: Problem deep-dive ────────────────────────────────────────────

export function day3Problem(r: NurtureRecipient): NurtureEmail {
  const greeting = r.firstName ? `Hi ${r.firstName},` : "Hi,";
  const pain = VERTICAL_PAIN[r.vertical];
  const label = VERTICAL_LABEL[r.vertical] ?? "firm";

  const subject = "Why your ${label} plateaus at 50 clients (it isn't capacity)";
  const html = `
<p>${greeting}</p>
<p>I talk with founders of 2-10 person ${label}s almost every day, and one pattern keeps showing up:</p>
<p>Firms plateau at 50-75 clients per partner. Not because there isn't more work to take. Because holding context on 50+ client situations exceeds what any human brain can do — you start missing things, forgetting specifics, and quality slips.</p>
<p>For ${label}s this shows up specifically as ${pain}.</p>
<p>Research from the AICPA quantifies this for accounting firms: ~$170K per year per partner lost to context switching. The number holds roughly for other professional services too.</p>
<p>That's the problem Practiq exists to solve — not by adding more dashboards, but by holding the context that used to live in partners' heads outside of their heads.</p>
<p>I'd love to know: is this the right description of what you're experiencing? Or is your bottleneck somewhere else entirely? Reply any time.</p>
<p>— SD</p>
${FOOTER_HTML}`;

  const text = `${greeting}

I talk with founders of 2-10 person ${label}s almost every day, and one pattern keeps showing up:

Firms plateau at 50-75 clients per partner. Not because there isn't more work to take. Because holding context on 50+ client situations exceeds what any human brain can do.

For ${label}s this shows up as ${pain}.

Research from AICPA quantifies this for accounting firms: ~$170K/year/partner lost to context switching. The number holds roughly for other professional services.

Is this the right description of what you're experiencing? Or is your bottleneck somewhere else? Reply any time.

— SD${FOOTER_TEXT}`;

  return { subject: subject.replace("${label}", label), html, text };
}

// ── Day 7: Founding Member ──────────────────────────────────────────────

export function day7FoundingMember(r: NurtureRecipient): NurtureEmail {
  const greeting = r.firstName ? `Hi ${r.firstName},` : "Hi,";
  const subject = "Your Founding Member spot (and why it matters)";
  const html = `
<p>${greeting}</p>
<p>A quick update on Founding Member status, since it matters if you're planning to use Practiq:</p>
<p><strong>First 50 firms lock in 50% off for life.</strong></p>
<p>This isn't a launch-week promo. It's permanent. Founding Member pricing stays at 50% off, even after public launch, even after price increases, even forever.</p>
<p>Why limited to 50? Because serving our first 50 firms well requires direct founder attention. We can't do that for 500. So the first 50 get real attention, real pricing, and real input into the product roadmap.</p>
<p>If the Practiq concept ends up mattering for your firm, this is the moment to secure that pricing. You're already on the list, so your spot is reserved — just reply "in" if you want me to confirm your Founding Member position.</p>
<p>— SD</p>
${FOOTER_HTML}`;

  const text = `${greeting}

A quick update on Founding Member status:

First 50 firms lock in 50% off for life.

This isn't a launch-week promo. It's permanent. Founding Member pricing stays at 50% off, even after public launch.

Why limited to 50? Serving our first 50 firms well requires direct founder attention. We can't do that for 500.

If the Practiq concept ends up mattering for your firm, this is the moment to secure that pricing. You're already on the list — reply "in" if you want me to confirm your Founding Member position.

— SD${FOOTER_TEXT}`;

  return { subject, html, text };
}

// ── Day 14: Anonymized customer-like story ──────────────────────────────

export function day14Story(r: NurtureRecipient): NurtureEmail {
  const greeting = r.firstName ? `Hi ${r.firstName},` : "Hi,";
  const subject = "What a 3-partner accounting firm did about 120 client QuickBooks instances";
  const html = `
<p>${greeting}</p>
<p>Short story from a firm we talked with recently. Details anonymized.</p>
<p>A 3-partner CPA firm in the Midwest. 120 clients. Every morning, each partner opens 8-12 QuickBooks instances trying to catch up on what changed overnight. By 10 AM they've each burned 90 minutes just "checking in" before real work starts.</p>
<p>Multiply by 3 partners, 250 working days: <strong>~1,100 hours/year of pure context-reconstruction.</strong> At $200/hour billing, that's $220K of unbilled work.</p>
<p>The partners' fix wasn't hiring. Wasn't new practice management. It was a layer that scanned all 120 QuickBooks instances overnight and arrived with a 10-item priority queue. The 90-minute morning shrank to 10 minutes.</p>
<p>That's what Practiq does. The same pattern works for law firms with 50+ matters, HR advisors with 20+ clients, consulting firms with 15+ engagements, agencies with 20+ accounts.</p>
<p>Whether Practiq is the right tool for your firm depends on whether this pattern fits your bottleneck. If it does — reply and I'll set up 15 minutes.</p>
<p>— SD</p>
${FOOTER_HTML}`;

  const text = `${greeting}

Short story from a firm we talked with recently. Details anonymized.

A 3-partner CPA firm. 120 clients. Every morning each partner opens 8-12 QuickBooks instances catching up on what changed overnight. By 10 AM each has burned 90 minutes before real work starts.

Multiply by 3 partners, 250 days: ~1,100 hours/year of pure context reconstruction. At $200/hr billing: $220K of unbilled work.

Their fix wasn't hiring. Wasn't new practice management. It was a layer that scanned all 120 QuickBooks overnight and arrived with a 10-item priority queue. 90 minutes became 10.

Same pattern works for law (50+ matters), HR (20+ clients), consulting (15+ engagements), agencies (20+ accounts).

If this pattern fits your bottleneck, reply and I'll set up 15 minutes.

— SD${FOOTER_TEXT}`;

  return { subject, html, text };
}

// ── Day 21: Invite to call ──────────────────────────────────────────────

export function day21CallInvite(r: NurtureRecipient): NurtureEmail {
  const greeting = r.firstName ? `Hi ${r.firstName},` : "Hi,";
  const label = VERTICAL_LABEL[r.vertical] ?? "firm";
  const subject = "15 minutes this week?";
  const html = `
<p>${greeting}</p>
<p>Three weeks since you joined the waitlist. We're close to opening early access invites for the first wave.</p>
<p>Before I send you an invite, I'd love 15 minutes to understand your specific situation — what you're using today, where it breaks, and what you'd want from Practiq.</p>
<p>This isn't a sales call. I don't have anything to sell you yet. I want to make sure our first wave of invites actually helps the firms in it.</p>
<p>If you're open to 15 minutes, reply with two or three windows that work for you this week. I'm in ET but flexible.</p>
<p>If this isn't the right time, no worries — I'll stay in touch as Practiq gets closer to public launch.</p>
<p>Either way, thank you for your patience.</p>
<p>— SD</p>
${FOOTER_HTML}`;

  const text = `${greeting}

Three weeks since you joined the waitlist. We're close to opening early access invites for the first wave.

Before I send you an invite, I'd love 15 minutes to understand your specific situation — what you're using today, where it breaks, what you'd want from Practiq.

Not a sales call. I want to make sure our first wave of invites actually helps the ${label}s in it.

If you're open to 15 minutes, reply with two or three windows that work for you this week. I'm in ET but flexible.

If this isn't the right time, no worries. I'll stay in touch.

— SD${FOOTER_TEXT}`;

  return { subject, html, text };
}

// ── Day 30: Thank you + what's coming ──────────────────────────────────

export function day30ThankYou(r: NurtureRecipient): NurtureEmail {
  const greeting = r.firstName ? `Hi ${r.firstName},` : "Hi,";
  const subject = "Thank you. Here's what's next for Practiq.";
  const html = `
<p>${greeting}</p>
<p>You've been on the Practiq waitlist for 30 days. This is my last scheduled email — future messages come only when there's something genuinely new to share.</p>
<p><strong>What's shipping in the next 60 days:</strong></p>
<ul>
  <li>First wave of early access invites for accounting and law firms</li>
  <li>QuickBooks, Clio, and BambooHR integrations</li>
  <li>Overnight AI scanning + morning priority queue</li>
  <li>Deliverable generation in firm voice (.docx, .xlsx)</li>
</ul>
<p><strong>What I need from you if Practiq might matter for your firm:</strong></p>
<p>Just reply. Say "keep me on the list" and you stay. Say "I want to talk now" and I'll reach out this week. Say "unsubscribe" and I'll take you off.</p>
<p>Either way — thank you for the first 30 days of patience. I'll be back with actual news, not more explanation.</p>
<p>— SD<br/>Founder, Practiq</p>
${FOOTER_HTML}`;

  const text = `${greeting}

You've been on the Practiq waitlist for 30 days. This is my last scheduled email.

Shipping in the next 60 days:
- First wave of early access invites for accounting and law firms
- QuickBooks, Clio, BambooHR integrations
- Overnight AI scanning + morning priority queue
- Deliverable generation in firm voice (.docx, .xlsx)

If Practiq might matter for your firm, just reply:
- "keep me on the list" — you stay
- "I want to talk now" — I reach out this week
- "unsubscribe" — I take you off

Thank you for the first 30 days.

— SD${FOOTER_TEXT}`;

  return { subject, html, text };
}

/**
 * Map day-since-signup to template generator.
 */
export const NURTURE_SCHEDULE: Record<number, (r: NurtureRecipient) => NurtureEmail> = {
  0: day0Welcome,
  3: day3Problem,
  7: day7FoundingMember,
  14: day14Story,
  21: day21CallInvite,
  30: day30ThankYou,
};

export function getEmailForDay(day: number, recipient: NurtureRecipient): NurtureEmail | null {
  const generator = NURTURE_SCHEDULE[day];
  return generator ? generator(recipient) : null;
}
