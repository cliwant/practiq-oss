/**
 * Hero copy A/B variants for landing page.
 *
 * Assigned via middleware cookie `ab_hero_copy_v1`.
 * Read in page.tsx via `cookies()` (server) or `document.cookie` (client).
 *
 * Analysis rationale:
 *  - 14 link_clicks from cold email but 0 signups = landing page conversion is broken
 *  - Need variant testing on: eyebrow, headline, subhead, CTA
 *  - Each variant targets a different psychological angle
 */

export type HeroVariant = "control" | "time_saved" | "capacity" | "pain_first";

export interface HeroCopy {
  eyebrow: string;
  headline: React.ReactNode;
  subhead: string;
  primaryCta: string;
  secondaryCta: string;
  bookCallText: string;
}

export const HERO_COPY: Record<HeroVariant, HeroCopy> = {
  // Control — canonical positioning (2026-04-23 pivot):
  // Client-centric, for ALL professional services firms, explicit contrast
  // with chat-session-based AI agents.
  control: {
    eyebrow: "For boutique professional services firms — accounting · law · consulting · HR · agency",
    headline: "AI built around your clients, not your chats.",
    subhead:
      "Every other AI agent scopes memory to a conversation. Practiq scopes it to the client. Conversations, files, agent sessions, deliverables — all live inside a client workspace. Switch between 50 clients with zero context reload.",
    primaryCta: "Request Early Access",
    secondaryCta: "Explore the live demo",
    bookCallText: "or book a 15-min intro call",
  },
  time_saved: {
    eyebrow: "For 2–20 person boutique firms managing 50–200 clients",
    headline: "Stop re-briefing the AI every time you switch clients.",
    subhead:
      "Chat-session AI forgets the moment you close the thread. Practiq keeps every client's full history — conversations, files, preferences, past deliverables — in a workspace the AI always has loaded. Your team arrives to a prioritized morning queue, not a blank prompt.",
    primaryCta: "Get Early Access",
    secondaryCta: "See how it works",
    bookCallText: "or book a 15-min walkthrough",
  },
  capacity: {
    eyebrow: "For firms hitting the 50-client ceiling",
    headline: "Handle 150 clients without hiring.",
    subhead:
      "Context switching is why firms cap at 50 clients. Practiq flips the architecture: memory lives on the client, not the chat. The AI holds every client's state overnight so your team arrives to prepared deliverables — not a blank screen.",
    primaryCta: "Claim Founding Member Spot",
    secondaryCta: "Explore the live demo",
    bookCallText: "or book a 15-min intro call",
  },
  pain_first: {
    eyebrow: "Stop losing hours to context switching",
    headline: "You spend 3 hours a day re-briefing the AI.",
    subhead:
      "Every client switch = 10–15 minutes reloading context into ChatGPT. That's because the AI's memory is scoped to the chat. Practiq scopes it to the client — so switching clients is one click and the AI is already up to speed.",
    primaryCta: "Fix This For My Firm",
    secondaryCta: "See how it works",
    bookCallText: "or book a 15-min call",
  },
};

export type CtaVariant = "control" | "founding_member" | "get_early" | "claim_spot";

export const CTA_COPY: Record<CtaVariant, { primary: string; sub: string | null }> = {
  control: { primary: "Request Early Access", sub: null },
  founding_member: { primary: "Become a Founding Member", sub: "First 50 firms — 50% off for life" },
  get_early: { primary: "Get Early Access", sub: "No spam. One-time email when access opens." },
  claim_spot: { primary: "Claim My Spot", sub: "Limited to 50 founding members" },
};

/**
 * Read variant from cookie (client-side helper).
 * Returns "control" if cookie not set.
 */
export function getVariantFromCookie<T extends string>(
  cookieName: string,
  defaultVariant: T
): T {
  if (typeof document === "undefined") return defaultVariant;
  const match = document.cookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return (match?.[1] as T) ?? defaultVariant;
}
