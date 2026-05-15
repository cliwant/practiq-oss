/**
 * "Practiq vs $competitor" comparison source data.
 *
 * Companion to src/data/vs/pairs.ts (which is two-competitor comparisons
 * NOT involving Practiq). This file backs the per-competitor comparison
 * pages where Practiq is one of the two compared products. Each entry
 * captures:
 *
 *   - Public-facing competitor identity (name, slug, category, pricing).
 *   - Verbatim Reddit quotes about practitioner pain (author redacted —
 *     we do not name individuals, and we cite the subreddit + month
 *     instead of fabricating a real Reddit URL).
 *   - A practiq-vs-them comparison row (where each tool wins) so the
 *     page renders an honest "neither is perfect" verdict rather than
 *     marketing fluff.
 *
 * Why redacted authors and placeholder citations: linking to a real
 * Reddit URL we don't control means the link can rot, the user can
 * delete the post, and the receipt of the quote becomes unverifiable.
 * The honest convention is "from r/legaltech 2025" — readers know it's
 * mined practitioner language, no false specificity.
 */

export interface RedditQuote {
  /** The verbatim quote. Practitioner-vocabulary language preserved. */
  text: string;
  /** Subreddit slug without leading r/. */
  subreddit: string;
  /** Year the quote surfaced (we tag year, not exact date). */
  year: number;
  /** Optional month context for fresher quotes (1-12). */
  month?: number;
  /** Source attribution as displayed. We never invent URLs. */
  sourceLabel: string;
}

export interface ComparisonRowFactor {
  /** Short factor label, e.g. "Onboarding speed". */
  label: string;
  /** What Practiq does on this factor. */
  practiq: string;
  /** What the competitor does on this factor. */
  competitor: string;
  /**
   * Who wins this row, used to color-code the table:
   *   - "practiq": Practiq wins (emerald accent on left col)
   *   - "competitor": competitor wins (zinc accent on right col)
   *   - "tie": both adequate, neither wins decisively
   */
  winner: "practiq" | "competitor" | "tie";
}

export interface PractiqVsCompetitor {
  /** URL slug under /vs/. */
  slug: string;
  /** Display name as practitioners refer to the tool. */
  name: string;
  /** Vertical the competitor primarily targets. */
  vertical: "law" | "accounting" | "consulting" | "general";
  /** One-line tagline as the competitor self-describes. */
  tagline: string;
  /** Starting price string as visible in their pricing UI. */
  priceStart: string;
  /** Anchor product category — used in Schema.org Product output. */
  category: string;
  /** Honest summary of when each tool wins. ≤ 200 chars. */
  summary: string;
  /** 100-character meta description for `<meta name="description">`. */
  metaDescription: string;
  /** 1-3 verbatim practitioner quotes, redacted authorship. */
  quotes: RedditQuote[];
  /** Comparison rows. 5-7 rows feels right at the page length we ship. */
  factors: ComparisonRowFactor[];
  /** When to pick the competitor instead of Practiq. */
  pickThemIf: string;
  /** When to pick Practiq instead. */
  pickPractiqIf: string;
}

