/**
 * Programmatic cross-competitor comparison pair specs.
 *
 * Captures query volume like "Clio vs MyCase" — people comparing two
 * competitors, not asking about Practiq directly. Practiq appears as
 * a recommended third option after the direct comparison, not as the
 * primary subject of the page.
 *
 * All slugs must match entries in competitors.ts. Most detail is
 * derived from the competitor data at render time; this spec adds only
 * the cross-pair context (vertical framing, verdict, directional pick).
 */

import type { Competitor } from "@/data/compare/competitors";

export interface VsPair {
  slug: string; // URL slug, e.g. "clio-vs-mycase"
  toolA: { slug: string; name: string };
  toolB: { slug: string; name: string };
  vertical: Competitor["vertical"];
  verticalLabel: string; // "law firms", "accounting firms", "HR advisors"
  summary: string; // 1-sentence verdict
  pickToolA: string; // 1-2 sentences: who should pick toolA
  pickToolB: string; // 1-2 sentences: who should pick toolB
  toolADoesBetter: string[]; // bullet points
  toolBDoesBetter: string[]; // bullet points
  practiqAngle: string; // how Practiq fits as a third option (neutral, not overclaiming)
}

export const VS_PAIRS: VsPair[] = [
  // ─────────────────────────────────────────────────────────────
  // LAW (3)
  // ─────────────────────────────────────────────────────────────
  {
    slug: "clio-vs-mycase",
    toolA: { slug: "clio", name: "Clio" },
    toolB: { slug: "mycase", name: "MyCase" },
    vertical: "law",
    verticalLabel: "law firms",
    summary:
      "Clio wins on ecosystem breadth and integrations; MyCase wins on billing sophistication and trust accounting. Most small firms should pick Clio by default unless billing complexity is the primary pain.",
    pickToolA:
      "Pick Clio if you want the widest integration ecosystem (300+ third-party connections), broad practice management coverage, and a proven platform that works across solo-to-midsize firms. Clio is the safe default — it fits most firm shapes and rarely forces compromises.",
    pickToolB:
      "Pick MyCase if billing and trust accounting are your top priorities. MyCase's LEDES invoicing is best-in-class for insurance defense, its IOLTA trust accounting is more mature than Clio's, and its pricing is structured to stay predictable as the firm grows.",
    toolADoesBetter: [
      "Widest integration ecosystem — 300+ third-party connections including calendaring, document management, and court filing",
      "Broader practice management feature surface — covers client intake through matter close more evenly",
      "Larger community and conference ecosystem — easier to hire staff who already know the platform",
      "Better mobile experience for attorneys working on the go",
    ],
    toolBDoesBetter: [
      "Best-in-class trust accounting with IOLTA compliance built in",
      "Native LEDES invoicing for insurance defense work — no workarounds",
      "Cleaner billing cycle management and collection tracking",
      "LawPay integration feels more native than third-party",
    ],
    practiqAngle:
      "Both Clio and MyCase manage matters, documents, time, and billing. Neither scans your open matters overnight to surface what needs attention, nor prepares draft deliverables while you sleep. Firms past 30 matters per attorney often run Clio or MyCase as the operational layer and layer Practiq on top for AI-native matter intelligence.",
  },
  {
    slug: "clio-vs-practicepanther",
    toolA: { slug: "clio", name: "Clio" },
    toolB: { slug: "practicepanther", name: "PracticePanther" },
    vertical: "law",
    verticalLabel: "law firms",
    summary:
      "Clio wins on ecosystem breadth and operational depth; PracticePanther wins on intake automation and lead conversion. Pick based on whether your primary bottleneck is delivering to clients or winning them.",
    pickToolA:
      "Pick Clio if your bottleneck is matter execution — tracking work, capturing time, issuing invoices, managing documents. Clio's 300+ integrations and mature practice management surface make it the default for firms whose new-business engine already works.",
    pickToolB:
      "Pick PracticePanther if your bottleneck is converting leads to clients. Its custom intake forms with conditional logic, lead pipeline management, and automated nurture workflows are purpose-built for firms where growth is the constraint.",
    toolADoesBetter: [
      "Matter execution across the full lifecycle from intake to close",
      "Integration ecosystem — 300+ connections vs a narrower list",
      "Trust accounting and financial reporting depth",
      "Document management and version control",
    ],
    toolBDoesBetter: [
      "Intake automation with custom conditional forms",
      "Lead pipeline management and conversion tracking",
      "Automated nurture sequences for leads",
      "CRM capabilities integrated with matter management",
    ],
    practiqAngle:
      "Clio excels at running the firm; PracticePanther excels at filling the pipeline. Neither addresses the post-intake question of 'what did we promise this client three months ago?' — a question that becomes expensive to answer past 30 active matters per attorney. Practiq is the AI-native intelligence layer that sits above either platform for matter context management.",
  },
  {
    slug: "mycase-vs-practicepanther",
    toolA: { slug: "mycase", name: "MyCase" },
    toolB: { slug: "practicepanther", name: "PracticePanther" },
    vertical: "law",
    verticalLabel: "law firms",
    summary:
      "MyCase wins on billing and trust accounting sophistication; PracticePanther wins on intake automation and lead conversion. Both start at $49/user/month — choose based on whether billing accuracy or new-business growth is your pain.",
    pickToolA:
      "Pick MyCase if billing accuracy and IOLTA trust accounting are your primary priorities. MyCase's LEDES invoicing handles insurance defense natively, its trust accounting is best-in-class, and its billing cycle management reduces collection time.",
    pickToolB:
      "Pick PracticePanther if converting leads to clients is your growth bottleneck. Its intake form customization (with conditional logic), lead pipeline tracking, and automated nurture workflows outpace MyCase on the new-business side.",
    toolADoesBetter: [
      "LEDES invoicing for insurance defense and corporate clients",
      "IOLTA trust accounting depth and state compliance",
      "Collection tracking and aging analysis",
      "LawPay integration feels native",
    ],
    toolBDoesBetter: [
      "Custom intake forms with conditional logic",
      "Lead pipeline management and conversion tracking",
      "Automated lead nurture workflows",
      "CRM capabilities for long-term client relationships",
    ],
    practiqAngle:
      "MyCase optimizes billing; PracticePanther optimizes intake. Both leave a gap in matter-level intelligence once the client is engaged. Firms past 30 matters per attorney typically need both a billing/intake platform AND a system for tracking what happens inside active matters — which is where AI-native tools like Practiq complement traditional practice management.",
  },

  // ─────────────────────────────────────────────────────────────
  // ACCOUNTING (3)
  // ─────────────────────────────────────────────────────────────
  {
    slug: "taxdome-vs-karbon",
    toolA: { slug: "taxdome", name: "TaxDome" },
    toolB: { slug: "karbon", name: "Karbon" },
    vertical: "accounting",
    verticalLabel: "accounting firms",
    summary:
      "TaxDome wins on client portal and all-in-one feature breadth; Karbon wins on team workflow and capacity visibility. Most firms pick based on whether client-facing polish or team coordination is the priority.",
    pickToolA:
      "Pick TaxDome if you want one platform covering client portal, document management, workflow, e-signature, and invoicing. TaxDome is the default choice for solo practitioners and small firms who cannot afford tool sprawl — the bundled pricing and integrated feature set reduce switching cost dramatically.",
    pickToolB:
      "Pick Karbon if team workflow and coordination are your primary bottleneck. Karbon's work item dependencies, email triage AI, and capacity visibility are best-in-class for 5+ person firms where 'who has bandwidth this week?' is a daily question.",
    toolADoesBetter: [
      "Client portal maturity — polished, modern, feature-complete",
      "Document management and e-signature integration",
      "All-in-one feature breadth reducing tool sprawl",
      "Strong for tax-season heavy workflows with seasonal client communication",
    ],
    toolBDoesBetter: [
      "Team capacity visibility and workload balancing",
      "Work item dependencies and complex workflow modeling",
      "Email triage assistant that actually helps with inbox load",
      "Better for advisory-heavy firms where coordination matters more than portal polish",
    ],
    practiqAngle:
      "TaxDome stores data about clients; Karbon tracks work through the firm. Neither scans your client portfolio overnight to detect anomalies, prepare month-end drafts, or surface what needs attention across 50+ clients. Firms that solve the portal-vs-workflow question still have the multi-client context problem — which is what AI-native platforms like Practiq address.",
  },
  {
    slug: "taxdome-vs-canopy",
    toolA: { slug: "taxdome", name: "TaxDome" },
    toolB: { slug: "canopy", name: "Canopy" },
    vertical: "accounting",
    verticalLabel: "accounting firms",
    summary:
      "TaxDome wins on general practice breadth and client portal polish; Canopy wins on tax resolution and IRS correspondence workflows. Pick based on practice focus, not feature count.",
    pickToolA:
      "Pick TaxDome if you run a general tax prep, bookkeeping, or advisory practice. TaxDome covers the common accounting firm workflows broadly and its client portal is the strongest in the category — well-suited for firms where client communication polish matters.",
    pickToolB:
      "Pick Canopy if tax resolution or IRS correspondence is a meaningful part of your practice. Canopy's unique IRS transcript access and dedicated tax resolution workflows are purpose-built for firms doing offer-in-compromise, installment agreements, and audit representation work.",
    toolADoesBetter: [
      "Client portal maturity and polish",
      "General practice workflow breadth (tax prep, bookkeeping, advisory)",
      "Document management and e-signature integration",
      "Larger community and more established partner ecosystem",
    ],
    toolBDoesBetter: [
      "IRS transcript access — unique capability Canopy ships natively",
      "Tax resolution case management workflows",
      "Better for firms where IRS correspondence is a meaningful revenue line",
      "More reasonable base-tier pricing for tax-resolution-heavy firms",
    ],
    practiqAngle:
      "TaxDome is the general practice management platform; Canopy specializes in tax resolution. Neither addresses the cross-client context problem that appears past 50 clients per professional — the 'what did we decide about this client's entity structure two years ago?' question. AI-native intelligence layers like Practiq work alongside either as capacity multipliers.",
  },
  {
    slug: "karbon-vs-canopy",
    toolA: { slug: "karbon", name: "Karbon" },
    toolB: { slug: "canopy", name: "Canopy" },
    vertical: "accounting",
    verticalLabel: "accounting firms",
    summary:
      "Karbon wins on team workflow and coordination; Canopy wins on tax resolution-specific capabilities. Different primary problems — pick based on whether your bottleneck is team coordination or IRS correspondence work.",
    pickToolA:
      "Pick Karbon if your bottleneck is team coordination — seeing who's working on what, balancing workload, managing handoffs between team members. Karbon's email triage and work dependency modeling are purpose-built for 5+ person firms.",
    pickToolB:
      "Pick Canopy if a meaningful slice of your practice is tax resolution, IRS correspondence, or audit representation. Canopy's IRS transcript access is unique, and its tax resolution workflows are mature in ways general practice management platforms are not.",
    toolADoesBetter: [
      "Team workflow visibility and capacity planning",
      "Email triage assistant for inbox overload",
      "Work item dependencies and workflow modeling",
      "Advisory practice coordination across team members",
    ],
    toolBDoesBetter: [
      "IRS transcript access with native integration",
      "Tax resolution case management",
      "Better fit for firms with significant audit representation work",
      "Integrated document management tuned for tax-specific document types",
    ],
    practiqAngle:
      "Karbon focuses on how work moves through the firm; Canopy focuses on a specific type of work (tax resolution). Firms with 50+ clients per professional face a third problem neither solves: knowing what matters most across the portfolio, and preparing deliverables before they are asked for. AI-native tools like Practiq fill that gap.",
  },

  // ─────────────────────────────────────────────────────────────
  // HR (2)
  // ─────────────────────────────────────────────────────────────
  {
    slug: "rippling-vs-gusto",
    toolA: { slug: "rippling", name: "Rippling" },
    toolB: { slug: "gusto", name: "Gusto" },
    vertical: "hr",
    verticalLabel: "HR teams and advisors",
    summary:
      "Rippling wins on mid-market scale and HR + IT + Finance consolidation; Gusto wins on SMB simplicity and payroll experience. Pick based on client size — under 100 employees Gusto, over 100 Rippling.",
    pickToolA:
      "Pick Rippling if you serve tech-forward mid-market clients (100-500 employees) or want to consolidate HR, IT, and Finance operations on one platform. Rippling's automation rules and employee lifecycle management outpace Gusto at scale.",
    pickToolB:
      "Pick Gusto if you serve SMB clients (under 100 employees) where payroll experience and accountant partner programs matter most. Gusto's payroll UX is best-in-class for small business, and its accountant partner program is the most mature in the category.",
    toolADoesBetter: [
      "Platform consolidation — HR + IT + Finance on one system",
      "Mid-market scale and international employee management",
      "Automation rules for employee lifecycle events",
      "Modern UI and developer-friendly API",
    ],
    toolBDoesBetter: [
      "Best-in-class SMB payroll experience",
      "Most mature accountant/advisor partner program",
      "Cleaner multi-state compliance at SMB scale",
      "Lower entry price point and simpler onboarding",
    ],
    practiqAngle:
      "Rippling and Gusto both excel at client-level HRIS and payroll operations. Neither provides an advisor-side workspace for HR consultants managing 20+ client relationships across different HRIS platforms. That's a different category of tool — which is why AI-native advisor workspaces like Practiq are useful for HR consulting firms regardless of which HRIS each client uses.",
  },
  {
    slug: "gusto-vs-bamboohr",
    toolA: { slug: "gusto", name: "Gusto" },
    toolB: { slug: "bamboohr", name: "BambooHR" },
    vertical: "hr",
    verticalLabel: "HR teams and advisors",
    summary:
      "Gusto wins on payroll and SMB accountant partner integration; BambooHR wins on HRIS depth and employee experience. Many firms run both: Gusto for payroll, BambooHR for HR.",
    pickToolA:
      "Pick Gusto if payroll is your primary need. Gusto's payroll UX is best-in-class for SMB, its partner program for accountants is mature, and its multi-state compliance handles complexity automatically. HRIS features are adequate but not deep.",
    pickToolB:
      "Pick BambooHR if HRIS depth and employee experience matter more than payroll sophistication. BambooHR's employee records, onboarding, PTO tracking, and performance tools are more polished than Gusto's — it's the HRIS choice for companies that care about HR as a discipline.",
    toolADoesBetter: [
      "Payroll experience and multi-state compliance",
      "Accountant/advisor partner program maturity",
      "Cleaner pricing structure ($40/month + $6/employee)",
      "Simpler onboarding for small teams",
    ],
    toolBDoesBetter: [
      "HRIS depth — onboarding, PTO, performance, employee records",
      "Polished employee-facing experience",
      "Better for 30-150 employee companies where HR is a discipline",
      "Stronger ecosystem for benefits administration integrations",
    ],
    practiqAngle:
      "Gusto optimizes for payroll; BambooHR optimizes for HRIS. Both are client-level tools — they serve the employee base, not the HR consultant managing multiple clients. For HR advisors with 20+ active clients, the advisor-side workspace problem is separate from HRIS choice. Practiq addresses that gap as an AI-native layer above whichever HRIS each client uses.",
  },

  // ─────────────────────────────────────────────────────────────
  // CROSS-VERTICAL (2)
  // ─────────────────────────────────────────────────────────────
  {
    slug: "monday-vs-asana",
    toolA: { slug: "monday", name: "Monday" },
    toolB: { slug: "asana", name: "Asana" },
    vertical: "consulting",
    verticalLabel: "consulting firms and agencies",
    summary:
      "Monday wins on visual customization and flexibility; Asana wins on task dependencies and structured workflows. Monday fits varied engagement shapes; Asana fits repeatable phased processes.",
    pickToolA:
      "Pick Monday if your engagement shapes vary significantly and you need visual flexibility. Monday's custom columns, board views, and automation rules adapt to creative agencies and strategy consulting work where structure is emergent rather than templated.",
    pickToolB:
      "Pick Asana if your work follows structured, repeatable phases with dependencies. Asana's task dependencies, timeline views, and portfolio reporting are purpose-built for structured project work where discipline matters more than flexibility.",
    toolADoesBetter: [
      "Visual customization and board flexibility",
      "Better fit for varied engagement shapes and creative work",
      "Strong automation rules and triggers",
      "Wider integration ecosystem",
    ],
    toolBDoesBetter: [
      "Task dependencies and timeline view",
      "Structured reporting across projects and portfolios",
      "Cleaner approval workflows",
      "Better discipline-enforcement for structured work",
    ],
    practiqAngle:
      "Monday and Asana both manage tasks and projects inside engagements. Neither maintains client context across engagements — the 'what did we learn about this client over the last two years?' kind of question. For firms past 15-20 active clients, project management and client intelligence become separate problems. Practiq addresses the cross-client intelligence layer.",
  },
  {
    slug: "asana-vs-clickup",
    toolA: { slug: "asana", name: "Asana" },
    toolB: { slug: "clickup", name: "ClickUp" },
    vertical: "consulting",
    verticalLabel: "consulting firms and agencies",
    summary:
      "Asana wins on focused task/project management and mature enterprise features; ClickUp wins on feature breadth and consolidation across tasks, docs, goals, and chat. Both start at $7-$11/user/month.",
    pickToolA:
      "Pick Asana if you want a focused project management tool that does its job well without feature bloat. Asana's discipline — sticking to tasks, projects, and timelines rather than expanding into docs or chat — keeps the tool learnable and workflows clean.",
    pickToolB:
      "Pick ClickUp if you want one platform covering tasks, docs, goals, chat, and more. ClickUp's feature breadth reduces tool sprawl but introduces a learning curve — it's the better choice when tool consolidation is a higher priority than tool simplicity.",
    toolADoesBetter: [
      "Focused feature set — does project management well without expanding",
      "Cleaner learning curve for new team members",
      "More mature enterprise features at the top tier",
      "Better UX for structured, dependency-heavy workflows",
    ],
    toolBDoesBetter: [
      "Feature breadth — tasks, docs, goals, chat, time tracking in one",
      "Lower per-user pricing ($7 vs $11/user/month)",
      "More flexible view options (list, board, calendar, Gantt)",
      "Active development cadence — new features ship frequently",
    ],
    practiqAngle:
      "Asana and ClickUp both track work within engagements. Neither scans client activity overnight, prepares status reports before they are asked for, or maintains long-term client context across projects. For consulting firms past 15-20 active clients, AI-native intelligence layers like Practiq become differentiating — they handle the 'what's happening across all clients this week?' question that project management tools do not answer.",
  },

  // ─────────────────────────────────────────────────────────────
  // AGENCY (2)
  // ─────────────────────────────────────────────────────────────
  {
    slug: "hubspot-vs-monday",
    toolA: { slug: "hubspot", name: "HubSpot" },
    toolB: { slug: "monday", name: "Monday" },
    vertical: "agency",
    verticalLabel: "marketing agencies",
    summary:
      "HubSpot wins on marketing automation and inbound CRM; Monday wins on project management and visual workflow flexibility. Different tool categories — many agencies run both.",
    pickToolA:
      "Pick HubSpot if marketing automation (email nurture, content marketing, lead scoring) is a meaningful part of agency operations. HubSpot's partner program, marketing automation depth, and integrated CRM make it the default for agencies doing inbound marketing at scale.",
    pickToolB:
      "Pick Monday if project management and campaign execution are your primary needs. Monday's visual board customization, automation rules, and campaign template capabilities fit varied agency work better than HubSpot's PM features (which are secondary to marketing automation).",
    toolADoesBetter: [
      "Marketing automation depth — email nurture, content, lead scoring",
      "CRM integrated with marketing workflow",
      "Partner program for agencies with commission splits",
      "Mature inbound marketing methodology and training resources",
    ],
    toolBDoesBetter: [
      "Visual project management and campaign execution",
      "Customization for varied agency engagement shapes",
      "Lower entry price ($9/user/month vs $800+/month paid HubSpot tiers)",
      "Stronger for internal agency operations vs client-facing marketing",
    ],
    practiqAngle:
      "HubSpot and Monday solve different problems — HubSpot runs client marketing, Monday runs agency projects. Neither addresses the cross-client intelligence problem for agencies past 15-20 active clients: the 'what's happening across all our accounts this week?' question. Practiq is the AI-native layer for that gap, working alongside either platform.",
  },
  {
    slug: "hubspot-vs-activecampaign",
    toolA: { slug: "hubspot", name: "HubSpot" },
    toolB: { slug: "activecampaign", name: "ActiveCampaign" },
    vertical: "agency",
    verticalLabel: "marketing agencies",
    summary:
      "HubSpot wins on feature breadth and mid-market readiness; ActiveCampaign wins on SMB pricing and focused marketing automation. Pick based on client size — mid-market HubSpot, SMB ActiveCampaign.",
    pickToolA:
      "Pick HubSpot if you serve mid-market clients where marketing automation, content marketing, and CRM depth matter more than price. HubSpot's free tier is valid for starting out, but the real value emerges at paid tiers ($800+/month) where automation and content tools unlock fully.",
    pickToolB:
      "Pick ActiveCampaign if you serve SMB clients and need affordable marketing automation at SMB prices. ActiveCampaign's $29/month entry tier and focused email + automation feature set fit agencies whose clients cannot justify HubSpot's pricing.",
    toolADoesBetter: [
      "Feature breadth — marketing + CRM + sales + service hubs",
      "Content marketing and SEO tools built in",
      "Partner program with deeper ecosystem",
      "Better fit for mid-market client marketing programs",
    ],
    toolBDoesBetter: [
      "Lower pricing — $29/month entry vs $800+/month comparable HubSpot",
      "Focused marketing automation depth without platform bloat",
      "Better fit for SMB clients and SMB-serving agencies",
      "Cleaner automation builder for email-heavy programs",
    ],
    practiqAngle:
      "HubSpot and ActiveCampaign are both client-facing marketing automation tools — they execute campaigns. Neither provides the agency-side workspace for coordinating across 20+ active clients, tracking what each client has agreed to, or maintaining institutional memory across account manager transitions. Practiq is the AI-native layer for that gap.",
  },
];

export function getVsPair(slug: string): VsPair | undefined {
  return VS_PAIRS.find((p) => p.slug === slug);
}

export function getVsPairsByVertical(
  vertical: Competitor["vertical"]
): VsPair[] {
  return VS_PAIRS.filter((p) => p.vertical === vertical);
}
