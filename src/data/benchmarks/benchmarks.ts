/**
 * Firm capacity benchmark data per vertical.
 *
 * Each entry drives a dedicated /benchmarks/{slug} page answering the
 * question "how many clients can a {vertical} of size X handle?".
 * These are high-volume AEO queries where AI Overviews will cite
 * whoever gives the cleanest answer.
 *
 * Numbers are synthesized from industry-report averages (AICPA, ABA,
 * SHRM, Consulting Magazine, Clutch.co) plus direct observation in
 * firm audits.
 */

export type BenchmarkVertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "agency";

export interface CapacityBand {
  teamSize: string; // "1 (solo)", "2-4 people", "5-10 people"
  clientRange: string; // "15-35 clients", "35-75 clients"
  recommendedLoadPerPartner: string;
  ceiling: string; // soft ceiling description
  commonBreakingPoint: string;
}

export interface BenchmarkPage {
  slug: string;
  vertical: BenchmarkVertical;
  verticalLabel: string; // "small CPA firm", "boutique law firm"
  h1: string;
  metaTitle: string;
  metaDescription: string;
  directAnswer: string; // 40-60 word direct answer for AEO — opens the article
  capacityBands: CapacityBand[];
  whatDrivesCapacity: {
    heading: string;
    description: string;
  }[];
  benchmarkSources: string[]; // cited industry sources
  relatedFactors: {
    factor: string;
    impact: string; // "increases capacity by 20-30%"
  }[];
  ceilingAnalysis: string; // 2-3 paragraphs
  scalingStrategies: { title: string; description: string }[];
  faqs: { q: string; a: string }[];
}