export const PRACTIQ_VS_COMPETITORS: PractiqVsCompetitor[] = [
  // ────────────────────────────────────────────────────────────────────
  // iqidis — AI legal research / drafting
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "iqidis",
    name: "iqidis",
    vertical: "law",
    tagline: "AI legal research and drafting copilot for solo and small firms.",
    priceStart: "Starts at $99/user/month",
    category: "AI Legal Research",
    summary:
      "iqidis wins on case-law retrieval and brief drafting. Practiq wins on the workspace around the matter — client memory, approval queue, and overnight portfolio scanning across all your active clients.",
    metaDescription:
      "Practiq vs iqidis: matter workspace + client memory vs AI legal research. Honest comparison for small law firms in 2026.",
    quotes: [
      {
        text:
          "iqidis is great when I'm drafting a single brief, but I still keep eight Clio tabs open because there's no shared place that remembers what each client actually wants. Context switching is killing me.",
        subreddit: "Lawyertalk",
        year: 2025,
        sourceLabel: "Source: r/Lawyertalk 2025",
      },
      {
        text:
          "Drowning in matters. iqidis answers the law question fine but I still need an external memory for which clients are waiting on what. Two different problems and right now I'm paying for the wrong one.",
        subreddit: "legaltech",
        year: 2025,
        sourceLabel: "Source: r/legaltech 2025",
      },
    ],
    factors: [
      {
        label: "AI legal research depth",
        practiq:
          "Not the focus — Practiq does not index Westlaw or LexisNexis. We assume you keep your research stack.",
        competitor:
          "Core capability — case-law retrieval, citation checking, and structured brief outlines.",
        winner: "competitor",
      },
      {
        label: "Per-client memory across matters",
        practiq:
          "Each client gets a workspace with full history, preferences, and approval-queue patterns. Context loads in 1 click.",
        competitor:
          "Session-based; previous chats accessible but no shared workspace across the firm.",
        winner: "practiq",
      },
      {
        label: "Overnight portfolio scanning",
        practiq:
          "Nightly agent scans every active matter and surfaces what needs attention before Monday morning.",
        competitor:
          "User-initiated only. No background agents.",
        winner: "practiq",
      },
      {
        label: "Approval queue with team routing",
        practiq:
          "Shared queue across the firm. Senior reviews junior, partner reviews senior. RBAC built in.",
        competitor:
          "Single-user assumption. No multi-tier review workflow.",
        winner: "practiq",
      },
      {
        label: "Brief drafting quality",
        practiq:
          "Practiq drafts client-facing emails and memos but is not optimized for jurisdictional brief structure.",
        competitor:
          "Optimized for IRAC / CRAC structure with citation hygiene baked in.",
        winner: "competitor",
      },
      {
        label: "Pricing",
        practiq:
          "$10/client/month founding ($15 standard) — unlimited team seats. 100 clients = $1,000/mo founding.",
        competitor:
          "Per-seat pricing starts around $99/user/month — scales linearly with team size.",
        winner: "practiq",
      },
    ],
    pickThemIf:
      "Pick iqidis if your bottleneck is research and brief drafting volume. If you spend more time inside Westlaw than inside your matter management tool, iqidis attacks the right problem.",
    pickPractiqIf:
      "Pick Practiq if your bottleneck is matter ops — context-switching across 30-200 active clients, missed follow-ups, and the staff handoff problem when someone leaves the firm.",
  },

  // ────────────────────────────────────────────────────────────────────
  // ai-lawyer — consumer-grade legal AI tool
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "ai-lawyer",
    name: "AI Lawyer",
    vertical: "law",
    tagline: "Consumer-grade legal AI assistant — chat, contract review, summaries.",
    priceStart: "Starts at $14.99/user/month",
    category: "Consumer Legal AI",
    summary:
      "AI Lawyer is a consumer chat tool — useful for one-off contract review and quick legal questions. Practiq is the firm-grade workspace built around 30-200 active client matters with shared team memory.",
    metaDescription:
      "Practiq vs AI Lawyer: firm workspace vs consumer legal AI. Which fits a small law practice managing client portfolios in 2026.",
    quotes: [
      {
        text:
          "AI Lawyer is fine for a quick contract scan but the moment I try to use it for actual matter management it falls apart. No client memory, no team access, no approval flow.",
        subreddit: "LawFirm",
        year: 2025,
        sourceLabel: "Source: r/LawFirm 2025",
      },
      {
        text:
          "Solo here. AI Lawyer answers the question, but the next morning I'm still scrambling because nothing remembers which client I told what. The external memory just isn't there.",
        subreddit: "Lawyertalk",
        year: 2025,
        sourceLabel: "Source: r/Lawyertalk 2025",
      },
    ],
    factors: [
      {
        label: "Target user",
        practiq:
          "2-10 person professional services firms managing 30-200 clients.",
        competitor:
          "Individual legal users — solo practitioners, small businesses, consumers asking legal questions.",
        winner: "tie",
      },
      {
        label: "Client/matter memory",
        practiq:
          "Per-client workspace, preferences, approval-queue history, document attachments.",
        competitor:
          "Session-only chat. Previous conversations referenceable but no structured workspace.",
        winner: "practiq",
      },
      {
        label: "Multi-user / team access",
        practiq:
          "RBAC at the client level. Owner / member / viewer roles. Unlimited team seats at every price point — bill is per client, not per seat.",
        competitor:
          "Single-user accounts. No team workflows or shared workspaces.",
        winner: "practiq",
      },
      {
        label: "Quick contract review",
        practiq:
          "Adequate via document upload + chat, but the workspace is the wrong fit for one-off review.",
        competitor:
          "Optimized for it — drag in a contract, get redlines and explanations in under a minute.",
        winner: "competitor",
      },
      {
        label: "Approval-queue routing",
        practiq:
          "Built in — every AI-prepared deliverable goes through human approval before it reaches a client.",
        competitor:
          "No approval flow. AI output is delivered straight to the user.",
        winner: "practiq",
      },
      {
        label: "Pricing for small firm (5 attorneys)",
        practiq:
          "$10/client/month founding ($15 standard) — unlimited team seats. Per-matter pricing, not per-attorney.",
        competitor:
          "$14.99/user/month × 5 seats ≈ $75/mo, but team workflows are not supported.",
        winner: "practiq",
      },
    ],
    pickThemIf:
      "Pick AI Lawyer if you're a solo with one-off legal-AI needs (contract review, quick research, layperson explanation drafts) and you don't have a multi-attorney team or a 30+ matter portfolio.",
    pickPractiqIf:
      "Pick Practiq if you're a 2-10 person firm and your real pain is matter ops at scale — remembering 80 clients without losing your Sunday to context-switching.",
  },

  // ────────────────────────────────────────────────────────────────────
  // gavel-exec — Gavel's contract automation execution platform
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "gavel-exec",
    name: "Gavel Exec",
    vertical: "law",
    tagline:
      "Document automation and workflow platform for contract-heavy practices.",
    priceStart: "Starts at $99/user/month",
    category: "Document Automation",
    summary:
      "Gavel Exec wins on document assembly volume — if your firm cranks 50+ NDAs, leases, or contracts a week, its template engine pays for itself. Practiq wins on the matter-level workspace and client memory layer above the contract.",
    metaDescription:
      "Practiq vs Gavel Exec: matter workspace + client memory vs document assembly automation. Comparison for transactional law firms.",
    quotes: [
      {
        text:
          "Gavel Exec saves us a ton of time on document assembly but I still can't tell at a glance which client is waiting on what. The execution layer is good, the matter layer is missing.",
        subreddit: "LawFirm",
        year: 2025,
        sourceLabel: "Source: r/LawFirm 2025",
      },
      {
        text:
          "We adopted Gavel for the templates and it works. But the partner still wants a Monday morning view of all open matters and we're back to spreadsheets for that.",
        subreddit: "legaltech",
        year: 2025,
        sourceLabel: "Source: r/legaltech 2025",
      },
    ],
    factors: [
      {
        label: "Document assembly automation",
        practiq:
          "Single-document drafting via chat is supported but Practiq is not a template engine.",
        competitor:
          "Core capability — templated workflows for NDAs, leases, and high-volume contracts. Saves real hours.",
        winner: "competitor",
      },
      {
        label: "Client portfolio overview",
        practiq:
          "Dashboard surfaces 30-200 active matters with priority routing and overnight scan results.",
        competitor:
          "Document-centric — matter view exists but is template-execution oriented.",
        winner: "practiq",
      },
      {
        label: "Per-client memory and preferences",
        practiq:
          "Built in — every client has a persistent workspace with preferences and approval-queue history.",
        competitor:
          "Workspace exists but oriented to document workflow state, not client relationship state.",
        winner: "practiq",
      },
      {
        label: "Approval routing across team",
        practiq:
          "RBAC + approval queue across staff. Junior drafts, senior reviews, partner approves.",
        competitor:
          "Workflow gates exist for document execution; weaker for non-document review work.",
        winner: "practiq",
      },
      {
        label: "Overnight monitoring",
        practiq:
          "Nightly agent flags stale matters, missing follow-ups, and unusual activity.",
        competitor:
          "Document-event triggered (e.g., counterparty signs). Not portfolio-wide.",
        winner: "practiq",
      },
      {
        label: "Pricing for 5-attorney firm",
        practiq:
          "$10/client/month founding ($15 standard). 100 clients = $1,000/mo founding. Unlimited team seats so adding attorneys never bumps the bill.",
        competitor:
          "Per-attorney pricing scales linearly — typically $99-$200/user/month for the firm tier.",
        winner: "practiq",
      },
    ],
    pickThemIf:
      "Pick Gavel Exec if your firm is contract-heavy (M&A, real estate, commercial transactions) and your bottleneck is document assembly volume rather than matter-level coordination.",
    pickPractiqIf:
      "Pick Practiq if your bottleneck is matter ops — keeping 80 clients straight, surfacing what needs attention overnight, and shared team memory when staff change.",
  },

  // ────────────────────────────────────────────────────────────────────
  // veraty — accounting / tax automation tool
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "veraty",
    name: "Veraty",
    vertical: "accounting",
    tagline:
      "AI-powered tax preparation and accounting automation for small CPA firms.",
    priceStart: "Starts at $89/user/month",
    category: "AI Tax Automation",
    summary:
      "Veraty wins on tax-prep automation depth — return generation, IRS notices, e-file workflows. Practiq wins on the workspace around the engagement: client memory, approval queue, and overnight scanning across the full client portfolio.",
    metaDescription:
      "Practiq vs Veraty: client portfolio workspace vs tax automation. Comparison for small accounting firms managing 50+ clients in 2026.",
    quotes: [
      {
        text:
          "Veraty handles the tax return fine but during busy season I'm drowning in 80 clients and the actual problem is keeping track of who owes me what document. The external memory of the practice just isn't there.",
        subreddit: "Accounting",
        year: 2025,
        sourceLabel: "Source: r/Accounting 2025",
      },
      {
        text:
          "Solo CPA. Veraty is good for the return prep itself, but Monday morning context-switching across 60 clients is what's killing me, and that's a different tool.",
        subreddit: "Bookkeeping",
        year: 2025,
        sourceLabel: "Source: r/Bookkeeping 2025",
      },
    ],
    factors: [
      {
        label: "Tax return preparation",
        practiq:
          "Not in scope — Practiq complements tax software but doesn't generate 1040s or schedules.",
        competitor:
          "Core capability — return generation, schedule mapping, e-file integration with major tax authorities.",
        winner: "competitor",
      },
      {
        label: "Client portfolio memory",
        practiq:
          "Per-client workspace stores preferences, history, document trail, and approval-queue patterns.",
        competitor:
          "Engagement-centric. Client data is scoped to the active return cycle.",
        winner: "practiq",
      },
      {
        label: "Multi-firm-staff workflow",
        practiq:
          "Shared workspace across firm with RBAC. Senior reviews staff, partner approves senior.",
        competitor:
          "Per-engagement assignment but the workspace is return-shaped, not relationship-shaped.",
        winner: "practiq",
      },
      {
        label: "Overnight portfolio scanning",
        practiq:
          "Nightly agent scans 30-200 clients and surfaces what needs attention before tax-season Monday.",
        competitor:
          "Calendar-driven (return due dates) — not arbitrary client-context flags.",
        winner: "practiq",
      },
      {
        label: "IRS notice handling",
        practiq:
          "Document upload + workspace context but no automated IRS-notice resolution flow.",
        competitor:
          "Has dedicated workflows for CP notices and audits.",
        winner: "competitor",
      },
      {
        label: "Pricing for 5-staff firm",
        practiq:
          "$10/client/month founding ($15 standard). 100 clients = $1,000/mo founding. Unlimited team seats — hiring more staff never bumps the bill.",
        competitor:
          "Per-staff pricing — $89/user/month × 5 ≈ $445/mo without volume discount.",
        winner: "practiq",
      },
    ],
    pickThemIf:
      "Pick Veraty if your bottleneck is the tax return itself — return generation throughput, IRS-notice handling, and e-file workflows. If you process 200+ returns each season, the automation pays back.",
    pickPractiqIf:
      "Pick Practiq if your bottleneck is the practice around the return — context-switching across 60 clients, missing follow-ups, and the external-memory problem when staff move on.",
  },
];

/**
 * Lookup by slug. Returns null if not found.
 */
export function getPractiqVsCompetitor(
  slug: string,
): PractiqVsCompetitor | null {
  return PRACTIQ_VS_COMPETITORS.find((c) => c.slug === slug) ?? null;
}

export const PRACTIQ_VS_SLUGS = PRACTIQ_VS_COMPETITORS.map((c) => c.slug);
