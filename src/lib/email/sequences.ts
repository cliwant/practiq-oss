/**
 * Lifecycle email sequences (Tier 4 — onboarding / founding-member drip).
 *
 * Implements wave-4-plan P7-01 (5-email drip):
 *   welcome (Day 0) → tour (Day 3) → first-success (Day 7)
 *   → upgrade-soft (Day 14) → upgrade-hard (Day 21)
 *
 * Triggered against `signup_completed`. Welcome fires immediately from
 * the signup route; Day 3 / 7 / 14 / 21 fire from the
 * `/api/cron/email-sequence-tick` daily cron (04:00 UTC).
 *
 * Idempotency: each step logs a `sequence_email_sent` event with
 * `{ step, user_id }` in `properties`. The cron checks for absence of
 * that event before sending, so a duplicate run is a no-op.
 *
 * Gating:
 *   - Day 3 (tour):           send only if user has 0 `workflow_started` events
 *   - Day 7 (first-success):  always send (modulo idempotency)
 *   - Day 14 (upgrade-soft):  always send (modulo idempotency)
 *   - Day 21 (upgrade-hard):  always send (modulo idempotency)
 *
 * The gating heuristics fall back to "send" when telemetry is missing,
 * because not-sending is a worse failure mode than a slightly off-target
 * send for retention emails.
 */

import { renderEmail } from "./layout";
import { getSiteUrl } from "./client";

/**
 * Single source of truth for the operator signature on every
 * transactional email. Confirmed identity (2026-05-08):
 *   - Seungdo Keum, Founder
 *   - Practiq · operated by Cliwant Inc. (법인명, 변경 불가)
 *   - seungdo.keum@practiq.dev (Google Workspace alias,
 *     DKIM/DMARC PASS verified)
 *
 * If the operator's title, company, or email changes, change it here
 * once and every transactional template picks it up. Cold-email and
 * trade-press templates live in .cycle/marketing/* and have their
 * own signature blocks tuned for their respective tones.
 */
const SIGNATURE_HTML = `
<p style="margin-top: 32px; font-size: 14px; color: #555; line-height: 1.5;">
  Best,<br>
  <strong>Seungdo Keum</strong><br>
  Founder, Practiq · Cliwant<br>
  <a href="mailto:seungdo.keum@practiq.dev" style="color: #2563eb;">seungdo.keum@practiq.dev</a> ·
  <a href="https://practiq.dev" style="color: #2563eb;">practiq.dev</a><br>
  <em style="color: #888;">Building AI-Native Agent for boutique professional services</em>
</p>
`;

const SIGNATURE_TEXT = `Best,
Seungdo Keum
Founder, Practiq · Cliwant
seungdo.keum@practiq.dev · https://practiq.dev
Building AI-Native Agent for boutique professional services`;

export type SequenceStep = "welcome" | "day3" | "day7" | "day14" | "day21";

export interface SequenceUser {
  id: string;
  email: string;
  /** First name extracted at signup time (or empty string). */
  firstName: string;
  /** Vertical slug — accounting | law | consulting | hr | agency | advisory | other. */
  firmVertical?: string | null;
}

// Map vertical → most-relevant flagship workflow. When vertical is null
// we default to monthly-close-prep (the canonical accounting flow), which
// is also the broadest fit for unknown professional-services firms.
const WORKFLOW_BY_VERTICAL: Record<string, { id: string; label: string }> = {
  accounting: { id: "monthly-close-prep", label: "Monthly Close Prep" },
  law: { id: "matter-intake", label: "Matter Intake" },
  consulting: { id: "engagement-letter", label: "Engagement Letter" },
  hr: { id: "client-onboarding", label: "Client Onboarding" },
  agency: { id: "creative-brief", label: "Creative Brief" },
  advisory: { id: "quarterly-review", label: "Quarterly Review" },
  other: { id: "monthly-close-prep", label: "Monthly Close Prep" },
};

function workflowFor(vertical?: string | null) {
  if (!vertical) return WORKFLOW_BY_VERTICAL.accounting;
  return (
    WORKFLOW_BY_VERTICAL[vertical] ?? WORKFLOW_BY_VERTICAL.accounting
  );
}

/**
 * Welcome-back — fires when someone tries to sign up with an email that
 * already has an account. The signup endpoint returns the same generic
 * 200 response either way (to prevent user enumeration), and existing
 * users get this email pointing them at /login. New users get
 * welcomeEmail() below. From the network observer's perspective the two
 * paths are indistinguishable.
 */
