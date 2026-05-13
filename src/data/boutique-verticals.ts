/**
 * Boutique vertical landing-page config (Tier 3.2).
 *
 * Drives the static routes at /for/cpa-firms, /for/law-firms,
 * /for/hr-consultants, /for/marketing-agencies, /for/consulting-firms.
 *
 * These pages target boutique-keyword search intent (Mike-research finding:
 * "boutique professional services" never surfaces in Mike's discourse —
 * open positioning) and use verbatim Reddit pain quotes captured in
 * .cycle/research/2026-04-27-reddit-customer-pain.md.
 *
 * Each entry includes:
 * - hero copy with vertical-specific pain
 * - 1-2 verbatim Reddit quotes
 * - 3-5 vertical-specific use cases ("Practiq workflows")
 * - 4 question-style H2 FAQs for AEO (Answer Engine Optimization)
 */

export interface RedditQuote {
  /** The verbatim quote (no edits). */
  quote: string;
  /** Subreddit attribution, e.g. "r/Accounting". */
  subreddit: string;
  /** Persona description, e.g. "Small accounting firm partner". */
  persona: string;
}

export interface VerticalUseCase {
  title: string;
  description: string;
}

export interface VerticalFaq {
  /** Question phrased as a question — drives FAQPage JSON-LD + AEO. */
  question: string;
  /** Answer in 1-2 sentences directly below the question heading. */
  answer: string;
}

export interface BoutiqueVertical {
  /** URL slug, used for /for/{slug}. */
  slug: string;
  /** Plural label used in meta title and H1. */
  label: string;
  /** Single-firm noun, used in inline copy ("for a boutique CPA firm"). */
  singular: string;
  /** UTM source value: for-{slug}. */
  utmSource: string;
  /** Hero kicker eyebrow text. */
  kicker: string;
  /** H1. */
  heroTitle: string;
  /** Subhead — short, mirrors practitioner pain. */
  heroSubtitle: string;
  /** First-paragraph AEO answer — page-level standalone definition. */
  leadParagraph: string;
  /** Meta title (≤ 60 chars). */
  metaTitle: string;
  /** Meta description (150-160 chars). */
  metaDescription: string;
  /** Search keywords for OG/keywords meta. */
  keywords: string[];
  /** Verbatim Reddit pain quote(s). */
  painQuotes: RedditQuote[];
  /** 3-5 vertical-specific Practiq workflows. */
  workflows: VerticalUseCase[];
  /** Question-style H2s for AEO. */
  faqs: VerticalFaq[];
  /** Sibling vertical slugs to cross-link (2 per page). */
  siblings: [string, string];
}