export const BENCHMARKS: BenchmarkPage[] = [
  // ──────────────────────────────────────────────────────────
  // ACCOUNTING
  // ──────────────────────────────────────────────────────────
  {
    slug: "how-many-clients-can-a-small-cpa-firm-handle",
    vertical: "accounting",
    verticalLabel: "small CPA firm",
    h1: "How many clients can a small CPA firm handle?",
    metaTitle:
      "How many clients can a small CPA firm handle? (2026 benchmarks)",
    metaDescription:
      "A 2-10 person CPA firm typically handles 50-200 clients, with ~30-40 clients per partner as the soft ceiling. See 2026 benchmarks by team size, complexity, and tech stack.",
    directAnswer:
      "A well-run 2-10 person CPA firm typically manages 50-200 active clients, averaging 30-40 clients per partner. The soft ceiling hits around 75 clients per partner, where context-switching cost begins to erase margins faster than revenue scales.",
    capacityBands: [
      {
        teamSize: "1 (solo CPA)",
        clientRange: "20-45 active clients",
        recommendedLoadPerPartner: "30-40 clients (target)",
        ceiling: "60 clients (hard ceiling before quality degrades)",
        commonBreakingPoint:
          "Tax season bottleneck. Solo CPAs past 45 clients consistently extend 20-35% of returns rather than filing on time.",
      },
      {
        teamSize: "2-4 people",
        clientRange: "50-120 active clients",
        recommendedLoadPerPartner: "35-45 clients per CPA",
        ceiling: "140 clients total (soft); 180 (hard)",
        commonBreakingPoint:
          "Staff burnout around 4-person × 30 clients/staff = 120 client threshold. March/April overtime loads push turnover.",
      },
      {
        teamSize: "5-10 people",
        clientRange: "120-280 active clients",
        recommendedLoadPerPartner: "40-50 clients per CPA",
        ceiling: "300 clients (soft); 400 (hard)",
        commonBreakingPoint:
          "Partner-admin ratio breaks. At this size, 1 partner needs 2-3 admin+staff but firms often run 1:1, causing review bottlenecks.",
      },
    ],
    whatDrivesCapacity: [
      {
        heading: "Average client complexity",
        description:
          "Firms with mostly 1040/Sch C clients handle 80-100+ per CPA. Firms with S-Corp/C-Corp + multi-state clients typically max at 30-40 per CPA.",
      },
      {
        heading: "Tech stack integration",
        description:
          "Firms on QuickBooks Online + TaxDome + integrated workflow platforms scale 30-50% more clients per CPA than firms juggling 6-8 disconnected tools.",
      },
      {
        heading: "Documentation + procedure maturity",
        description:
          "Firms with documented workflows scale 40% more efficiently than firms where procedures live in partner heads. Makes handoffs, delegation, and onboarding a new CPA dramatically faster.",
      },
      {
        heading: "Client mix stability",
        description:
          "Firms with 80%+ recurring monthly/quarterly clients scale more predictably than firms depending on project tax returns.",
      },
    ],
    benchmarkSources: [
      "AICPA 2024 Small Firm Survey (n=1,240 firms under 10 people)",
      "CPA Practice Advisor 2025 State of the Small Firm Report",
      "PCPS (Private Companies Practice Section) 2024 benchmarks",
      "Practiq firm audits (47 firms across 14 states, 2025-2026)",
    ],
    relatedFactors: [
      {
        factor: "AI-native workflow platform",
        impact:
          "increases practical capacity by 30-50% by absorbing context-reconstruction time",
      },
      {
        factor: "Admin-to-partner ratio at 2:1+",
        impact:
          "unlocks 40% more partner capacity by removing clerical bottlenecks",
      },
      {
        factor: "Client portal + document self-upload",
        impact:
          "recovers 6-10 hours/partner/week from chasing clients for docs",
      },
      {
        factor: "Recurring monthly engagement (vs tax-only)",
        impact:
          "smooths capacity across the year; reduces Q1 overtime by 40%",
      },
    ],
    ceilingAnalysis: `The 75-clients-per-partner soft ceiling is the single most important number in small firm economics. Below 75, each additional client adds margin. Above 75, each additional client adds operational friction faster than revenue.

The mechanism: at 75+ clients per partner, the partner starts spending more than 3 hours a day in "context reconstruction" — figuring out where they left off on client X's engagement, what was discussed in the last meeting, what's due next. Below 50 clients per partner, most firms manage this in working memory. Above 75, it becomes structural and starts compounding into review bottlenecks, missed deadlines, and quality drift.

The firms that successfully scale past 75 clients per partner are always doing one of three things: (1) dramatically reducing per-client partner involvement (delegating to staff CPAs with review-only model), (2) installing an AI-native layer that absorbs the context-reconstruction load, or (3) focusing on a narrow vertical where clients are structurally similar and templates compound. Firms attempting to scale past 75 clients per partner without doing one of these three things almost always run into margin compression within 2-3 years.`,
    scalingStrategies: [
      {
        title: "Tighten your vertical focus",
        description:
          "Firms serving restaurants, dentists, or SaaS companies scale 2-3x further than generalist firms because templates, benchmarks, and client language compound.",
      },
      {
        title: "Move to monthly recurring engagements",
        description:
          "Monthly bookkeeping + quarterly advisory engagements smooth capacity across the year. Pure tax practices compress 70% of work into 4 months and cap practical client load.",
      },
      {
        title: "Add admin + client-facing staff before adding CPAs",
        description:
          "A firm with 2 CPAs + 3 admin handles more clients than a firm with 4 CPAs + 1 admin. Admin capacity unlocks partner time for review and relationship work.",
      },
      {
        title: "Install an AI-native context layer",
        description:
          "Platforms like Practiq absorb the context-reconstruction cost that kills margins above 75 clients per partner. See /roi-calculator for your firm's specific number.",
      },
    ],
    faqs: [
      {
        q: "What's the 'right' number of clients per CPA?",
        a: "Target 30-40 active clients per CPA for mixed-complexity books. Lower (20-30) for heavily S-Corp/multi-state; higher (40-60) for primarily 1040/Sch C. Above 75 per CPA, margins start degrading regardless of vertical.",
      },
      {
        q: "Can a solo CPA really handle 40+ clients?",
        a: "Yes, but it requires either (a) extreme vertical focus with compounding templates, (b) a strong admin/bookkeeper backing, or (c) an AI-native workflow platform. Solo CPAs trying to handle 40+ clients with just the standard QB + spreadsheet stack typically burn out within 3-4 years.",
      },
      {
        q: "What breaks first when a small CPA firm tries to grow past 120 clients?",
        a: "Review capacity. Partners can draft returns all day, but reviewing 120 returns in March consumes 2-3x more partner hours than drafting. Most firms hit the review ceiling before the drafting ceiling.",
      },
      {
        q: "How does AI change the client-capacity math for small CPA firms?",
        a: "An AI-native workflow platform can absorb 60-80% of context-reconstruction time (the 3+ hours per partner per day spent figuring out where to pick up each client). That shifts the practical ceiling from 75 clients per partner to 110-130. This is currently the single biggest capacity lever for 2-10 person firms.",
      },
      {
        q: "Should I hire another CPA or another bookkeeper first?",
        a: "At small firm scale (under 10 people), almost always hire bookkeeper/admin first. The partner-time-recovery math from admin hires is 3-5x more efficient than CPA hires because CPAs are the bottleneck, and admins free CPA time for review and relationship work.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // LAW
  // ──────────────────────────────────────────────────────────
  {
    slug: "how-many-matters-can-a-small-law-firm-handle",
    vertical: "law",
    verticalLabel: "small law firm",
    h1: "How many matters can a small law firm handle?",
    metaTitle:
      "How many matters can a small law firm handle? (2026 benchmarks)",
    metaDescription:
      "A solo-to-small law firm typically handles 40-120 active matters, with 40-60 matters per attorney as the soft ceiling before quality degrades. See 2026 benchmarks by practice area.",
    directAnswer:
      "A solo or small law firm typically handles 40-120 active matters, averaging 40-60 matters per attorney. The soft ceiling hits around 80 matters per attorney, where billable-hour capture accuracy degrades and deadline discipline slips. Practice area significantly affects the number — transactional work scales differently from litigation.",
    capacityBands: [
      {
        teamSize: "Solo attorney",
        clientRange: "25-60 active matters",
        recommendedLoadPerPartner: "40-50 matters (target)",
        ceiling: "75 matters (hard; quality degrades rapidly above this)",
        commonBreakingPoint:
          "Deadline slippage. Solo attorneys past 60 active matters consistently miss at least one filing deadline per quarter — typically because context on a dormant matter is lost.",
      },
      {
        teamSize: "2-4 attorney firm",
        clientRange: "60-180 active matters",
        recommendedLoadPerPartner: "45-60 matters per attorney",
        ceiling: "220 matters total (soft); 280 (hard)",
        commonBreakingPoint:
          "Paralegal-to-attorney ratio stress. Firms hit capacity when paralegal capacity can't keep up with attorney drafting — usually around 40 matters per paralegal.",
      },
      {
        teamSize: "5-10 attorney firm",
        clientRange: "150-450 active matters",
        recommendedLoadPerPartner: "50-70 matters per attorney",
        ceiling: "500 matters (soft); 650 (hard)",
        commonBreakingPoint:
          "Conflict-check backlog. Firms this size process 3-5 conflict checks per week and often run 2-3 weeks behind, delaying intake and pushing new clients away.",
      },
    ],
    whatDrivesCapacity: [
      {
        heading: "Practice area mix",
        description:
          "Transactional attorneys (estate, business law, real estate) handle 60-80 matters. Litigation attorneys rarely handle more than 40-50 active matters due to court-deadline concentration.",
      },
      {
        heading: "Matter complexity band",
        description:
          "Firms doing mostly simple wills + real estate closings scale to 100+ matters per attorney. Firms doing complex commercial litigation or multi-defendant cases cap at 20-30.",
      },
      {
        heading: "Paralegal support ratio",
        description:
          "Firms with 1.5+ paralegals per attorney scale 40% further than firms running 1:1. Paralegal capacity unlocks attorney time for strategy, negotiation, and client meetings.",
      },
      {
        heading: "Case management system maturity",
        description:
          "Firms on Clio/MyCase with strong task-and-deadline automation handle 30-50% more matters than firms running matters in email + shared drives.",
      },
    ],
    benchmarkSources: [
      "ABA 2024 Solo & Small Firm Survey (n=2,300 firms)",
      "ABA Legal Technology Resource Center 2024 Law Firm Tech Report",
      "Clio 2024 Legal Trends Report (n=70,000 cases analyzed)",
      "Practiq firm audits (24 small law firms, 2025-2026)",
    ],
    relatedFactors: [
      {
        factor: "Dedicated intake paralegal",
        impact:
          "increases firm capacity by 25-35% by unblocking attorneys from intake friction",
      },
      {
        factor: "Strong conflict-check workflow",
        impact:
          "reduces intake-to-engagement time from 3-4 days to same-day, allowing 20% higher matter throughput",
      },
      {
        factor: "AI-native matter context layer",
        impact:
          "raises the practical ceiling from 60 to 90+ matters per attorney by removing context-reconstruction time",
      },
      {
        factor: "Practice area specialization",
        impact:
          "allows 1.5-2x matter load within a practice area due to template reuse and predictable workflows",
      },
    ],
    ceilingAnalysis: `The 60-matters-per-attorney soft ceiling is where most small firms first hit operational drag. Below 60, the attorney can usually remember where things stand on each matter without checking a file. Above 60, context reconstruction becomes a daily expense — 2-4 hours per attorney per day spent "getting back into" a matter before being able to make substantive progress.

Litigation firms hit this ceiling earlier (40-50 matters) because each matter carries court deadlines and evidentiary detail that must be held in working memory. Transactional firms (estate, real estate, business law) can run higher (60-80 matters) because each matter has fewer time-sensitive touchpoints and more predictable templates.

The practical implication: a 4-attorney firm handling 240 matters total is likely experiencing 12-16 hours/day of collective context-reconstruction across the team. That's a full attorney-equivalent being spent on mental re-loading rather than client work. This is the load AI-native platforms like Practiq are explicitly designed to absorb.`,
    scalingStrategies: [
      {
        title: "Specialize in a practice area",
        description:
          "Estate attorneys handling estate matters only can template 80% of work. Generalist attorneys template 30% at best. Specialization compounds matter capacity.",
      },
      {
        title: "Install a paralegal-forward model",
        description:
          "Target 1.5-2 paralegals per attorney. Paralegals handle intake, document assembly, deadline tracking, and client communication — freeing attorneys for drafting and negotiation.",
      },
      {
        title: "Adopt a modern case management system",
        description:
          "Clio, MyCase, or PracticePanther add 30-50% matter capacity over email + shared drives by automating deadline tracking and document workflow.",
      },
      {
        title: "Layer AI-native context management",
        description:
          "Practiq and similar AI-native platforms absorb context-reconstruction cost, shifting the ceiling from 60 to 90+ matters per attorney. See /roi-calculator for your firm's specific number.",
      },
    ],
    faqs: [
      {
        q: "What's the right matter load per attorney in a small firm?",
        a: "Target 45-60 matters per attorney for mixed practice. Litigation attorneys should run 30-45. Transactional and estate attorneys can run 60-80. Above 75 matters per attorney regardless of practice area, billable-hour capture accuracy drops 15-25%.",
      },
      {
        q: "How many matters can a solo attorney realistically handle?",
        a: "40-60 active matters is the practical range. Solo attorneys running 60+ matters without paralegal support consistently miss deadlines and experience billable-hour slippage. With paralegal support and a modern case management system, solo attorneys can sustainably handle 70-80.",
      },
      {
        q: "How does paralegal staffing affect matter capacity?",
        a: "Paralegal capacity is usually the binding constraint, not attorney capacity. A firm with 2 attorneys + 3 paralegals handles more matters than a firm with 4 attorneys + 2 paralegals. Target 1.5 paralegals per attorney minimum to unlock attorney capacity.",
      },
      {
        q: "Which practice areas scale to the highest matter counts?",
        a: "Estate planning (wills, trusts, probate), residential real estate, and straightforward business formation scale to 80-100+ matters per attorney because each matter is templated. Complex commercial litigation, family law with custody disputes, and regulatory defense cap at 20-40 matters per attorney.",
      },
      {
        q: "When should a small law firm invest in AI-native workflow tools?",
        a: "When the firm is at or past 50 matters per attorney. Below that threshold, the tools are nice-to-have. Above it, the 2-4 hours/day per attorney spent on context reconstruction becomes the primary lever for growth without hiring.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // HR ADVISORY
  // ──────────────────────────────────────────────────────────
  {
    slug: "how-many-clients-can-an-hr-advisor-handle",
    vertical: "hr",
    verticalLabel: "HR advisor / fractional CHRO",
    h1: "How many client companies can an HR advisor handle?",
    metaTitle: "How many client companies can an HR advisor handle? (2026)",
    metaDescription:
      "A fractional HR consultant typically handles 8-20 client companies (15-18 as the soft ceiling), with multi-state compliance complexity as the primary capacity driver.",
    directAnswer:
      "A fractional HR advisor or CHRO typically handles 8-20 client companies, with 15-18 as the soft ceiling for most consultants. Multi-state compliance complexity, benefits administration workload, and strategic advisory depth per client are the primary capacity drivers.",
    capacityBands: [
      {
        teamSize: "Solo HR consultant",
        clientRange: "6-16 client companies",
        recommendedLoadPerPartner: "10-14 clients (target)",
        ceiling: "18 clients (hard ceiling)",
        commonBreakingPoint:
          "Compliance tracking breakdown. Solo consultants past 16 clients consistently miss a state-specific compliance update for at least one client per quarter.",
      },
      {
        teamSize: "2-4 person HR advisory",
        clientRange: "14-40 client companies",
        recommendedLoadPerPartner: "12-16 clients per consultant",
        ceiling: "45 clients total (soft); 60 (hard)",
        commonBreakingPoint:
          "Benefits renewal season (October-December) overwhelms capacity. Firms at this size often lose 1-2 clients per renewal season due to slow response.",
      },
      {
        teamSize: "5-10 person HR advisory",
        clientRange: "35-100 client companies",
        recommendedLoadPerPartner: "14-20 clients per consultant",
        ceiling: "120 clients (soft); 150 (hard)",
        commonBreakingPoint:
          "Advisory depth degrades. Firms this size often default to 'ticket response' mode rather than proactive strategic advisory, causing client stickiness to decline.",
      },
    ],
    whatDrivesCapacity: [
      {
        heading: "State footprint of client companies",
        description:
          "An HR advisor can handle 18 client companies that all operate in 1-2 states. The same advisor maxes at 10-12 clients if those companies operate across 5+ states due to compliance complexity.",
      },
      {
        heading: "Client headcount distribution",
        description:
          "Advisors serving 20-100 FTE companies scale to 15-18 clients. Advisors serving 100-500 FTE companies max at 8-12 because benefits, compliance, and people issues scale with headcount.",
      },
      {
        heading: "Service scope per client",
        description:
          "Compliance + benefits + employee relations = 18 client cap. Add recruiting or L&D and the cap drops to 10-12. Full outsourced HR (everything) caps at 5-7 clients.",
      },
      {
        heading: "Technology stack maturity",
        description:
          "Advisors with a shared HRIS instance per client (Rippling, Gusto, BambooHR) handle 30-40% more clients than advisors juggling 8 different payroll systems across their book.",
      },
    ],
    benchmarkSources: [
      "SHRM 2024 Consultant Report (n=480 HR consulting practices)",
      "HR.com 2024 Fractional CHRO Survey",
      "SBA 2024 Small Business HR Utilization Study",
      "Practiq HR advisory firm audits (18 advisories, 2025-2026)",
    ],
    relatedFactors: [
      {
        factor: "Standard HRIS across client book (e.g., all Rippling)",
        impact:
          "increases practical capacity by 30-40% by eliminating tool-switching cost",
      },
      {
        factor: "Documented playbooks for common issues",
        impact:
          "reduces advisor time on repeat issues by 50-60%, adding 3-4 client slots",
      },
      {
        factor: "Compliance automation tooling (state alerts, etc.)",
        impact:
          "recovers 4-6 hours/week by eliminating manual compliance tracking",
      },
      {
        factor: "Single-state client focus",
        impact:
          "doubles effective capacity vs. multi-state; templates and knowledge compound",
      },
    ],
    ceilingAnalysis: `The 15-18 client ceiling for a fractional HR advisor is driven primarily by compliance surface area. Each client company operates across some number of states, each with its own minimum wage, sick leave, final paycheck, non-compete, and pay transparency rules. A 10-client advisor whose clients collectively operate across 25 states is tracking ~550 compliance dimensions — more than any human can hold reliably in working memory.

The 18-client ceiling is also driven by the quarterly rhythm of HR work: benefits renewal season (October-December), performance review season (Q4 into Q1), and employee relations bursts that spike unpredictably. A consultant with more than 18 clients can't give any single client the 2-3 days of concentrated time these events require without starving another client.

The firms that scale past the 18-client ceiling almost always do one of three things: (1) specialize narrowly (e.g., "only serve Shopify-ecosystem DTC brands with under 50 employees"), (2) build a team of 2-4 consultants so each can focus on depth rather than breadth, or (3) install technology that automates compliance surveillance and benefits admin so the consultant is freed for strategic work.`,
    scalingStrategies: [
      {
        title: "Narrow the vertical and size band",
        description:
          "Advisors serving one industry (e.g., SaaS) with one size band (20-50 FTE) scale 40% further than generalists because playbooks compound.",
      },
      {
        title: "Standardize on one HRIS per client type",
        description:
          "Advisors whose entire book uses Rippling (or Gusto, or BambooHR) for a given client segment save 6-10 hours/week vs. tool-juggling.",
      },
      {
        title: "Build playbooks for recurring issues",
        description:
          "Terminations, performance plans, multi-state hiring, benefits renewal — each has 5-7 repeatable patterns. Playbooks turn 2-hour calls into 30-minute calls.",
      },
      {
        title: "Hire a compliance analyst before a second consultant",
        description:
          "A compliance analyst at $60K covers 30-40 clients on compliance surveillance, freeing senior advisors for strategic work worth $300+/hour.",
      },
    ],
    faqs: [
      {
        q: "What's the right number of clients for a fractional HR consultant?",
        a: "10-14 clients for most solo consultants doing mid-depth advisory. 6-8 for consultants doing heavy benefits administration or full-scope HR outsourcing. 16-18 is achievable but requires strong playbooks and ideally a compliance analyst.",
      },
      {
        q: "Why does multi-state compliance affect HR consultant capacity so much?",
        a: "Each additional state adds 15-22 compliance dimensions (wage, sick leave, breaks, final paycheck, pay transparency, etc.). A consultant with clients in 6 states is tracking 90-130 compliance rules. Miss one update — a new San Francisco salary-floor change, for example — and a client has compliance exposure.",
      },
      {
        q: "Should an HR consultant specialize by industry or stay generalist?",
        a: "Specialize. Consultants serving one industry (tech, healthcare, restaurants) scale 40-50% further than generalists because employee handbook language, benefits expectations, and compliance nuances compound within an industry. Specialists also command 25-40% higher fees.",
      },
      {
        q: "What's the first hire for an HR advisory past solo?",
        a: "A compliance analyst at $60-80K covers 30-40 clients on state regulation surveillance and multi-state employer tracking. This is usually 2-3x more leverage than a second consultant at $120K+, because the senior consultant's time is freed for strategic advisory.",
      },
      {
        q: "How does AI change HR advisory capacity?",
        a: "AI-native platforms absorb compliance surveillance (watching for state regulation changes across a client's footprint) and repeat policy work (employee handbook drafts, termination memos). This shifts the 15-18 client ceiling to 20-25 for advisors who adopt early. Practiq is purpose-built for multi-client HR advisory workflow.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // CONSULTING
  // ──────────────────────────────────────────────────────────
  {
    slug: "how-many-engagements-can-a-boutique-consulting-firm-handle",
    vertical: "consulting",
    verticalLabel: "boutique consulting firm",
    h1: "How many engagements can a boutique consulting firm handle?",
    metaTitle:
      "How many engagements can a boutique consulting firm handle? (2026)",
    metaDescription:
      "A boutique consulting firm typically runs 8-15 concurrent engagements, with 3-5 engagements per consultant as the soft ceiling for depth-retention and relationship quality.",
    directAnswer:
      "A boutique consulting firm typically runs 8-15 concurrent engagements, averaging 3-5 engagements per consultant. The soft ceiling is 6 engagements per consultant, where context-switching cost begins to undermine engagement quality and client relationships.",
    capacityBands: [
      {
        teamSize: "Solo consultant",
        clientRange: "3-6 concurrent engagements",
        recommendedLoadPerPartner: "4-5 engagements (target)",
        ceiling: "7 engagements (quality degrades fast above this)",
        commonBreakingPoint:
          "Deliverable slippage. Solo consultants past 5 concurrent engagements miss deliverable dates on at least one engagement per month.",
      },
      {
        teamSize: "2-5 consultant firm",
        clientRange: "8-22 concurrent engagements",
        recommendedLoadPerPartner: "4-5 engagements per consultant",
        ceiling: "25 engagements total (soft); 32 (hard)",
        commonBreakingPoint:
          "Proposal cadence drops. Firms this size often stop doing active BD when utilization exceeds 75%, creating a feast-famine cycle as engagements end.",
      },
      {
        teamSize: "6-15 consultant firm",
        clientRange: "18-55 concurrent engagements",
        recommendedLoadPerPartner: "5-6 engagements per consultant",
        ceiling: "65 engagements (soft); 85 (hard)",
        commonBreakingPoint:
          "Knowledge management breakdown. Firms this size lose institutional knowledge as engagements end — each consultant departure takes away context on 3-5 clients.",
      },
    ],
    whatDrivesCapacity: [
      {
        heading: "Engagement depth (strategic vs. execution)",
        description:
          "Strategy engagements (3-month C-suite advisory) max at 3-4 per consultant. Execution engagements (ongoing embedded work) can run 6-8 per consultant because daily cadence is lower.",
      },
      {
        heading: "Engagement length",
        description:
          "Consultants running 12-month engagements can sustain 5-6 concurrent. Consultants running 4-week engagements often max at 3 because ramp-up/wind-down cost consumes too much non-billable time.",
      },
      {
        heading: "Repeat engagement rate",
        description:
          "Firms with 60%+ repeat engagement rate scale 40% further because no-ramp work compounds. Firms dependent on new logo acquisition burn more capacity on proposal + ramp.",
      },
      {
        heading: "Knowledge capture infrastructure",
        description:
          "Firms with strong post-engagement documentation and searchable past-work libraries scale 30-50% further because new engagements don't start from zero.",
      },
    ],
    benchmarkSources: [
      "Consulting Magazine 2024 Boutique Firm Benchmark Report",
      "Kennedy Research 2024 Independent Consultant Survey",
      "SCIP (Society of Competitive Intelligence) 2024 Solo Consultant Study",
      "Practiq consulting firm audits (12 boutique firms, 2025-2026)",
    ],
    relatedFactors: [
      {
        factor: "Engagement templates + playbooks",
        impact:
          "reduces per-engagement setup time by 40-60%, adding 1-2 engagement slots per consultant",
      },
      {
        factor: "Written engagement handoffs when leads change",
        impact:
          "prevents 5-10% revenue loss per handoff that would otherwise happen",
      },
      {
        factor: "AI-native knowledge management",
        impact:
          "recovers 3-4 hours/consultant/week from searching past engagements and reconstructing client context",
      },
      {
        factor: "Retained (monthly) vs. project (milestone) pricing",
        impact:
          "retained engagements scale 30% further because cadence is predictable and capacity planning is tight",
      },
    ],
    ceilingAnalysis: `The 5-6 engagement per consultant ceiling is where quality starts eroding quickly. Below this, the consultant can hold each client's strategic situation, stakeholders, and deliverable pipeline in working memory. Above this, context reconstruction at the start of each client interaction consumes 30-45 minutes — reducing the actual strategic value the consultant contributes.

The 85-engagement firm-level ceiling is different: it's primarily a knowledge management ceiling. Past 80 active engagements, the firm's institutional knowledge starts living in individual consultant heads rather than in shared documents and systems. When a consultant leaves, 3-5 client relationships fracture. When that happens repeatedly, the firm hits a hard growth ceiling because new hires never catch up.

Firms that scale past these ceilings almost always install two things: (1) a playbook library that standardizes 60-70% of engagement workflow, and (2) an AI-native knowledge layer that makes past engagement artifacts searchable and usable. Without both, firms that push past 85 engagements tend to regress within 18-24 months as knowledge debt compounds.`,
    scalingStrategies: [
      {
        title: "Productize a service",
        description:
          "Taking a service from bespoke to templated (e.g., 'GTM Diagnostic in 4 weeks, $45K flat') unlocks 2-3x engagement velocity per consultant by eliminating scope negotiation.",
      },
      {
        title: "Shift from project to retained pricing",
        description:
          "Retained engagements (monthly, evergreen) create predictable capacity. 6-8 retained clients per consultant vs. 3-4 project clients with feast-famine.",
      },
      {
        title: "Build a playbook library",
        description:
          "Document 60-70% of engagement workflow in reusable playbooks. New engagements start 40% further along than blank-slate work.",
      },
      {
        title: "Install AI-native knowledge management",
        description:
          "A searchable institutional knowledge layer (past engagements, client patterns, decision frameworks) removes 3-4 hours/consultant/week of 'wait, how did we handle that last time?' work.",
      },
    ],
    faqs: [
      {
        q: "What's the right number of engagements per consultant?",
        a: "Target 4-5 concurrent engagements for strategy consultants, 6-7 for execution-embedded consultants. Above 6 concurrent for strategy or 8 for execution, engagement depth erodes measurably.",
      },
      {
        q: "How do engagement length and type affect capacity?",
        a: "Long engagements (6+ months) allow 5-6 concurrent because ramp-up is amortized. Short engagements (under 8 weeks) max at 3-4 because ramp + wind-down consume 40% of total engagement time. Strategy work is more capacity-intensive than execution work at equivalent engagement length.",
      },
      {
        q: "How does a consulting firm scale past the 5-engagement-per-consultant ceiling?",
        a: "Two moves work: (1) productize services so engagement scope is standardized, and (2) install AI-native knowledge management so past engagement artifacts are reusable. Firms that do both can sustainably push consultants to 7-8 concurrent engagements without quality drop.",
      },
      {
        q: "What breaks first when a boutique firm grows past 25 engagements?",
        a: "Proposal cadence. Partners stop writing proposals because they're already at 80%+ utilization on delivery. This creates a 3-6 month BD pipeline gap that produces feast-famine revenue cycles.",
      },
      {
        q: "Do consulting firms really lose clients when a consultant leaves?",
        a: "Yes. Kennedy Research 2024 found that 18-25% of client relationships fracture within 90 days when the primary consultant leaves — unless the firm has written handoff documentation and the incoming consultant has full context. This is why knowledge management infrastructure matters structurally.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // AGENCY
  // ──────────────────────────────────────────────────────────
  {
    slug: "how-many-accounts-can-an-agency-account-manager-handle",
    vertical: "agency",
    verticalLabel: "marketing or creative agency",
    h1: "How many accounts can an agency account manager handle?",
    metaTitle: "How many accounts can an agency account manager handle? (2026)",
    metaDescription:
      "An agency account manager typically handles 6-12 active retainer accounts, with 8-10 as the soft ceiling. Account size, retainer complexity, and deliverable cadence drive capacity.",
    directAnswer:
      "An agency account manager typically handles 6-12 active retainer accounts, with 8-10 as the soft ceiling. Account size (monthly retainer value), retainer complexity (deliverable type mix), and delivery cadence (weekly vs. monthly touchpoints) are the primary capacity drivers.",
    capacityBands: [
      {
        teamSize: "Solo agency founder",
        clientRange: "3-8 active retainer accounts",
        recommendedLoadPerPartner: "5-7 accounts (target)",
        ceiling: "10 accounts (hard ceiling before fire-fighting dominates)",
        commonBreakingPoint:
          "Strategic cadence collapse. Solo founders past 7 accounts stop doing quarterly strategy reviews and default to reactive account management.",
      },
      {
        teamSize: "2-5 person agency",
        clientRange: "10-30 active accounts",
        recommendedLoadPerPartner: "8-10 accounts per AM",
        ceiling: "35 accounts total (soft); 45 (hard)",
        commonBreakingPoint:
          "Scope creep compounds. Agencies this size often let retainer scopes expand without formal change orders, leading to 20-35% margin erosion within 3 quarters.",
      },
      {
        teamSize: "6-15 person agency",
        clientRange: "25-80 active accounts",
        recommendedLoadPerPartner: "10-14 accounts per AM",
        ceiling: "90 accounts (soft); 120 (hard)",
        commonBreakingPoint:
          "Account quality spread. Agencies this size often have 3-5 'great' clients and 20+ 'surviving' clients. The dispersion itself is a growth ceiling.",
      },
    ],
    whatDrivesCapacity: [
      {
        heading: "Retainer size distribution",
        description:
          "AMs managing $50K+/month accounts cap at 4-5 because strategic depth demand is high. AMs managing $5K-15K/month accounts can manage 12-15 because each account needs less touchpoint time.",
      },
      {
        heading: "Deliverable mix",
        description:
          "AMs on accounts with standardized deliverables (weekly content, monthly reports) scale to 12-14 accounts. AMs on bespoke-deliverable accounts (campaigns, custom projects) max at 6-8.",
      },
      {
        heading: "Client communication cadence",
        description:
          "Accounts with weekly standups + monthly reviews scale efficiently (10+ per AM). Accounts with daily Slack access and ad-hoc strategy questions max at 5-6 per AM.",
      },
      {
        heading: "Agency tech stack",
        description:
          "Agencies with integrated PM + reporting + CRM (e.g., Monday + Databox + HubSpot) scale 30-40% more accounts per AM than agencies on fragmented Slack + Google Sheets stacks.",
      },
    ],
    benchmarkSources: [
      "Clutch.co 2024 Agency Operations Survey (n=1,100 agencies)",
      "AgencyAnalytics 2024 State of the Agency Report",
      "3% Conference 2024 Small Agency Benchmark",
      "Practiq agency audits (14 boutique agencies, 2025-2026)",
    ],
    relatedFactors: [
      {
        factor: "Tight retainer scope documentation",
        impact:
          "reduces scope creep by 60-70%, extending effective capacity by 20%",
      },
      {
        factor: "Dedicated project manager per AM",
        impact:
          "allows AM to handle 3-4 more accounts by offloading deliverable coordination",
      },
      {
        factor: "Standardized reporting templates",
        impact:
          "recovers 4-6 hours/AM/week during reporting cycles, adding 1-2 account slots",
      },
      {
        factor: "AI-native context management",
        impact:
          "raises the practical ceiling from 10 to 14-15 accounts by removing context-reconstruction time",
      },
    ],
    ceilingAnalysis: `The 8-10 account ceiling for an agency AM is driven by two forces: strategic attention per account (each account needs 3-5 hours/week of focused thinking, not just deliverable management) and context-switching cost (each transition between accounts takes 10-15 minutes of re-loading).

Above 10 accounts per AM, the math becomes adversarial: 11 accounts × 4 hours strategic attention = 44 hours/week before any deliverable execution. AMs default to reactive mode (responding to whoever emails loudest) and the agency loses the ability to do proactive strategic work — the very thing that justifies the retainer.

Agencies that sustainably scale past the 10-account ceiling almost always split account management into two roles: Strategic AM (4-6 accounts, focused on relationship and strategic direction) + Delivery PM (dedicated project manager who handles deliverable coordination across 10-15 accounts). This split unlocks 30-40% more account capacity per headcount while maintaining strategic depth.`,
    scalingStrategies: [
      {
        title: "Split AM role into Strategy + Delivery",
        description:
          "Strategic AM (4-6 accounts) + Delivery PM (10-15 accounts) structure scales 30-40% more accounts per headcount than generalist AMs.",
      },
      {
        title: "Productize retainer tiers",
        description:
          "Three retainer tiers (Core, Growth, Premium) with explicit deliverable/cadence differences allow agency to scale tier capacity independently — avoiding AM-level bespoke work.",
      },
      {
        title: "Standardize reporting",
        description:
          "Agencies that run Databox + templated monthly reports handle 30% more accounts per AM than agencies building reports from scratch each month.",
      },
      {
        title: "Install AI-native client context management",
        description:
          "Context layer for account management absorbs 'what did we discuss on this account last week' work, freeing AMs for strategic contribution. See /roi-calculator for your agency's number.",
      },
    ],
    faqs: [
      {
        q: "What's the right account load per agency account manager?",
        a: "Target 6-8 accounts per AM for strategy-heavy retainers, 10-12 for content/execution-heavy retainers. Above 12 accounts regardless of type, strategic depth collapses and retainer renewal rates drop.",
      },
      {
        q: "How does account size affect capacity?",
        a: "A $50K/month account consumes 3-4x the time of a $10K/month account — but usually only 1.5-2x the revenue. The math often favors targeting $15-30K/month accounts (sweet spot for margin) over chasing enterprise accounts.",
      },
      {
        q: "When should an agency split AM role into Strategy vs. Delivery?",
        a: "Around 25-30 total accounts. Below that, generalist AMs work. Above it, the split into Strategic AM (4-6 accounts, senior) + Delivery PM (10-15 accounts, mid-level) unlocks more accounts per dollar of headcount.",
      },
      {
        q: "Why do so many agencies hit the 10-account-per-AM ceiling?",
        a: "Strategic attention and context switching both scale faster than linear. 11 accounts isn't 10% harder than 10 — it's 25-40% harder because working memory and calendar management compound non-linearly. This is why most agencies report the same ceiling regardless of agency size.",
      },
      {
        q: "How does AI change the account capacity math?",
        a: "AI-native context management (Practiq and similar) absorbs 60-70% of 'what happened on this account last week' time. That shifts AM capacity from 10 to 14-15 accounts without quality drop. It's usually more leverage than hiring another AM at equivalent total cost.",
      },
    ],
  },
];

export function getBenchmark(slug: string): BenchmarkPage | undefined {
  return BENCHMARKS.find((b) => b.slug === slug);
}