export function welcomeBackEmail(user: SequenceUser) {
  const site = getSiteUrl();
  const greeting = user.firstName ? `Hi ${user.firstName},` : "Hi,";

  return renderEmail({
    subject: `Welcome back to Practiq — sign in here`,
    preheader:
      "Looks like you already have a Practiq account. Sign in to pick up where you left off.",
    intro: `${greeting} you (or someone using your email) just tried to create a Practiq account, but an account already exists for this address.`,
    cta: {
      label: "Sign in to Practiq",
      href: `${site}/login`,
    },
    body: `If that was you, sign in above to get back into your workspace.

If you've forgotten your password, use the "Forgot password" link on the sign-in page and we'll send a reset link.

If this wasn't you, you can safely ignore this email — no changes were made to your account.`,
    signature: SIGNATURE_HTML,
    signatureText: SIGNATURE_TEXT,
    footer: `You received this because someone tried to sign up with this email at ${site}.`,
  });
}

/**
 * Welcome — fires immediately on signup_completed.
 *
 * Subject keeps the boutique-firm hook visible in the inbox preview;
 * body anchors three concrete first-day actions so an empty workspace
 * doesn't feel paralyzing. The /app/tasks "open Practiq" CTA is the
 * one we measured the real signup hitting on Day 0 — sending them
 * back to the same place is correct.
 */
export function welcomeEmail(user: SequenceUser) {
  const site = getSiteUrl();
  const greeting = user.firstName ? `, ${user.firstName}` : "";

  return renderEmail({
    subject: `Welcome to Practiq${greeting} — built for boutique firms`,
    preheader:
      "Your client-centric AI workspace is ready. Three quick wins inside.",
    intro: `Welcome to Practiq. Every client gets their own workspace, and the agent primes itself with that client's context — so you stop re-briefing the AI on every switch.`,
    cta: {
      label: "Open Practiq",
      href: `${site}/app`,
    },
    body: `Three things to try in your first 10 minutes:

1. Upload your first engagement letter — the agent extracts key dates, scope, and counterparties automatically. No real letter handy? Grab a sample: ${site}/samples/sample-engagement-letter-cpa.docx
2. Run a workflow — pick "Monthly Close Prep" or whichever fits your practice. The agent drafts; you approve. ${site}/app/workflows
3. Invite a colleague — shared client memory means whoever picks up a matter already has the history.

Hit reply if you get stuck. A real person reads every reply.`,
    signature: SIGNATURE_HTML,
    signatureText: SIGNATURE_TEXT,
    footer: `You received this because you signed up at ${site}. We never share your email.`,
  });
}

/**
 * Day 3 — workflow nudge. Only sent if user has 0 `feature_used` events
 * (gating in the cron). Picks the workflow that matches their stated
 * vertical at signup; defaults to monthly-close-prep.
 */
export function day3Email(user: SequenceUser) {
  const site = getSiteUrl();
  const wf = workflowFor(user.firmVertical);
  const firmType = user.firmVertical
    ? `${user.firmVertical} firms`
    : "your firm";

  return renderEmail({
    subject: `Quick win for ${firmType}`,
    preheader: `Run the ${wf.label} workflow — the agent drafts, you approve.`,
    intro: `You signed up three days ago and haven't run a workflow yet. The fastest way to feel the difference is to run the one that matches your week's most-repeated motion.`,
    cta: {
      label: `Try the ${wf.label} workflow`,
      href: `${site}/app/workflows`,
    },
    body: `Pick a real client (any one). The agent will pull together the brief, draft the deliverable, and stop at the approval step — exactly the boring 80% of the work, automated.

If "${wf.label}" isn't the right starting point, every other workflow is one click away from the same screen.`,
    signature: SIGNATURE_HTML,
    signatureText: SIGNATURE_TEXT,
    footer: `Reply with one thing your firm's week looks like and I'll point you at the workflow that fits.`,
  });
}

/**
 * Day 7 — first-success. Points the user back at the workflow they tried
 * (or guides them to one if they haven't started yet) and surfaces the
 * three concrete wins boutique firms tell us hooked them. Always sent
 * (modulo idempotency) — the goal is to anchor a "this is what success
 * with Practiq looks like" moment in the first week.
 *
 * The three value props (redlined Word docs, citation grounding,
 * multi-client workspace) come from the Mike-research customer
 * interviews and are the reasons boutique firms tell us they switched.
 */
