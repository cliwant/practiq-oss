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
    heroTitle: "AI-Native Agent for boutique CPA firms.",
    heroSubtitle:
      "Practiq is the AI workspace for 2–20 person CPA, tax, and bookkeeping firms running 50–200 client relationships. The agent scans every client overnight, prepares the deliverable before you ask, and lets a partner switch from an S-Corp to a restaurant to a 1099 in one click — with the full context already loaded.",
    leadParagraph:
      "Practiq is an AI-Native agent workspace built for boutique CPA firms — 2 to 20 person practices managing 50 to 200 clients. Where Karbon and TaxDome track tasks, Practiq holds the firm's memory: every client's quirks, prior decisions, and recurring questions live in a workspace the AI always has loaded.",
    metaTitle:
      "Practiq for Boutique CPA Firms — AI-Native Agent for 50+ clients",
    metaDescription:
      "Practiq is the AI-Native agent workspace for boutique CPA firms managing 50–200 clients. Overnight close prep, monthly memos with redline, multi-client memory.",
    keywords: [
      "boutique CPA firm software",
      "AI for CPA firms",
      "AI accounting workspace",
      "small CPA firm AI",
      "multi-client CPA tools",
      "AI-Native agent for accountants",
      "CPA firm context switching",
      "boutique accounting AI",
    ],
    painQuotes: [
      {
        quote:
          "The biggest issue isn't just volume, it's context switching. You're in the middle of something and then have to jump into a completely different client situation.",
        subreddit: "r/Accounting",
        persona: "Small accounting firm partner, busy season",
      },
      {
        quote:
          "Sometimes it feels like I'm drowning trying to manage everyone. I do trust accounting and payroll on top of the regular bookkeeping. It can feel like a lot most months.",
        subreddit: "r/Bookkeeping",
        persona: "Multi-client bookkeeper",
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
    heroTitle: "AI-Native Agent for boutique law firms.",
    heroSubtitle:
      "Practiq is the AI workspace for 2–20 attorney boutiques running 30–200 active matters. The agent reads every matter overnight, surfaces what is approaching a deadline, and drafts routine client communication in your firm's voice — every output cited to source.",
    leadParagraph:
      "Practiq is an AI-Native agent workspace for boutique law firms — solo attorneys to 20-lawyer practices managing 30 to 200 matters. The agent holds full matter context: parties, prior pleadings, deadlines, opposing-counsel behavior, and client-specific tone — so switching matters takes one click and lands the attorney already oriented.",
    metaTitle:
      "Practiq for Boutique Law Firms — AI-Native Agent for solo + small",
    metaDescription:
      "AI-Native agent workspace for boutique law firms managing 30–200 matters. Engagement letters, contract redline, deadline scans. Every output cited.",
    keywords: [
      "boutique law firm software",
      "AI for law firms",
      "small law firm AI",
      "solo attorney AI workspace",
      "AI-Native agent for lawyers",
      "boutique legal AI",
      "matter memory AI",
      "Harvey alternative small firm",
    ],
    painQuotes: [
      {
        quote:
          "200 cases of varying difficulty… I constantly feel like I have no idea what I'm doing.",
        subreddit: "r/Lawyertalk",
        persona: "New solo lawyer, 3 months in, probate / guardianship",
      },
      {
        quote:
          "It's the best of the big ai law tools. It's worse than non ai law tools in most instances.",
        subreddit: "r/legaltech",
        persona: "Lawyer evaluating Harvey",
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
    heroTitle: "AI-Native Agent for boutique HR consultancies.",
    heroSubtitle:
      "Practiq is the AI workspace for fractional HR and HR-advisory firms supporting 20–75 client companies at once. The agent holds every client's policy state, scans your book overnight for compliance drift, and drafts the Monday-morning advisory queue across multi-state, multi-jurisdiction noise.",
    leadParagraph:
      "Practiq is an AI-Native agent workspace for boutique HR consultancies — fractional HR and HR advisory firms supporting 20 to 75 client companies. The agent holds the full HR relationship per client (employee counts, jurisdictions, comp philosophy, handbook revisions) so partners can give senior-touch advisory across the full book.",
    metaTitle:
      "Practiq for Boutique HR Consultancies — AI-Native Agent",
    metaDescription:
      "AI-Native agent workspace for boutique HR advisory firms managing 20–75 clients. Multi-state compliance scans, handbook drafts, advisory queue.",
    keywords: [
      "boutique HR consulting software",
      "fractional HR AI workspace",
      "AI for HR consultants",
      "HR advisory firm AI",
      "small HR consultancy tools",
      "AI-Native agent HR",
      "multi-client HR management",
      "HR compliance AI",
    ],
    painQuotes: [
      {
        quote:
          "Sometimes it feels like I'm drowning trying to manage everyone.",
        subreddit: "r/Bookkeeping (advisory pattern that recurs in HR)",
        persona: "Multi-client advisor",
      },
      {
        quote:
          "The biggest issue isn't just volume, it's context switching. You're in the middle of something and then have to jump into a completely different client situation.",
        subreddit: "r/Accounting (advisory pattern that recurs in HR)",
        persona: "Multi-client advisor, busy season",
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
    heroTitle: "AI-Native Agent for boutique marketing agencies.",
    heroSubtitle:
      "Practiq is the AI workspace for 5–30 person marketing, design, and creative agencies running 15–60 client accounts at once. The agent holds every account's brand voice, scans for scope creep overnight, and surfaces which retainers are trending over hours before the invoicing surprise.",
    leadParagraph:
      "Practiq is an AI-Native agent workspace for boutique marketing agencies — 5 to 30 person creative shops running 15 to 60 concurrent accounts. The agent keeps every account's brand voice, prior campaigns, and the founder's three pet peeves — so a strategist switching from a B2B SaaS account to a DTC brand to a local practice arrives in the right creative posture.",
    metaTitle:
      "Practiq for Boutique Marketing Agencies — AI-Native Agent",
    metaDescription:
      "AI-Native agent workspace for boutique marketing agencies managing 15–60 accounts. Brand-voice memory, scope-creep scans, retainer monitoring.",
    keywords: [
      "boutique marketing agency software",
      "AI for marketing agencies",
      "creative agency AI workspace",
      "agency AI tools",
      "AI-Native agent agencies",
      "boutique agency AI",
      "agency retainer management AI",
      "small agency tools",
    ],
    painQuotes: [
      {
        quote:
          "The biggest issue isn't just volume, it's context switching. You're in the middle of something and then have to jump into a completely different client situation.",
        subreddit: "r/Accounting (recurs across multi-client agencies)",
        persona: "Multi-client account lead",
      },
      {
        quote:
          "I have a private wiki that I created for my business. It has all of my SOPs and an individual page for each client.",
        subreddit: "r/Bookkeeping (the workaround agencies build by hand)",
        persona: "Multi-client practitioner, 24 upvotes",
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
    heroTitle: "AI-Native Agent for boutique consulting firms.",
    heroSubtitle:
      "Practiq is the AI workspace for 5–40 person consulting boutiques running 20–100 simultaneous engagements. The agent keeps every engagement's stakeholders, prior decks, and CFO line-in-the-sand position — so partners can stay senior-touch on every client as the firm scales.",
    leadParagraph:
      "Practiq is an AI-Native agent workspace for boutique consulting firms — 5 to 40 person practices running 20 to 100 concurrent engagements. The agent holds full engagement context: scope, stakeholders, prior decks, the partner's hard-won frameworks, and the CFO's actual concerns — so switching engagements takes one click.",
    metaTitle:
      "Practiq for Boutique Consulting Firms — AI-Native Agent",
    metaDescription:
      "AI-Native agent workspace for boutique consulting firms managing 20–100 engagements. Engagement memory, utilization scans, deck IP retention.",
    keywords: [
      "boutique consulting firm software",
      "AI for consulting firms",
      "boutique consulting AI",
      "AI-Native agent consultants",
      "consulting firm tools",
      "engagement memory AI",
      "small consulting firm AI",
      "consulting deck AI",
    ],
    painQuotes: [
      {
        quote:
          "The biggest issue isn't just volume, it's context switching. You're in the middle of something and then have to jump into a completely different client situation.",
        subreddit: "r/Accounting (recurs across multi-engagement consultancies)",
        persona: "Multi-engagement partner",
      },
      {
        quote:
          "My job isn't just to do the bookkeeping. It's to build the system that delivers the bookkeeping.",
        subreddit: "r/Bookkeeping (the JTBD that translates to consulting)",
        persona: "Solo practitioner, 215-upvote insight",
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
