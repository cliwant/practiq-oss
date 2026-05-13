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
 *
 * ---
 *
 * Wave 20 staging note (2026-05-14, copywriter):
 *
 * The variants `context_loss_universal` and `associate_not_partner` are
 * staged from Wave 20. Both are sourced from
 * `.cycle/research/voc-for-verticals-2026-05-13.md` (commit 55246ca) and
 * inherit the trace-or-don't-ship rule documented in
 * `.claude/agent-memory/copywriter/voc-traced-hero-pattern.md`.
 *
 * They are intentionally NOT yet rotated into traffic. `src/middleware.ts`
 * still ships `variants: ["control"]` for `hero_copy_v1`, so 100% of
 * homepage visitors continue to see `control`. To activate:
 *
 *   1. Edit the `hero_copy_v1` entry in `src/middleware.ts` AB_TESTS to:
 *      `variants: ["control", "control", "control", "control",
 *                  "control", "control", "control",
 *                  "context_loss_universal", "context_loss_universal",
 *                  "context_loss_universal", "context_loss_universal",
 *                  "context_loss_universal",
 *                  "associate_not_partner", "associate_not_partner",
 *                  "associate_not_partner", "associate_not_partner",
 *                  "associate_not_partner"]`
 *      (the middleware's `assignVariant` does uniform-by-index, so
 *      repeating the slug N times = N/total weight; this gives a 70/15/15
 *      split — 14 control entries vs 5 each of the new variants would be
 *      cleaner; pick whatever ratio matches the gcd you want).
 *   2. The signal threshold for keeping a new variant against control:
 *      ≥ 200 unique visitors per variant before evaluating signup
 *      conversion. Below that, variance dominates.
 *   3. Splitting variant rotation (operator-controlled, in middleware) from
 *      variant authoring (copywriter-controlled, in this file) is the
 *      whole point — staging copy here does not change traffic until the
 *      operator flips the middleware. Two separate decisions.
 */