export const BOUTIQUE_VERTICALS: Record<string, BoutiqueVertical> = {
  "cpa-firms": {
    slug: "cpa-firms",
    label: "Boutique CPA Firms",
    singular: "boutique CPA firm",
    utmSource: "for-cpa-firms",
    kicker: "For boutique CPA firms",
    // Hero source: Cross-vertical "starting from zero" pattern surfaced in
    // §CPA non-obvious insight + §CPA-A4 (InvestmentLimp4492, r/Bookkeeping,
    // 165 ups, 2025-11) — "spending hours going through bank statements
    // trying to figure out what all these transactions actually were."
    // Strategic constraint (Wave 18a): do NOT use "AI memory" — buyers say
    // "starting from zero" instead. See
    // .cycle/research/voc-for-verticals-2026-05-13.md §CPA.
    heroTitle: "Stop starting from zero every time you open a client.",
    // Subhead source: §CPA-A2 (Alternative-Baker-10, r/taxpros, 158 ups,
    // 2025-10) — "the same 10-20 clients each year that will not comply
    // until the last moment" — and §CPA-A3 (Cpaadvisor1, 11 ups, 2026-04)
    // — "somehow it's fine on 4/16. Breathe." Strategic constraint: frame
    // as "fix April, not fire clients" — the reflex remediation (§CPA-A7,
    // DanglyWorm, 200 ups) is firing clients. We slide between those.
    heroSubtitle:
      "The same 10 clients show up at 9pm on April 15 every year. Practiq remembers what they sent last year, the questions you asked, and the answers they finally gave — so you open the file already oriented instead of rebuilding the picture from scratch.",
    // Lead source: §CPA-A5/A6 (jnkbndtradr, r/Bookkeeping, 217 ups, 2025-05)
    // — "my job isn't just to do the bookkeeping. It's to build the system
    // that delivers the bookkeeping." Customer's exact frame for the
    // upgrade.
    leadParagraph:
      "Practiq is the workspace built for 2–20 person CPA, tax, and bookkeeping firms running 50–200 client relationships. It is not another tool you have to feed — it is the system that holds every client's quirks, prior decisions, and unfinished threads, so when you click into a return at 9pm on April 15 you start where you left off, not where the document hunt begins.",
    metaTitle:
      "Practiq for Boutique CPA Firms — stop starting from zero",
    metaDescription:
      "Practiq is the workspace for 2–20 person CPA firms managing 50–200 clients. Holds each client's prior decisions and unfinished threads so April hurts less.",
    keywords: [
      "boutique CPA firm software",
      "small CPA firm tools",
      "multi-client CPA workspace",
      "CPA firm context switching",
      "boutique accounting workspace",
      "tax season workflow",
      "CPA client memory",
      "small CPA practice software",
    ],
    // Inline quote sources:
    // 1. §CPA-A2 — Alternative-Baker-10, r/taxpros, 158 ups, 2025-10-15.
    //    The "10pm on April 15" + "same 10-20 clients" pattern.
    // 2. §CPA-A4 — InvestmentLimp4492, r/Bookkeeping, 165 ups, 2025-11.
    //    The document hunt — exact busywork Practiq's overnight scan kills.
    painQuotes: [
      {
        quote:
          "Does anyone else find themselves sitting in their offices at 10 pm on April 15… going what the hell am I doing here? No matter how much I push I have the same 10–20 clients each year that will not comply until the last moment.",
        subreddit: "r/taxpros",
        persona: "CPA partner, 158 upvotes, 2025-10",
      },
      {
        quote:
          "Now I get to spend hours going through bank statements and receipts trying to figure out what all these transactions actually were. Some of them don't even have memos.",
        subreddit: "r/Bookkeeping",
        persona: "Bookkeeper, 165 upvotes, 2025-11",
      },
    ],
    workflows: [
      {
        title: "Monthly close memo with redline",
        description:
          "Practiq drafts the monthly close memo overnight from the QB pull, flags anomalies in the line items, and renders the redline against last month's memo so the partner reviews changes — not the whole document.",
      },
      {
        title: "Engagement letter draft & review",
        description:
          "Pull the firm's standard engagement letter, fill in this client's scope from the workspace memory, and surface every clause that diverges from your last 10 letters of the same type.",
      },
      {
        title: "Client communication archive search",
        description:
          "Ask the agent \"what did we tell the Smith family about S-Corp election in 2024?\" and it returns the exact email thread, the partner who wrote it, and the rationale — across every communication channel that's been imported.",
      },
      {
        title: "Overnight anomaly scan across all clients",
        description:
          "Each night the agent reads every client's QB activity, flags the 3–5 transactions that need a partner's eyes, and assembles a Monday-morning queue ranked by what's actually material.",
      },
      {
        title: "Tax-season triage queue",
        description:
          "During busy season, the agent surfaces which returns are missing documents, which clients still owe responses, and which deliverables are stale — so the firm spends the peak weeks on judgment calls, not on hunting.",
      },
    ],
    faqs: [
      {
        question: "What does an AI-Native agent do for a boutique CPA firm?",
        answer:
          "It holds every client's context — prior years, balances, unusual transactions, the quirks of their chart of accounts — and prepares the next deliverable before the partner asks. Mornings start with a triaged queue, not a tab-switching marathon.",
      },
      {
        question: "How is Practiq different from Karbon for accountants?",
        answer:
          "Karbon is a workflow / practice-management platform built around tasks and templates. Practiq is a workspace built around client memory and an AI agent that prepares overnight. The difference shows up the first Monday morning: instead of checking off tasks, you're reviewing what the AI already drafted.",
      },
      {
        question: "Can my firm own its data?",
        answer:
          "Yes. Workspaces are strictly isolated per client, data is encrypted in transit and at rest, and we do not train models on customer data. Practiq is designed to sit inside the same confidentiality bar a CPA firm already holds for client trust.",
      },
      {
        question: "How many clients makes Practiq worth it?",
        answer:
          "Boutique firms tell us context-switching cost starts eating the day around 30–50 active clients. Below 30, a good notebook usually suffices. Above 50, firms report losing 6–10 hours a week to tab-switching alone — that is where Practiq pays for itself fastest.",
      },
    ],
    siblings: ["law-firms", "consulting-firms"],
  },

  "law-firms": {
    slug: "law-firms",
    label: "Boutique Law Firms",
    singular: "boutique law firm",
    utmSource: "for-law-firms",
    kicker: "For boutique law firms",
    // Hero source: §Law-B10 (sovietreckoning, r/Lawyertalk, 1,998 ups,
    // 2025-07) "I had a client lose it on me this morning over an AI
    // summary" + §Law-B11 (Wonderful_Minute31, 74 ups, 2026-04) "they
    // likely waived their privilege" + §Law-B12 (PMJamesPM, 897 ups,
    // 2026-04) "inputting something into AI risks destroying the
    // attorney client privilege." Strategic constraint (Wave 18a): lead
    // with privilege, NOT productivity, NOT AI billable hours. Privilege
    // > productivity, every time. See voc-for-verticals-2026-05-13.md §Law.
    heroTitle: "Stays inside the firm. Privilege, intact.",
    // Subhead source: §Law-B1 (mansock18, r/LawFirm, 156 ups, 2025-08) —
    // "working very full days, a lot of it is non-billable admin and I'm
    // sometimes on the hamster wheel generating less than 2 billable hours
    // per day." The single best Practiq-wedge quote in the entire dataset.
    // Privilege framing first; capacity framing second.
    heroSubtitle:
      "Practiq never talks to your client and never trains on your matter. It is the back-office a 2–20 attorney boutique can't afford to hire — quietly drafting, summarizing, and flagging behind the scenes so you stop losing full days to non-billable admin.",
    // Lead source: §Law-B1 + §Law-B6 (freshjennow, r/LawFirm, 6 ups,
    // 2025-10) — "isolation is real in solo practice." Combined with the
    // non-obvious insight: small-firm lawyers want their old paralegal
    // back, not AI. Frame as "the paralegal you can't afford yet."
    leadParagraph:
      "Practiq is the workspace for 2–20 attorney boutiques running 30–200 matters. It is the quiet teammate — never the loud one, never the client-facing one. The agent holds full matter context (parties, pleadings, deadlines, opposing-counsel behavior) and produces drafts you review, never drafts your client sees. Every output cites its source. No invented authorities. No privilege leak.",
    metaTitle:
      "Practiq for Boutique Law Firms — privilege-first AI workspace",
    metaDescription:
      "Workspace for 2–20 attorney boutiques managing 30–200 matters. Stays inside the firm, never client-facing. Every output cited. No privilege risk.",
    keywords: [
      "boutique law firm software",
      "small law firm workspace",
      "solo attorney back office",
      "attorney-client privilege AI",
      "matter memory law firm",
      "private law firm AI",
      "law firm paralegal alternative",
      "Harvey alternative small firm",
    ],
    // Inline quote sources:
    // 1. §Law-B12 — PMJamesPM, r/Lawyertalk, 897 ups, 2026-04. Highest-
    //    upvoted comment on highest-upvoted recent AI-in-law thread.
    //    Privilege destruction is the active concern.
    // 2. §Law-B1 — mansock18, r/LawFirm, 156 ups, 2025-08. The dominant
    //    pain line for solo/small-firm capacity.
    painQuotes: [
      {
        quote:
          "You can also tell clients that inputting something into AI risks destroying the attorney client privilege and it may be searchable by others.",
        subreddit: "r/Lawyertalk",
        persona: "Attorney, 897 upvotes, 2026-04",
      },
      {
        quote:
          "I'm finding that even though I'm working very full days, a lot of it is non-billable admin and I'm sometimes on the hamster wheel generating less than 2 billable hours per day.",
        subreddit: "r/LawFirm",
        persona: "Solo attorney, 156 upvotes, 2025-08",
      },
    ],
    workflows: [
      {
        title: "Engagement letter redline",
        description:
          "Pull the firm's engagement-letter playbook, fill in scope and party-specific clauses from the matter workspace, and surface every deviation from the last 20 letters of the same matter type — with the original clause and the proposed change side by side.",
      },
      {
        title: "Contract review with citations",
        description:
          "Every flagged clause links to the exact source in the contract, the firm's prior position on similar language, and (where applicable) the case law you've already cited in past memos. No invented authorities.",
      },
      {
        title: "Policy update propagation",
        description:
          "When a regulation or firm playbook changes, the agent surfaces every active matter with language that should be revisited, ranked by urgency. The attorney decides what gets touched; the agent never sends.",
      },
      {
        title: "Overnight deadline scan",
        description:
          "Across the active book, the agent flags statutes approaching, filings stale, and clients who have gone quiet. Monday morning becomes a triaged priority list, not a desperate inbox sort.",
      },
      {
        title: "Client communication archive search",
        description:
          "Ask \"what did we advise on the Garcia matter regarding the non-compete?\" and the agent returns the exact email, draft, and call note — with the date and the attorney who handled it.",
      },
    ],
    faqs: [
      {
        question: "What does an AI-Native agent do for a boutique law firm?",
        answer:
          "It holds every matter's context — parties, pleadings, deadlines, the client's preferred tone — and surfaces what needs attention before the attorney starts billing time. Drafts are produced overnight, cited to source, for the attorney to review and approve.",
      },
      {
        question: "How is Practiq different from Clio for attorneys?",
        answer:
          "Clio is a practice-management platform with billing, trust accounting, and matter tracking. Practiq is the AI memory layer above it. Clio remains the system of record for trust accounting and time entries; Practiq is where the day-to-day matter context lives.",
      },
      {
        question: "How is Practiq different from Harvey?",
        answer:
          "Harvey is built for 500-lawyer firms at $500–$1,000 per seat per month. Practiq is built for 2–20 attorney boutiques, with monthly billing, no seat minimum, and every output cited to source — no hallucinated authorities, no invented clauses.",
      },
      {
        question: "Can my firm own its data?",
        answer:
          "Yes. Workspaces are strictly isolated per client, data is encrypted in transit and at rest, and we do not train models on customer data. Practiq is designed to sit inside the same confidentiality and privilege bar an attorney already holds.",
      },
    ],
    siblings: ["cpa-firms", "consulting-firms"],
  },

  "hr-consultants": {
    slug: "hr-consultants",
    label: "Boutique HR Consultancies",
    singular: "boutique HR consultancy",
    utmSource: "for-hr-consultants",
    kicker: "For boutique HR consultancies",
    // Hero source: §HR-C3 (hillbobagins, r/humanresources, 1 up, 2025-06)
    // — verbatim "it's like having one foot in 10-20 different companies."
    // The cleanest articulation of the fractional condition in HR
    // consultant words. Strategic constraint (Wave 18a): less emotive, more
    // peer-competent voice than CPA/law — HR consultants live on
    // LinkedIn, not Reddit. See voc-for-verticals-2026-05-13.md §HR.
    heroTitle: "One foot in 10–20 companies. We remember which one.",
    // Subhead source: §HR-C1 (Donut-sprinkle, 6 ups) + §HR-C2 (MHIMRollDog,
    // 3 ups, both 2025-06) — three independent commenters converge on
    // "super organized" as the gating skill. Practiq is, literally,
    // organization-as-a-service. Tone: peer-competent, not pain-vented.
    heroSubtitle:
      "Fractional HR is, in your peers' own words, “super organized” as a job description. Practiq is the workspace that ships the organization layer pre-built — per-client policy state, jurisdiction map, open situations, and tone — so the senior-touch part scales and the handholding part doesn't have to.",
    // Lead source: §HR-C5 (mdhugh859, 78 ups, 2025-11) — "I built onboarding
    // automations where each step triggers automatically" + §HR-C6
    // (CoachAF208, 382 ups, 2025-10) — "AI to translate my bluntness into
    // HR corporate-speak." These are the playbooks HR-of-one already runs
    // by hand. Practiq ships them out of the box.
    leadParagraph:
      "Practiq is the workspace for fractional HR and HR-advisory firms supporting 20–75 client companies at once. The agent ships the playbooks your peers are already hand-building in Claude — compliance summaries, onboarding triggers, client-specific tone — so a thoughtful HR-of-one can run a real book without rebuilding the system every week.",
    metaTitle:
      "Practiq for Boutique HR Consultancies — workspace for fractional HR",
    metaDescription:
      "Workspace for fractional HR firms supporting 20–75 companies. Per-client policy state, jurisdiction map, client-specific tone — pre-built, not hand-built.",
    keywords: [
      "fractional HR workspace",
      "HR consultancy software",
      "boutique HR consulting tools",
      "HR advisory firm workspace",
      "multi-client HR management",
      "fractional HR consultant tools",
      "HR consulting organization",
      "SMB HR advisory",
    ],
    // Inline quote sources:
    // 1. §HR-C3 — hillbobagins, r/humanresources, 1 up, 2025-06. Low upvote
    //    but the cleanest verbatim "foot in 10-20 companies" articulation.
    // 2. §HR-C6 — CoachAF208, r/humanresources, 382 ups, 2025-10. HR's
    //    actual AI use: tone-shifting client communications. High signal.
    painQuotes: [
      {
        quote:
          "On the flip side, it's like having one foot in 10–20 different companies. You aren't quite part of any.",
        subreddit: "r/humanresources",
        persona: "Fractional HR consultant, 2025-06",
      },
      {
        quote:
          "I've started using AI to 'translate' my bluntness into HR corporate-speak and the results have been [shocking].",
        subreddit: "r/humanresources",
        persona: "HR-of-one, 382 upvotes, 2025-10",
      },
    ],
    workflows: [
      {
        title: "Multi-state compliance scan",
        description:
          "Each night the agent reads each client's posture across the states they employ in and flags what is due, what is drifting, and which client needs a conversation this week. The advisor spends Monday on the conversation, not on the search.",
      },
      {
        title: "Handbook revision draft",
        description:
          "When state law or firm playbook changes, the agent drafts the redline against each client's current handbook, scoped to the jurisdictions that apply. Every change is cited to the controlling rule and to the firm's prior position.",
      },
      {
        title: "Advisory queue across the book",
        description:
          "The agent assembles a single morning queue: which clients have an open employee situation, which need a comp-band review, and which are approaching a renewal — across 20 to 75 companies in one view.",
      },
      {
        title: "Difficult-conversation prep",
        description:
          "For terminations, performance plans, and PIP conversations, the agent pulls the relevant policy, the client's prior pattern, and the firm's playbook for the situation — so the advisor walks in prepared, not improvising.",
      },
      {
        title: "Cross-client knowledge memory",
        description:
          "Playbooks, templates, and hard conversations the firm has already navigated stay in the workspace. When a junior consultant joins or a senior rolls off, the firm's HR IP stays put.",
      },
    ],
    faqs: [
      {
        question: "What does an AI-Native agent do for a boutique HR consultancy?",
        answer:
          "It holds every client's HR posture — employee counts, jurisdictions, open situations, handbook state — and drafts the morning advisory queue across the full book. The advisor spends the week on judgment, not on multi-state compliance research.",
      },
      {
        question: "How is Practiq different from BambooHR for HR consultants?",
        answer:
          "BambooHR is the HRIS the client uses internally. Practiq is the advisory firm's workspace — where the memory and judgment of serving 30 companies at once lives. The HRIS stays with the client; the context stays with the firm.",
      },
      {
        question: "Does the AI give HR or legal advice?",
        answer:
          "No. The agent drafts, summarizes, and flags — it does not make employment-law judgments. Every policy, decision, and difficult conversation stays under the HR advisor's professional responsibility.",
      },
      {
        question: "How is Practiq different from a PEO?",
        answer:
          "PEOs take legal co-employment of the client's staff. Practiq sits inside the advisory firm and never touches employment. Many users advise clients on whether a PEO is right for them — Practiq is the workspace where that advisory work happens.",
      },
    ],
    siblings: ["consulting-firms", "marketing-agencies"],
  },

  "marketing-agencies": {
    slug: "marketing-agencies",
    label: "Boutique Marketing Agencies",
    singular: "boutique marketing agency",
    utmSource: "for-marketing-agencies",
    kicker: "For boutique marketing agencies",
    // Hero source: §Marketing-D1 (czerrr, r/agency, 129 ups, 2025-12) —
    // verbatim "a lot of context switching." Strategic constraint
    // (Wave 18a): use the literal phrase "context switching" because
    // that's the customer's pain word. Do NOT lead with "AI" — AI
    // fatigue is acute (§D5, §D6, §D8). The word "AI" in the hero
    // REDUCES conversion in this vertical. See
    // voc-for-verticals-2026-05-13.md §Marketing.
    heroTitle: "Context switching is the tax. We're the deduction.",
    // Subhead source: §Marketing-D2 (New-Potential2757, 18 ups, 2025-12)
    // — "26 onboardings, 26 different expectations, 26 people asking
    // 'where's my report?'" The chaos math agencies already use to
    // describe overhead.
    heroSubtitle:
      "Scaling from $500-per-client to $1K-per-client takes something — but agencies on r/agency are already exhausted by what gets pitched as that something. Practiq is not another AI tool. It's the workspace that subtracts the 26 onboardings, 26 different expectations, and 26 people asking “where's my report?” from the same client count.",
    // Lead source: §Marketing-D11 (KissyyyDoll, 2 ups, 2025-11) —
    // "founder-level attention" as the competitive moat + the non-obvious
    // insight: agency clients are watching for AI-slop deliverables
    // (§D9, §D7). Practiq is the back-office that lets the founder be
    // the founder-attention, not the substitute for it.
    leadParagraph:
      "Practiq is the workspace for 5–30 person marketing, design, and creative agencies running 15–60 accounts at once. It is the back-office that lets a founder stay founder-attention on every client as the book grows — holding each account's brand voice, prior campaigns, and pet peeves, so the strategist who switches from a B2B SaaS account to a DTC brand arrives in the right creative posture, not at the start of a discovery call.",
    metaTitle:
      "Practiq for Boutique Marketing Agencies — context switching is the tax",
    metaDescription:
      "Workspace for 5–30 person agencies running 15–60 accounts. Subtracts the 26 onboardings, 26 expectations, 26 “where's my report?” from the same client count.",
    keywords: [
      "boutique marketing agency software",
      "creative agency workspace",
      "small agency tools",
      "agency context switching",
      "agency retainer management",
      "agency client memory",
      "agency back office software",
      "founder-led agency tools",
    ],
    // Inline quote sources:
    // 1. §Marketing-D1 — czerrr, r/agency, 129 ups, 2025-12. The verbatim
    //    "context switching" use. Highest-fidelity Practiq quote for
    //    marketing.
    // 2. §Marketing-D2 — New-Potential2757, r/agency, 18 ups, 2025-12.
    //    The 26-onboardings chaos math.
    painQuotes: [
      {
        quote:
          "For a long time, our pricing was around $500/month. It worked, but it also meant a lot of clients, a lot of context switching, and honestly a lot of unnecessary hiring due to having too much chaos with so many clients.",
        subreddit: "r/agency",
        persona: "Agency owner, 129 upvotes, 2025-12",
      },
      {
        quote:
          "At $250/client you need 26 clients to hit $6.5k. That's 26 onboardings, 26 different expectations, 26 people asking ‘where's my report?’ At $1k/client you need 6. Same money, 1/4 the chaos.",
        subreddit: "r/agency",
        persona: "Agency owner, 18 upvotes, 2025-12",
      },
    ],
    workflows: [
      {
        title: "Brand-voice draft in the account's tone",
        description:
          "Email, social post, or short copy block — the agent drafts in the brand's documented voice (loaded from past approved deliverables) and flags every line that drifts from prior approved campaigns.",
      },
      {
        title: "Scope-creep scan across retainers",
        description:
          "Each night the agent reads activity across active accounts and flags retainers trending over hours, small \"can you also…\" requests that have grown into deliverables, and conversations that should become change orders.",
      },
      {
        title: "Campaign brief from the workspace memory",
        description:
          "Pull every relevant prior campaign, the brand's no-go list, the client's documented audience hypotheses — and the agent assembles a draft brief for the strategist to refine, not start from scratch.",
      },
      {
        title: "Account QBR / status pack draft",
        description:
          "Quarterly review packs draft themselves from what was shipped, what moved, and what is in flight — the account lead spends the prep on the story, not on assembling the deck.",
      },
      {
        title: "Onboarding the new strategist on an account",
        description:
          "When a strategist joins or rolls off, the account's creative IP stays in the workspace. The new owner reads one page and is up to speed — instead of three weeks of back-and-forth.",
      },
    ],
    faqs: [
      {
        question:
          "What does an AI-Native agent do for a boutique marketing agency?",
        answer:
          "It holds every account's brand voice, prior campaigns, and account-lead notes — and drafts in that voice on demand. Overnight, it scans for scope creep, stalled deliverables, and retainer overrun, so account leads arrive Monday with a real picture of the book.",
      },
      {
        question: "How is Practiq different from Asana for agencies?",
        answer:
          "Asana is a task / project tracker. Practiq is the account-level workspace and memory layer above it. Your task tracker keeps doing what it is good at; Practiq is where the story of each account lives — decisions, preferences, voice, history.",
      },
      {
        question: "Does the AI do creative work?",
        answer:
          "No. The agent handles context, priority, and first-draft client communications in the account's voice. Concepts, strategy, and creative direction stay with the agency. \"AI that makes the ads\" is not what boutique agency clients are hiring you for.",
      },
      {
        question: "Can my agency own its account data?",
        answer:
          "Yes. Each account is a strictly isolated workspace, data is encrypted in transit and at rest, and we do not train models on customer data. Account IP stays with the agency, not with a model.",
      },
    ],
    siblings: ["consulting-firms", "hr-consultants"],
  },

  "consulting-firms": {
    slug: "consulting-firms",
    label: "Boutique Consulting Firms",
    singular: "boutique consulting firm",
    utmSource: "for-consulting-firms",
    kicker: "For boutique consulting firms",
    // Hero source: §Consulting-E6 (extratoastedcheezeit, r/consulting, 357
    // ups, 2026-04) — verbatim "ChatGPT or LLMs in general are only as
    // smart as an associate or entry level employee." Strategic
    // constraint (Wave 18a): position Practiq as "associate, not partner."
    // Boutique consultants are POST-AI and *ashamed of the hype* (§E4,
    // §E11, §E12 — three independent quotes). Don't say "AI consulting
    // platform" — they roll their eyes. See
    // voc-for-verticals-2026-05-13.md §Consulting.
    heroTitle: "An associate, not a partner. Practiq drafts. You judge.",
    // Subhead source: §Consulting-E3 (JGlover92, r/consulting, 429 ups,
    // 2026-04) — "partners review slots for deliverables have gone from
    // an hour or two to 15 minutes. I'm sure you're reading the entirety
    // of this 70 slide deck in that time mate." Highest-rated comment on
    // highest-rated 2026 consulting thread. Practiq prepares the
    // 15-minute review window.
    heroSubtitle:
      "Partners now review 70-slide decks in 15 minutes. Practiq spent the night getting it ready — pulling the framework that worked last time, surfacing the slide that needs to land, and flagging the stakeholder who is waiting — so the 15 minutes goes to judgment, not catch-up.",
    // Lead source: §Consulting-E1 + §E2 (aimoony, 41 ups, 2025-09) —
    // "Solo fractional CIO (~$250/hr) with happy clients and steady work.
    // I'm spending too much time on delivery/generalist work and not
    // enough on sales." The textbook Practiq buyer. Combined with §E5
    // (Efficient_Degree9569, 287 ups) — "I've done it 50 times so I know
    // where it breaks." Expertise-first frame, not AI-substitute frame.
    leadParagraph:
      "Practiq is the workspace for 5–40 person consulting boutiques running 20–100 simultaneous engagements. It is the engagement-manager hire without the salary — holding scope, stakeholders, prior decks, and the framework you have done 50 times so you know where it breaks. The agent draws from your firm's own corpus, never the open web by default, so the IP that distinguishes you stays yours.",
    metaTitle:
      "Practiq for Boutique Consulting Firms — associate, not partner",
    metaDescription:
      "Workspace for 5–40 person consulting boutiques running 20–100 engagements. Associate-level drafting, partner-level judgment. Your IP stays yours.",
    keywords: [
      "boutique consulting firm software",
      "small consulting firm workspace",
      "fractional consultant tools",
      "engagement memory workspace",
      "consulting deck review tools",
      "consulting IP retention",
      "boutique consultancy tools",
      "engagement manager software",
    ],
    // Inline quote sources:
    // 1. §Consulting-E3 — JGlover92, r/consulting, 429 ups, 2026-04. The
    //    highest-rated comment on the highest-rated 2026 consulting thread.
    //    Partner-bottleneck pattern, copy-ready.
    // 2. §Consulting-E6 — extratoastedcheezeit, r/consulting, 357 ups,
    //    2026-04. The "associate, not partner" metaphor consultants
    //    already use.
    painQuotes: [
      {
        quote:
          "Partners review slots for deliverables have gone from an hour or two to 15 minutes. I'm sure you're reading the entirety of this 70 slide deck in that time mate.",
        subreddit: "r/consulting",
        persona: "Consultant, 429 upvotes, 2026-04",
      },
      {
        quote:
          "ChatGPT or LLMs in general are only as smart as an associate or entry level employee. It still needs guidance, and in many cases the output has to be verified… Don't let it think for you.",
        subreddit: "r/consulting",
        persona: "Senior consultant, 357 upvotes, 2026-04",
      },
    ],
    workflows: [
      {
        title: "Engagement kickoff brief from the workspace memory",
        description:
          "When a new engagement opens, the agent assembles the kickoff brief from every prior engagement of that shape — the framework that worked, the stakeholder pattern, the typical scope traps — so the team starts from senior context, not blank.",
      },
      {
        title: "Deliverable draft in the firm's deck voice",
        description:
          "Drafts of recommendations, working sessions, and weekly updates render in the firm's deck voice — drawing on prior deliverables for the same engagement type. The partner reviews and shapes; the agent never publishes.",
      },
      {
        title: "Utilization & engagement-health scan",
        description:
          "Each night the agent reads activity across every active engagement and flags which clients have gone quiet, which deliverables are stale, and where the team is over-committed. Partners see the real book, not the optimistic one.",
      },
      {
        title: "Cross-engagement IP retention",
        description:
          "Methodologies, frameworks, and hard-won analyses stay in the workspace instead of on someone's laptop. When a senior rolls off or a junior joins, the firm's consulting IP stays put. The agent draws on that corpus, never the open web by default.",
      },
      {
        title: "Engagement context-switch prep",
        description:
          "Click into an engagement and the agent surfaces the three things that matter today — the open question, the stakeholder who is waiting, the slide that needs to land — so a partner switching from a go-to-market engagement to a cost-out engagement is already in the right head.",
      },
    ],
    faqs: [
      {
        question:
          "What does an AI-Native agent do for a boutique consulting firm?",
        answer:
          "It holds every engagement's full context — stakeholders, prior decks, the partner's frameworks — and drafts deliverables in the firm's voice. Overnight, it surfaces utilization risk and engagement health across the book so partners see the real picture.",
      },
      {
        question: "How is Practiq different from Notion for consultancies?",
        answer:
          "Notion is a generic canvas; consulting firms end up rebuilding the same client-workspace pattern in every Notion. Practiq ships that pattern with AI memory out of the box, and the tools you do keep are the ones that actually fit what they were built for.",
      },
      {
        question: "Is my engagement IP used to train models?",
        answer:
          "No. Engagement work is not used to train any models, ours or our providers'. This is table stakes for boutique consulting — your IP and your clients' strategy do not leak into someone else's model.",
      },
      {
        question: "Does it work for retainer as well as project work?",
        answer:
          "Yes. Retainers, fixed-scope projects, and hybrid engagements all map to the same client-workspace unit. The agent treats open retainers and active projects the same way: scan, flag, prioritize. Billing model is orthogonal to memory model.",
      },
    ],
    siblings: ["cpa-firms", "law-firms"],
  },
};

export const BOUTIQUE_VERTICAL_SLUGS = Object.keys(BOUTIQUE_VERTICALS);
