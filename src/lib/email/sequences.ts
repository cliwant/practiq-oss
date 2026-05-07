/**
 * Lifecycle email sequences (Tier 4 — retention).
 *
 * Triggered against `signup_completed`. Welcome fires immediately from
 * the signup route; Day 3 / 7 / 14 fire from the
 * `/api/cron/email-sequence-tick` daily cron (04:00 UTC).
 *
 * Idempotency: each step logs a `sequence_email_sent` event with
 * `{ step, user_id }` in `properties`. The cron checks for absence of
 * that event before sending, so a duplicate run is a no-op.
 *
 * Gating:
 *   - Day 3:  send only if user has 0 `feature_used` events
 *   - Day 7:  always send
 *   - Day 14: send only if user has < 5 distinct session events
 *             (lightweight engagement proxy = pageview count < 5)
 *
 * The gating heuristics fall back to "send" when telemetry is missing,
 * because not-sending is a worse failure mode than a slightly off-target
 * send for retention emails.
 */

import { renderEmail } from "./layout";
import { getSiteUrl } from "./client";

export type SequenceStep = "welcome" | "day3" | "day7" | "day14";

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

1. Upload your first engagement letter — the agent extracts key dates, scope, and counterparties automatically.
2. Run a workflow — pick "Monthly Close Prep" or whichever fits your practice. The agent drafts; you approve.
3. Invite a colleague — shared client memory means whoever picks up a matter already has the history.

Hit reply if you get stuck. A real person reads every reply.`,
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
    footer: `Reply with one thing your firm's week looks like and I'll point you at the workflow that fits.`,
  });
}

/**
 * Day 7 — feedback ask + value-prop reinforcement. Always sent.
 *
 * The three value props (redlined Word docs, citation grounding,
 * multi-client workspace) come from the Mike-research customer
 * interviews and are the reasons boutique firms tell us they switched.
 */
export function day7Email(user: SequenceUser) {
  const site = getSiteUrl();
  const greeting = user.firstName ? `Hi ${user.firstName},` : "Hi,";

  return renderEmail({
    subject: `How is your first week with Practiq going?`,
    preheader: "One reply tells us where to invest next.",
    intro: `${greeting} you've been using Practiq for a week. I'd love to hear how it's going — even one sentence is enough.`,
    cta: {
      label: "Share feedback",
      href: `${site}/app/settings?tab=feedback`,
    },
    body: `In particular, the firms that stick with Practiq tell us the three things that hooked them are:

• Redlined Word docs — the agent ships .docx with tracked changes, not chat snippets.
• Citation grounding — every claim points back to source documents in the workspace.
• Multi-client workspace — flip between clients and the agent already knows the file.

If one of those clicked for you (or didn't), reply and tell me. If something is frustrating you, especially reply — we ship fixes weekly.`,
    footer: `Practiq is built by a small team. Your feedback directly shapes the next sprint.`,
  });
}

/**
 * Day 14 — graceful re-engagement / unsubscribe nudge. Sent only if user
 * has < 5 session events (the cron uses the page-view count as the
 * proxy). Honest and short — better to lose someone cleanly than churn
 * them with passive-aggressive nags.
 */
export function day14Email(user: SequenceUser) {
  const site = getSiteUrl();
  const greeting = user.firstName ? `Hi ${user.firstName},` : "Hi,";

  return renderEmail({
    subject: `Should we still be in your inbox?`,
    preheader:
      "Two weeks in and you haven't been back. We'd rather know than nag.",
    intro: `${greeting} two weeks ago you signed up for Practiq and haven't returned. That's useful signal for us — if it's not the right fit right now, we'd rather know than fill your inbox.`,
    cta: {
      label: "Come back to Practiq",
      href: `${site}/app`,
    },
    body: `If life just got busy, the workspace is still there. One click and the agent picks up where you left off.

If Practiq isn't the right tool for you right now, just hit reply with a single word — "skip" — and we'll stop the lifecycle emails. No hard feelings; we'll keep the account so you can come back later.`,
    footer: `Honest software, honest emails. Reply "skip" to mute.`,
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
};