export type HeroVariant =
  | "control"
  | "time_saved"
  | "capacity"
  | "pain_first"
  | "practitioner_pain"
  // Added 2026-04-28 from the expanded Reddit research
  // (.cycle/research/2026-04-28-reddit-pain-expanded.md). Three of the
  // top-3 product implications get loaded into the hero copy:
  //   1. Lock-in fear (r/legaltech `1mhwrv0` — "Locking into any contract
  //      with a new tech is a very scary thing.")
  //   2. Boutique positioning (r/legaltech `1mhndz0` — Harvey explicitly
  //      not scheduling demos for small firms.)
  //   3. Show-your-work (r/legaltech `1o4n70h` — "If you can't show
  //      diffs/provenance + hours saved on your corpus, pass.")
  | "monthly_no_lockin"
  // Added 2026-05-14 (Wave 20). Sourced from
  // .cycle/research/voc-for-verticals-2026-05-13.md (commit 55246ca).
  // Staged for homepage A/B rotation; receives 0 traffic until
  // middleware.ts AB_TESTS is updated by the operator.
  //
  //  - context_loss_universal: tests whether naming the symptom
  //    ("starting from zero") outperforms naming the positioning
  //    ("client-centric AI"). Universal hook derived from the
  //    researcher's macro finding that buyers in ALL 5 verticals
  //    describe context loss between client interactions, not workload.
  //  - associate_not_partner: tests whether positioning Practiq as a
  //    junior-helper-that-never-forgets outperforms positioning as an
  //    AI-workspace product. Anchored in §Consulting-E6 — the
  //    metaphor consulting buyers already use for LLM capability.
  | "context_loss_universal"
  | "associate_not_partner";

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
  // Practitioner-pain variant — built from verbatim quotes mined out of
  // r/Accounting, r/Bookkeeping, r/Lawyertalk during the 2026-04-27
  // Reddit research pass (.cycle/research/2026-04-27-reddit-customer-pain.md).
  // Two strongest signals from that corpus:
  //   - "You are currently acting as his external memory" (75 upvotes)
  //   - "The biggest issue isn't volume, it's context switching"
  // Copy mirrors practitioners' own words rather than reaching for
  // SaaS-marketing abstractions like "AI workspace" — practitioners
  // never say that phrase. They say "drowning", "external memory",
  // "context switching".
  practitioner_pain: {
    eyebrow:
      "For 2–10 person CPA / law / advisory firms — not 500-lawyer firms",
    headline: "Stop being your firm's external memory.",
    subhead:
      "Across r/Accounting and r/Lawyertalk one line keeps showing up: \"the biggest issue isn't volume, it's context switching.\" Practiq holds the memory for you — every client's facts, decisions, and preferences live in a workspace the AI always has loaded. Show your work, every time. No wrappers.",
    primaryCta: "Claim Founding Member Spot",
    secondaryCta: "See how it works",
    bookCallText: "or book a 15-min walkthrough",
  },
  // Added 2026-04-28 from the expanded Reddit research wave. Three of the
  // top-3 product implications loaded into the copy: lock-in fear,
  // boutique-only positioning, show-your-work / refusal-first.
  monthly_no_lockin: {
    eyebrow:
      "For 2–10 person firms — monthly billing, no minimum seats, no annual lock-in",
    headline: "AI for your firm — without the year-long contract.",
    subhead:
      "Boutique firms keep saying the same thing about Harvey + Karbon + TaxDome: 12-month contracts and 40-seat minimums make them un-tryable. Practiq is monthly. Drop in alongside what you already use. Every answer cites the exact client memory it came from — show your work, every time. Practiq is the AI workspace for boutique professional service firms.",
    primaryCta: "Try Practiq Monthly",
    secondaryCta: "See how it works",
    bookCallText: "or book a 15-min walkthrough",
  },
  // Added 2026-05-14 (Wave 20). Universal cross-vertical hero derived from
  // the researcher's macro finding in
  // .cycle/research/voc-for-verticals-2026-05-13.md §Cross-vertical summary
  // (commit 55246ca): "Buyers describe context loss between client
  // interactions, NOT workload."
  //
  // Three independent VoC citations for the claim of universality:
  //   1. §CPA-A4 — InvestmentLimp4492, r/Bookkeeping, 165 ups, 2025-11:
  //      "spend hours going through bank statements and receipts trying
  //      to figure out what all these transactions actually were."
  //   2. §Consulting-E5 — Efficient_Degree9569, r/consulting, 287 ups,
  //      2025-10: "I've done it 50 times so I know where it breaks."
  //      (The 50-times pattern memory across engagements is the same
  //      pain at a senior-consultant register.)
  //   3. §Marketing-D1 — czerrr, r/agency, 129 ups, 2025-12: "a lot of
  //      clients, a lot of context switching." (Verbatim "context
  //      switching" phrasing from agency owner.)
  //
  // Strategic constraint: this is the FIRST homepage variant that
  // intentionally universalizes a per-vertical hero. It bets that
  // surface area > vertical specificity for unauthenticated visitors who
  // haven't yet self-selected into /for/{vertical}. Test if it converts
  // before the /for/[vertical] split happens.
  context_loss_universal: {
    eyebrow:
      "For boutique firms — accounting · law · consulting · HR · agency",
    headline: "Stop starting from zero every time you open a client.",
    subhead:
      "Across r/Accounting, r/consulting, and r/agency, the same line keeps showing up: \"a lot of context switching.\" Practiq scopes memory to the client, not the chat — so every file, decision, and unfinished thread is already loaded when you open the workspace. Switch between 50 clients without re-briefing the AI once.",
    primaryCta: "Get Early Access",
    secondaryCta: "See how it works",
    bookCallText: "or book a 15-min walkthrough",
  },
  // Added 2026-05-14 (Wave 20). Positioning variant derived from Wave 19's
  // /for/consulting-firms hero, generalized for the homepage.
  //
  // VoC citation: §Consulting-E6 — extratoastedcheezeit, r/consulting, 357
  // ups, 2026-04 (verbatim): "ChatGPT or LLMs in general are only as
  // smart as an associate or entry level employee. It still needs
  // guidance, and in many cases the output has to be verified... Don't
  // let it think for you."
  //
  // Wave 18a §Consulting non-obvious insight: boutique consultants are
  // POST-AI and ashamed of the hype (§E4, §E11, §E12 — three independent
  // top-rated quotes). The "associate, not partner" frame is the right
  // capability ceiling that boutique buyers already use as a metaphor.
  //
  // Strategic constraint: this variant bets that positioning Practiq as
  // junior-helper (drafts, you judge) outperforms positioning as
  // AI-workspace-product. It explicitly cedes the "thinking" job to the
  // human — which is what skeptical buyers say they want.
  associate_not_partner: {
    eyebrow:
      "For boutique firms tired of AI that tries to think for them",
    headline: "An associate, not a partner. Practiq drafts. You judge.",
    subhead:
      "Across r/consulting the top-rated take on AI in 2026 is one line: \"only as smart as an associate or entry-level employee. Don't let it think for you.\" Practiq is built to that ceiling on purpose. The memory lives on the client, the drafts land on your desk overnight, and every output cites the exact source it came from — so the judgment is always yours.",
    primaryCta: "Get Early Access",
    secondaryCta: "See how it works",
    bookCallText: "or book a 15-min walkthrough",
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
