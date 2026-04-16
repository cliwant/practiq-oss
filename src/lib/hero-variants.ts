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
  control: {
    eyebrow: "For accounting, law, HR, marketing, and consulting firms",
    headline: "Manage 50 clients with the memory of one.",
    subhead: "A workspace that remembers every client relationship your team manages.",
    primaryCta: "Request Early Access",
    secondaryCta: "Explore the demo",
    bookCallText: "or book a 15-min intro call",
  },
  time_saved: {
    eyebrow: "For 2-10 person boutique firms",
    headline: "Get 3 hours back every day.",
    subhead: "The AI workspace that eliminates context switching between 50-200 client relationships. Instead of reconstructing where you left off, your team arrives to a prioritized morning queue.",
    primaryCta: "Get Early Access",
    secondaryCta: "See how it works",
    bookCallText: "or book a 15-min walkthrough",
  },
  capacity: {
    eyebrow: "For firms hitting the 50-client wall",
    headline: "Handle 150 clients without hiring.",
    subhead: "Break through the capacity ceiling. AI holds context on every client overnight so your team arrives to prepared deliverables, not a blank screen.",
    primaryCta: "Claim Founding Member Spot",
    secondaryCta: "Explore the demo",
    bookCallText: "or book a 15-min intro call",
  },
  pain_first: {
    eyebrow: "Stop losing hours to context switching",
    headline: "You spend 3 hours a day remembering where you left off.",
    subhead: "Every client switch = 10-15 minutes reloading context. We built the AI workspace that eliminates this for boutique professional services firms.",
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