export function day7Email(user: SequenceUser) {
  const site = getSiteUrl();
  const greeting = user.firstName ? `Hi ${user.firstName},` : "Hi,";
  const wf = workflowFor(user.firmVertical);

  return renderEmail({
    subject: `Your first real win with Practiq`,
    preheader: "Three concrete things to ship this week with the agent.",
    intro: `${greeting} a week in, the firms that get the most out of Practiq have all hit one specific milestone: they shipped a real deliverable the agent drafted, not just a chat answer.`,
    cta: {
      label: `Open the ${wf.label} workflow`,
      href: `${site}/app/workflows`,
    },
    body: `If you've already run a workflow, the next move is to ship the .docx — the agent's draft is meant to be redlined and sent, not parked in the workspace.

If you haven't yet, "${wf.label}" is the fastest path to your first real win. Pick any client, click run, and you'll have a draft in under a minute.

The three things that make this stick for boutique firms:

• Redlined Word docs — the agent ships .docx with tracked changes, ready for partner review.
• Citation grounding — every claim points back to source documents in the workspace, so review is fast.
• Multi-client workspace — flip between clients and the agent already knows the file. No re-briefing.

Reply with the workflow you ran (or got stuck on) and I'll tell you the next one your firm should automate.`,
    signature: SIGNATURE_HTML,
    signatureText: SIGNATURE_TEXT,
    footer: `Practiq is built by a small team. Your feedback directly shapes the next sprint.`,
  });
}

/**
 * Day 14 — upgrade-soft. Gentle introduction of the founding-member
 * pricing window for users who have been around for two weeks. Frames
 * the upgrade as locking in pricing rather than a hard ask — the closer
 * comes at Day 21.
 */
export function day14Email(user: SequenceUser) {
  const site = getSiteUrl();
  const greeting = user.firstName ? `Hi ${user.firstName},` : "Hi,";

  return renderEmail({
    subject: `Founding-member pricing is still open for you`,
    preheader:
      "Two weeks in. The first 50 firms lock $10/client/month for life — your spot is reserved.",
    intro: `${greeting} you've been using Practiq for two weeks. If the workspace is starting to fit, this is a fair time to flag what Founding Member status actually means.`,
    cta: {
      label: "See founding-member pricing",
      href: `${site}/pricing`,
    },
    body: `The first 50 firms that upgrade lock in $10 per client per month for life — 33% off the $15/client/month standard rate, forever. Not a launch-week promo. Even after public launch, even after price increases.

Why limited to 50? Because serving the first 50 firms well takes real founder attention. We can't do that for 500.

You're already inside Practiq, so the only thing to do is decide whether your firm's workflow is now living here. If it is, the founding-member slot is yours for the asking.

No rush this week — just want to make sure you knew it was on the table while it still is.`,
    signature: SIGNATURE_HTML,
    signatureText: SIGNATURE_TEXT,
    footer: `Reply with any pricing questions. A real person reads every reply.`,
  });
}

/**
 * Day 21 — upgrade-hard. Final push in the onboarding drip. Reframes
 * the founding-member slot as a closing window (real scarcity tied to
 * the cap of 50 firms) and asks for an explicit decision. Honest tone
 * — better to lose a no than nag forever.
 */
export function day21Email(user: SequenceUser) {
  const site = getSiteUrl();
  const greeting = user.firstName ? `Hi ${user.firstName},` : "Hi,";

  return renderEmail({
    subject: `Last note on your Practiq founding-member slot`,
    preheader:
      "Three weeks in. Time to decide whether to lock in the $10/client/month lifetime rate.",
    intro: `${greeting} three weeks since you signed up. This is the last scheduled note from me about the founding-member slot — after this I stop sending the onboarding drip and we go back to product news only when there's something real to share.`,
    cta: {
      label: "Lock in founding-member pricing",
      href: `${site}/pricing`,
    },
    body: `Two ways this can go from here.

1. You upgrade now. Founding-member rate is $10 per client per month (33% off the $15/client/month standard), locked for life, capped at the first 50 firms, and Practiq stops being one of N tools on your stack. You also get a direct line to me for roadmap requests.

2. You stay on the current plan. That's a fine answer — keep using Practiq, the workspace isn't going anywhere, and you can upgrade later (at whatever the public price is by then).

What I'd recommend against: leaving the decision in limbo for another month. The founding-member window closes when slot 50 is taken, not on a calendar date, and the last few have been going faster than I expected.

If you want to talk it through instead of clicking through pricing, hit reply with two windows that work this week.`,
    signature: SIGNATURE_HTML,
    signatureText: SIGNATURE_TEXT,
    footer: `This is the final onboarding email. Future messages come only when there's product news worth your inbox.`,
  });
}

/**
 * Convenience map for the cron. Keep keys in sync with `SequenceStep`.
 */
export const SEQUENCE_BUILDERS: Record<
  SequenceStep,
  (user: SequenceUser) => ReturnType<typeof renderEmail>
> = {
  welcome: welcomeEmail,
  day3: day3Email,
  day7: day7Email,
  day14: day14Email,
  day21: day21Email,
};
