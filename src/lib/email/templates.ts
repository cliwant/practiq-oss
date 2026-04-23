import { renderEmail } from "./layout";
import { getSiteUrl } from "./client";

/**
 * Email templates — each exports a pure function that takes the input
 * variables and returns { subject, html, text }. Easy to unit-test;
 * easy to re-render in a Storybook-style preview later.
 */

// ── Welcome email ──────────────────────────────────────────────

export function welcomeEmail(input: {
  firstName: string;
  firmVertical?: string | null;
}) {
  const site = getSiteUrl();
  const verticalLine = input.firmVertical
    ? `We tune the agent a bit differently for ${labelForVertical(
        input.firmVertical,
      )} firms — you'll see that in the templates and the tone.`
    : "";

  return renderEmail({
    subject: `Welcome to Practiq${input.firstName ? `, ${input.firstName}` : ""}`,
    preheader: "Your client-centric AI workspace is ready.",
    intro: `You just created a workspace where every client has their own AI-primed context. No more re-briefing the AI every time you switch. ${verticalLine}`,
    cta: {
      label: "Open your workspace",
      href: `${site}/app`,
    },
    body: `A few suggested next steps:
1. Add your first client (name + industry is enough to start).
2. Upload a document for that client — the agent extracts key facts.
3. Run "Briefings now" to see what the agent surfaces overnight.

Hit reply if you get stuck. A real person reads every reply.`,
    footer: `You received this because you signed up at ${site}. We never share your email.`,
  });
}

// ── Team invite ────────────────────────────────────────────────

export function teamInviteEmail(input: {
  inviterName: string | null;
  inviterEmail: string;
  firmName: string | null;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}) {
  const sender = input.inviterName
    ? `${input.inviterName} (${input.inviterEmail})`
    : input.inviterEmail;
  const firmLine = input.firmName ? ` at ${input.firmName}` : "";

  return renderEmail({
    subject: `${sender} invited you to Practiq`,
    preheader: `Join ${input.firmName ?? "their firm"} — client-scoped AI workspace.`,
    intro: `${sender} invited you to join their firm${firmLine} on Practiq as a ${input.role}. You'll get shared client memory with the rest of the team — when you pick up a matter, the AI already knows the history.`,
    cta: {
      label: "Accept invitation",
      href: input.acceptUrl,
    },
    body: `This invite expires on ${input.expiresAt.toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", year: "numeric" },
    )}. If you weren't expecting this, you can safely ignore this email.`,
    footer: `Practiq is an AI-native workspace for boutique professional-services firms.`,
  });
}

// ── Password reset ─────────────────────────────────────────────

export function passwordResetEmail(input: {
  resetUrl: string;
  expiresAt: Date;
}) {
  return renderEmail({
    subject: "Reset your Practiq password",
    preheader: "One-time link, valid for the next hour.",
    intro:
      "We received a request to reset the password on your Practiq account. Click the button below to set a new one.",
    cta: {
      label: "Reset password",
      href: input.resetUrl,
    },
    body: `This link expires at ${input.expiresAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })}. If you didn't request a reset, you can ignore this email — your password stays the same.`,
    footer: `For security, never share this link with anyone — even a support agent.`,
  });
}

// ── Email verification ─────────────────────────────────────────

export function verifyEmail(input: { verifyUrl: string; expiresAt: Date }) {
  return renderEmail({
    subject: "Verify your email for Practiq",
    preheader: "One-click verification to unlock your workspace.",
    intro:
      "Just need to confirm that we have the right email for you. Click the button below and you're done.",
    cta: {
      label: "Verify email",
      href: input.verifyUrl,
    },
    body: `Link expires ${input.expiresAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}. If this wasn't you, you can safely ignore this message.`,
  });
}

// ── Daily briefing summary (Phase 2 trigger) ───────────────────

export function briefingSummaryEmail(input: {
  firstName: string;
  pendingCount: number;
  highPriorityCount: number;
  topItems: Array<{ title: string; clientName: string }>;
}) {
  const site = getSiteUrl();
  const itemsList = input.topItems
    .slice(0, 5)
    .map((i, idx) => `${idx + 1}. ${i.title} (${i.clientName})`)
    .join("\n");

  return renderEmail({
    subject: `Your morning digest — ${input.pendingCount} items waiting`,
    preheader: `${input.highPriorityCount} high-priority. The agent worked overnight.`,
    intro: `Good morning${input.firstName ? `, ${input.firstName}` : ""}. Overnight the agent scanned every client and surfaced ${input.pendingCount} items for your review — ${input.highPriorityCount} of them high-priority.`,
    cta: {
      label: "Open approval queue",
      href: `${site}/app/tasks`,
    },
    body: `Top of your queue:
${itemsList}

Use J/K to navigate, Y to approve, N to reject. The whole queue is designed to triage in under 5 minutes per client.`,
    footer: `You can change briefing frequency or turn it off in Settings → Agent.`,
  });
}

// ── Helpers ────────────────────────────────────────────────────

function labelForVertical(v: string): string {
  const map: Record<string, string> = {
    accounting: "accounting / tax / bookkeeping",
    law: "legal",
    consulting: "consulting",
    hr: "HR advisory",
    agency: "agency / creative",
    advisory: "financial advisory",
  };
  return map[v] ?? "professional services";
}
