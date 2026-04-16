/**
 * Glossary data for programmatic /glossary/{slug} pages.
 *
 * 40 high-intent professional services terms engineered to capture
 * "what is X?" / "X definition" / "X meaning" long-tail queries from
 * Google and AI search engines (Perplexity, ChatGPT, Claude, Gemini).
 *
 * Each entry powers a DefinedTerm schema.org JSON-LD block — the
 * structure AI Overviews and zero-click answer engines prefer.
 *
 * Distribution (Accounting 8 / Law 8 / HR 7 / Consulting 6 / Agency 6 / Cross 5)
 */

export type GlossaryVertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "agency"
  | "cross";

export interface GlossarySource {
  name: string;
  url: string;
}

export interface GlossaryTerm {
  slug: string;
  term: string;
  shortDefinition: string;
  longDefinition: string;
  vertical: GlossaryVertical;
  relatedTerms: string[];
  examples: string;
  source: GlossarySource | null;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ─────────────────────────────────────────────
  // ACCOUNTING (8)
  // ─────────────────────────────────────────────
  {
    slug: "trial-balance",
    term: "Trial Balance",
    shortDefinition:
      "A bookkeeping worksheet listing every general ledger account and its debit or credit balance at a point in time to verify total debits equal total credits.",
    longDefinition: `<p>A trial balance is an internal accounting report that lists every active general ledger account alongside its closing debit or credit balance at a specific date. Its primary purpose is to confirm that total debits equal total credits — the fundamental mathematical check of double-entry bookkeeping.</p><p>Accountants generate trial balances at month-end, quarter-end, and year-end as the first step in the close process. If the debit and credit totals do not match, the books contain a posting error that must be located before financial statements can be prepared.</p><p>A trial balance does not prove the books are <em>correct</em> — only that they <em>balance</em>. An entry posted to the wrong account for the right amount will still balance but misrepresent the financials. Modern practice management systems for small accounting firms generate trial balances automatically from the underlying transactions, but reviewing the report remains a core responsibility of the preparer.</p><ul><li>Adjusted trial balance — after closing entries</li><li>Post-closing trial balance — after revenue and expense accounts are zeroed out</li><li>Unadjusted trial balance — before any period-end adjustments</li></ul>`,
    vertical: "accounting",
    relatedTerms: [
      "chart-of-accounts",
      "bank-reconciliation",
      "accrual-basis",
      "audit-trail",
    ],
    examples:
      "A 50-client bookkeeping firm pulls a trial balance on the first of each month for every client to confirm the prior month's books balance before starting reconciliation work. The trial balance is the seed document from which financial statements are built.",
    source: {
      name: "AICPA",
      url: "https://www.aicpa-cima.com/",
    },
  },
  {
    slug: "depreciation-schedule",
    term: "Depreciation Schedule",
    shortDefinition:
      "A fixed-asset register that tracks each capital asset's cost, useful life, depreciation method, and accumulated depreciation across its lifecycle.",
    longDefinition: `<p>A depreciation schedule is a ledger of every capitalized asset a business owns, along with the metadata required to calculate periodic depreciation expense. Typical columns include date placed in service, original cost, salvage value, useful life, depreciation method (straight-line, declining balance, MACRS), current year depreciation, and accumulated depreciation to date.</p><p>Small firms serving US clients maintain <em>two</em> depreciation schedules: book depreciation (for GAAP financial statements) and tax depreciation (for IRS purposes, typically MACRS or Section 179). The schedules diverge because book and tax rules treat useful lives and bonus depreciation differently.</p><p>The depreciation schedule is a compliance-critical document — auditors review it during year-end, and the IRS may request it during examination. Discrepancies between the fixed-asset register and the trial balance are a common audit finding. Disposal of an asset (sale, retirement, theft) requires a journal entry that removes both the asset and its accumulated depreciation.</p>`,
    vertical: "accounting",
    relatedTerms: ["trial-balance", "chart-of-accounts", "accrual-basis"],
    examples:
      "When a dental practice client purchases a $40,000 chair, the accountant adds it to the depreciation schedule with a seven-year MACRS life, generating $5,714 of first-year depreciation expense. The schedule updates automatically every close.",
    source: {
      name: "IRS Publication 946",
      url: "https://www.irs.gov/forms-pubs/about-publication-946",
    },
  },
  {
    slug: "chart-of-accounts",
    term: "Chart of Accounts",
    shortDefinition:
      "The structured list of every general ledger account a business uses to classify transactions, organized by account type and assigned numeric codes.",
    longDefinition: `<p>The chart of accounts (COA) is the backbone of a company's bookkeeping — a taxonomy that tells the accounting system where to post every transaction. A typical COA is organized in five categories (assets, liabilities, equity, revenue, expenses) with numeric prefixes: assets in the 1000s, liabilities in the 2000s, equity in the 3000s, revenue in the 4000s, and expenses in the 5000s or higher.</p><p>Designing a COA is a tradeoff between granularity (more accounts = richer analytics) and operational burden (more accounts = more bookkeeping decisions per transaction). A restaurant client needs separate food-cost, beverage-cost, and paper-goods accounts to run margin analysis; a consulting client may use a single "cost of revenue" line.</p><p>The COA is rarely stable. Accountants add, merge, and retire accounts as the business evolves. Industry-specific templates (AICPA publishes one for nonprofits; the National Restaurant Association for hospitality) provide a starting point. Firms managing 50+ clients often build their own master COA templates per vertical to standardize onboarding and benchmarking.</p>`,
    vertical: "accounting",
    relatedTerms: [
      "trial-balance",
      "bank-reconciliation",
      "accrual-basis",
      "practice-management-system",
    ],
    examples:
      "Before onboarding a new SaaS client, a fractional CFO imports a deferred-revenue-aware COA that separates MRR, one-time fees, and services revenue — the firm's analytics depend on that granularity.",
    source: {
      name: "AICPA",
      url: "https://www.aicpa-cima.com/",
    },
  },
  {
    slug: "bank-reconciliation",
    term: "Bank Reconciliation",
    shortDefinition:
      "The process of matching every transaction in a company's cash ledger against the corresponding line on the bank statement to confirm the books and the bank agree.",
    longDefinition: `<p>Bank reconciliation is a monthly (sometimes weekly) control procedure that confirms the general-ledger cash balance equals the bank's reported balance, after adjusting for timing differences. It catches errors, missing deposits, duplicate entries, and (importantly) unauthorized withdrawals that may indicate fraud.</p><p>The mechanics: pull the bank statement and the GL cash ledger for the same period, then match each transaction. Unmatched items fall into categories — <em>outstanding checks</em> (booked but not cleared), <em>deposits in transit</em> (booked but not received by the bank), <em>bank fees</em> (charged but not booked), <em>interest income</em> (received but not booked), and <em>errors on either side</em>. Each unmatched item becomes either a journal entry or a reconciling item.</p><p>For a firm managing 50–200 clients, bank reconciliation is often the single most time-consuming monthly task. Modern bookkeeping platforms auto-match transactions via bank feeds, but exceptions still require a human decision. This is the activity most commonly cited in research on multi-client context-switching cost because every client has a different chart of accounts, vendor-naming conventions, and categorization rules.</p>`,
    vertical: "accounting",
    relatedTerms: [
      "trial-balance",
      "chart-of-accounts",
      "audit-trail",
      "accrual-basis",
    ],
    examples:
      "A two-person bookkeeping firm reconciles 85 client bank accounts on the 5th of each month. Outstanding checks over 90 days old are flagged for client follow-up; unrecognized withdrawals are escalated same-day as potential fraud.",
    source: {
      name: "AICPA",
      url: "https://www.aicpa-cima.com/",
    },
  },
  {
    slug: "accrual-basis",
    term: "Accrual Basis",
    shortDefinition:
      "An accounting method that recognizes revenue when it is earned and expenses when they are incurred, regardless of when cash changes hands.",
    longDefinition: `<p>Accrual basis is one of the two primary methods of recognizing revenue and expenses (the other being cash basis). Under accrual, a company records revenue the moment it has delivered goods or services and has an enforceable right to payment — even if the customer has not yet paid. Expenses are booked when incurred, even if the bill has not been paid.</p><p>GAAP (Generally Accepted Accounting Principles) requires accrual basis for any business that issues audited financial statements or has inventory. The IRS permits cash basis for most small businesses under a gross-receipts threshold, but C corporations, partnerships with a C-corp partner, and tax shelters must use accrual.</p><p>The key mechanics: accounts receivable represents unpaid accrued revenue, accounts payable represents unpaid accrued expenses, deferred revenue represents cash received before the service is delivered, and prepaid expenses represents cash paid before the expense is consumed. A firm converting a client from cash to accrual must book these four accounts for the conversion period — a material exercise that often surfaces years of underreported or misallocated activity.</p>`,
    vertical: "accounting",
    relatedTerms: [
      "deferred-revenue",
      "trial-balance",
      "chart-of-accounts",
      "audit-trail",
    ],
    examples:
      "A fractional controller converts a 20-employee agency from cash to accrual for GAAP reporting to its new bank. The conversion adds $340K of accounts receivable and $180K of deferred revenue that had been invisible under cash basis.",
    source: {
      name: "AICPA",
      url: "https://www.aicpa-cima.com/",
    },
  },
  {
    slug: "deferred-revenue",
    term: "Deferred Revenue",
    shortDefinition:
      "A liability on the balance sheet representing cash a company has collected for goods or services it has not yet delivered.",
    longDefinition: `<p>Deferred revenue (also called unearned revenue) arises whenever a business collects cash before it has earned the corresponding revenue. Common sources include annual software subscriptions, prepaid retainers, tuition, magazine subscriptions, and upfront service fees. Because the company still owes the customer the service, the cash is a liability — not revenue — until delivery.</p><p>The accounting is straightforward but unforgiving. When a SaaS company collects $12,000 for a one-year contract, it debits cash $12,000 and credits deferred revenue $12,000. Each month, it amortizes $1,000 out of deferred revenue and into recognized revenue. By the end of month 12, deferred revenue is zero and cumulative revenue is $12,000.</p><p>Deferred revenue is heavily scrutinized during due diligence. Acquirers use the deferred-revenue waterfall to validate reported ARR (annual recurring revenue) and to reserve against refund risk. Under ASC 606 (the revenue-recognition standard), firms must evaluate performance obligations contract by contract — a complex exercise for multi-element arrangements (software + services + support).</p>`,
    vertical: "accounting",
    relatedTerms: [
      "accrual-basis",
      "chart-of-accounts",
      "trial-balance",
      "audit-trail",
    ],
    examples:
      "A SaaS bookkeeper ensures each annual contract is posted to deferred revenue at signature and amortized monthly — getting this wrong overstates current-period revenue by 12×, a finding that will fail a Series B due diligence.",
    source: {
      name: "FASB ASC 606",
      url: "https://asc.fasb.org/",
    },
  },
  {
    slug: "audit-trail",
    term: "Audit Trail",
    shortDefinition:
      "A chronological, unchangeable record of every transaction, adjustment, and user action in an accounting system, including who made the change and when.",
    longDefinition: `<p>An audit trail is the forensic backbone of any accounting system — a tamper-evident log that records every create, edit, delete, and approval event, along with the user identity, timestamp, IP address, and before/after values. Strong audit trails are a non-negotiable requirement of SOC 2, SOX, HIPAA, and most industry audits.</p><p>In practice, the audit trail serves three distinct audiences. Internal teams use it to reconstruct what happened when something looks wrong ("who deleted the December journal entry?"). External auditors use it to test control effectiveness — if the CFO is also the one posting manual journals, that's a segregation-of-duties finding. Regulators and litigators use it to prove or disprove intent in fraud cases.</p><p>The key property is immutability. A correction to a prior-period entry is posted as a new entry, not an edit — the original is preserved, the reversal is preserved, and the corrective entry is preserved. Modern platforms extend the audit trail to cover AI-assisted actions: if an automated tool re-categorized 400 transactions, the log records the AI's identity, the prompt that triggered it, and every individual decision.</p>`,
    vertical: "accounting",
    relatedTerms: [
      "trial-balance",
      "bank-reconciliation",
      "practice-management-system",
    ],
    examples:
      "When a client disputes a $12,000 vendor payment, the bookkeeper pulls the audit trail and shows the exact user, timestamp, and approving partner that authorized the release — closing the dispute in five minutes.",
    source: {
      name: "AICPA",
      url: "https://www.aicpa-cima.com/",
    },
  },
  {
    slug: "practice-management-system",
    term: "Practice Management System",
    shortDefinition:
      "Software that centralizes a professional services firm's client records, engagements, workflows, time and billing, and document management in a single workspace.",
    longDefinition: `<p>A practice management system (PMS) is the operational hub of a professional services firm. In accounting firms, a PMS typically combines client CRM, engagement tracking, workflow automation, time and billing, document management, and sometimes a client portal. Representative products include Karbon, TaxDome, Canopy, and Jetpack Workflow; the law-firm analog is systems like Clio or PracticePanther.</p><p>The PMS matters because it replaces the "12 tabs and a spreadsheet" operating model that kills scaling. Before a PMS, a firm managing 75 clients runs its close calendar out of Outlook, its workpapers out of a file share, its billing out of QuickBooks, and its engagement status out of a whiteboard. After a PMS, every client has a unified record and every engagement has a standard workflow template.</p><p>The limitation: traditional PMSes are storage and tracking systems. They record what a firm has done — they do not <em>do</em> the work. Newer AI-native workspaces (such as Practiq) layer onto or replace PMS functionality to additionally scan every client overnight, surface priorities, and prepare deliverables ahead of the team. The distinction — "PMS stores client data; AI workspace maintains live client context" — is central to the small-firm category today.</p>`,
    vertical: "accounting",
    relatedTerms: [
      "audit-trail",
      "client-onboarding",
      "client-concentration-risk",
    ],
    examples:
      "A 6-person CPA firm moves from QuickBooks + Dropbox + Outlook to Karbon as its PMS, cutting onboarding setup from 90 minutes to 15 and making cross-client workload visible to the partner for the first time.",
    source: null,
  },

  // ─────────────────────────────────────────────
  // LAW (8)
  // ─────────────────────────────────────────────
  {
    slug: "matter-management",
    term: "Matter Management",
    shortDefinition:
      "The practice of organizing all documents, communications, deadlines, tasks, and billing data associated with a single legal engagement inside one structured container called a matter.",
    longDefinition: `<p>In law practice, a <em>matter</em> is the fundamental unit of work — one lawsuit, one transaction, one regulatory filing, one estate. Matter management is the discipline (and the software category) of keeping everything associated with a matter together: client and party identities, conflict check results, retainer balances, billable time entries, work product drafts, court deadlines, and email threads.</p><p>Matter management differs from general project management in three ways. First, matters have unique confidentiality boundaries — an attorney working on Matter A must not inadvertently use information from Matter B. Second, matters have procedural deadlines (statute of limitations, court rules) where a single missed date is malpractice. Third, matters must support billable-hour recording at the task level, typically in six-minute increments.</p><p>Modern law-firm software (Clio, MyCase, PracticePanther) organizes everything around the matter. The tradeoff: every new matter requires a full onboarding — opening the matter, running a conflict check, drafting and countersigning an engagement letter, setting up the trust ledger if a retainer applies, and scaffolding the docket. Firms with 150+ active matters report this overhead as their largest non-billable time sink.</p>`,
    vertical: "law",
    relatedTerms: [
      "conflict-check",
      "iolta-account",
      "engagement-letter",
      "docketing-system",
      "billable-hour",
    ],
    examples:
      "A 5-attorney litigation boutique opens a new matter for each PI case, which auto-generates a conflict check, a trust ledger for the $2,500 retainer, and a calendar template with every statute-of-limitations and discovery deadline pre-populated.",
    source: {
      name: "American Bar Association",
      url: "https://www.americanbar.org/",
    },
  },
  {
    slug: "conflict-check",
    term: "Conflict Check",
    shortDefinition:
      "The ethics-required search of a law firm's records to determine whether taking on a prospective client or matter would create a conflict of interest with an existing or former client.",
    longDefinition: `<p>Conflict check is the first gate in any new legal engagement — required by the ABA Model Rules of Professional Conduct (Rules 1.7, 1.9, 1.10) and every state bar. Before a firm can agree to represent a new client or open a new matter, it must search its database of all current and former clients, adverse parties, opposing counsel, and related entities to confirm no conflict exists.</p><p>A conflict can be <em>actual</em> (representing both sides of a dispute), <em>positional</em> (arguing opposite legal positions for two clients), or <em>imputed</em> (one lawyer's conflict is imputed to the entire firm). The check must include not just the prospective client but also opposing parties, witnesses, corporate parents and subsidiaries, and sometimes the spouse or business partners of individuals named in the engagement.</p><p>Conflict checks in small firms are often run against a simple spreadsheet or a contact manager — a fragile system. A 10-attorney firm that has handled 3,000 matters over twenty years has hundreds of thousands of entity names to search. Modern matter-management software maintains a conflict index across every historical matter and enables full-text search with suggested typographic variants. Waivable conflicts can still proceed with written informed consent from every affected client.</p>`,
    vertical: "law",
    relatedTerms: [
      "matter-management",
      "engagement-letter",
      "retainer-agreement",
    ],
    examples:
      "A corporate attorney runs a conflict check on a prospective M&A buyer and discovers the firm represented the target's CFO in a personal tax matter three years ago — requiring a waiver from both parties before proceeding.",
    source: {
      name: "ABA Model Rule 1.7",
      url: "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_7_conflict_of_interest_current_clients/",
    },
  },
  {
    slug: "iolta-account",
    term: "IOLTA Account",
    shortDefinition:
      "A pooled trust account where attorneys hold client funds that are too small or too short-term to earn meaningful interest, with the interest remitted to the state bar to fund legal aid.",
    longDefinition: `<p>IOLTA stands for Interest on Lawyer Trust Accounts. It is a special type of attorney trust account where lawyers deposit client money they are holding temporarily — retainers, settlement proceeds, real estate closing funds — when the amounts are too small or the holding period too short for the client to realistically earn interest.</p><p>Rather than letting the bank keep the interest (or issuing thousands of dollars of interest checks to clients for a penny or two), every state bar requires participating banks to remit the pooled interest to the state IOLTA program, which funds civil legal aid for low-income residents. The program is mandatory in every state, though the specific rules and approved banks vary.</p><p>The handling rules are unforgiving. Commingling firm operating funds with client trust funds — even by a single dollar, even accidentally — is grounds for state bar discipline up to disbarment. Firms must reconcile their IOLTA account every month, maintain a separate ledger per client, and never overdraft a client's balance. Most malpractice insurers require an annual trust-account audit.</p>`,
    vertical: "law",
    relatedTerms: [
      "retainer-agreement",
      "matter-management",
      "engagement-letter",
    ],
    examples:
      "A family-law solo attorney deposits a $3,500 retainer into IOLTA, draws $175 per hour against it as work is billed, and reconciles the IOLTA ledger to the bank statement on the first of every month to avoid state bar discipline.",
    source: {
      name: "American Bar Association",
      url: "https://www.americanbar.org/groups/interest_lawyers_trust_accounts/",
    },
  },
  {
    slug: "retainer-agreement",
    term: "Retainer Agreement",
    shortDefinition:
      "A written contract between an attorney and client specifying the scope of representation, fee structure, advance payment, and terms under which the attorney will provide legal services.",
    longDefinition: `<p>A retainer agreement is the foundational contract between a lawyer and a client. It defines what the lawyer will do (scope), how the lawyer will be paid (hourly, flat fee, contingency, hybrid), how much money the client is advancing (the retainer itself), how unused funds are returned, and how and when the engagement ends. In most states, the ABA Model Rules require a written retainer for any engagement above a de minimis amount.</p><p>Three common retainer structures exist. A <em>classic retainer</em> is money paid upfront and drawn down as work is billed — the attorney places it in IOLTA and transfers to the operating account only after invoicing. An <em>evergreen retainer</em> requires the client to replenish the balance whenever it drops below a threshold. A <em>fixed-fee retainer</em> covers a defined scope of work regardless of hours.</p><p>The retainer agreement is where malpractice claims are won or lost. Ambiguity on scope ("we'll help with your divorce") invites later disputes ("you never said that didn't include the custody modification"). The American Bar Association publishes model retainer language; most experienced firms maintain vertical-specific templates (estate planning, family, criminal, M&A) and run each new engagement through an internal review.</p>`,
    vertical: "law",
    relatedTerms: [
      "iolta-account",
      "engagement-letter",
      "billable-hour",
      "matter-management",
      "contingency-fee",
    ],
    examples:
      "A bankruptcy attorney uses an evergreen retainer — the client deposits $5,000 and must replenish whenever the IOLTA balance drops below $2,000, ensuring the firm is not financing the representation.",
    source: {
      name: "American Bar Association",
      url: "https://www.americanbar.org/",
    },
  },
  {
    slug: "billable-hour",
    term: "Billable Hour",
    shortDefinition:
      "A unit of professional time spent directly serving a client and recorded against a specific matter for invoicing, typically tracked in six-minute (tenth-of-an-hour) increments.",
    longDefinition: `<p>The billable hour is both a time unit and an economic system. Invented in the 1950s by lawyer Reginald Heber Smith, it became the dominant fee model in law, accounting, and consulting. Under this model, professionals track every task against a specific client and matter, typically rounded to the nearest tenth of an hour (six minutes), and invoice the client at a per-hour rate.</p><p>The mechanics create specific operational demands. Every task gets a time entry with a narrative ("Draft response to motion to dismiss, Section II.B") that will appear on the client's invoice. Senior partners bill at $500–$1,200/hour; associates at $250–$600; paralegals at $125–$250. Target billable-hour levels for associates at large firms run 1,800–2,100 per year — implying realized working hours of 2,400–2,800.</p><p>Criticism of the billable hour has produced alternative fee arrangements (flat fees, success fees, capped fees). But the billable hour remains dominant because it transfers efficiency risk to the client. Current research estimates that 20–30% of recorded billable time is lost to inaccurate same-day recall, and 40% of firms track time reactively at week-end. AI-assisted time capture (auto-generating narratives from calendar and email activity) has become a significant area of tool investment.</p>`,
    vertical: "law",
    relatedTerms: [
      "retainer-agreement",
      "contingency-fee",
      "matter-management",
      "docketing-system",
      "utilization-rate",
    ],
    examples:
      "A litigation associate records 7.8 billable hours on a Tuesday — 2.3 drafting a motion, 1.5 on discovery review, 1.0 in a meet-and-confer call, and 3.0 at a deposition — each entry tied to the correct matter.",
    source: {
      name: "American Bar Association",
      url: "https://www.americanbar.org/",
    },
  },
  {
    slug: "contingency-fee",
    term: "Contingency Fee",
    shortDefinition:
      "A fee arrangement in which the attorney is paid only if the client wins or settles the case, typically taking a percentage of the recovery (commonly 33–40%).",
    longDefinition: `<p>A contingency fee is a success-based legal fee: if the client recovers money, the attorney gets a percentage; if the client loses, the attorney collects nothing (though the client may still owe case costs). Contingency fees make litigation economically accessible to plaintiffs who could not otherwise afford hourly rates — and they align the attorney's financial interest with the client's recovery.</p><p>The typical split is one-third if the case settles before a lawsuit is filed, 40% if it settles after filing, and up to 50% if it proceeds through trial and appeal. State bar rules govern the maximum percentage, written disclosure requirements, and which matter types may use contingency (most states prohibit contingency fees in divorce, criminal defense, and certain family law matters).</p><p>The business model is high-variance. A single large recovery can fund a plaintiff firm for years; a string of losses can bankrupt it. Firms routinely finance case costs (expert witnesses, deposition transcripts, filing fees) out of operating capital or specialized litigation-finance lenders. Every contingency firm maintains a case-selection discipline — evaluating liability, damages, collectability, and time-to-resolution — because one bad matter can consume hundreds of partner hours.</p>`,
    vertical: "law",
    relatedTerms: [
      "retainer-agreement",
      "billable-hour",
      "matter-management",
      "engagement-letter",
    ],
    examples:
      "A personal-injury firm accepts a motor-vehicle case on a one-third contingency. After nine months of discovery the insurer settles at $180,000 — the firm collects $60,000 in fees plus $7,200 in reimbursed costs.",
    source: {
      name: "American Bar Association",
      url: "https://www.americanbar.org/",
    },
  },
  {
    slug: "docketing-system",
    term: "Docketing System",
    shortDefinition:
      "A calendar and tickler system law firms use to track every court deadline, filing date, and procedural milestone across all active matters, with redundant reminders to prevent missed deadlines.",
    longDefinition: `<p>A docketing system is the deadline-management infrastructure of a law firm. It tracks statutory deadlines (statute of limitations, appeal windows), court-imposed deadlines (motion response dates, discovery cutoffs), procedural milestones (depositions, trial dates), and internal deadlines (draft reviews, client approvals). The system is designed to prevent the single most common form of legal malpractice: missing a deadline.</p><p>Robust docketing has three properties. First, deadlines are calculated automatically from triggering events — when a complaint is served, the answer deadline is computed from court rules, not entered manually. Second, reminders fire at multiple horizons (60 days, 30, 14, 7, 3, 1) and route to multiple people (associate, partner, paralegal). Third, the system integrates with court rules — PACER feeds for federal courts, state-specific rule engines — so a local rule change propagates automatically.</p><p>Dedicated docketing platforms (CompuLaw, CalendarRules, ProLaw) supplement general calendar tools because a missed court deadline can produce a six- or seven-figure malpractice claim. Paralegals often own the docketing function in small firms; large firms have dedicated docketing departments. Insurers may require docketing-system use as a condition of malpractice coverage.</p>`,
    vertical: "law",
    relatedTerms: [
      "matter-management",
      "billable-hour",
      "conflict-check",
      "engagement-letter",
    ],
    examples:
      "A 12-attorney litigation firm uses CompuLaw tied to federal and state court rules. When a new complaint is filed, the answer date and every subsequent Rule 26 deadline is computed and posted to three people's calendars automatically.",
    source: {
      name: "American Bar Association",
      url: "https://www.americanbar.org/",
    },
  },
  {
    slug: "engagement-letter",
    term: "Engagement Letter",
    shortDefinition:
      "A written communication from a professional services firm to a client confirming the scope of work, fee arrangement, responsibilities, and terms of the engagement before work begins.",
    longDefinition: `<p>The engagement letter is the contractual document that kicks off a professional services relationship — used in law, accounting, consulting, and related fields. It differs from a retainer agreement in emphasis: the engagement letter focuses on scope and professional responsibilities, while a retainer agreement typically focuses on payment terms. In practice, small-firm engagements often combine both in a single document.</p><p>A well-drafted engagement letter identifies the client (sometimes surprisingly complex — is it the company, the CEO, or both?), defines the scope of work, lists what is explicitly out of scope, specifies the fee structure, establishes billing cadence, addresses confidentiality, allocates responsibility for third-party costs, names the engagement partner, and defines the terms under which either party can terminate. It may also require the client to confirm conflicts and consent to electronic communications.</p><p>State bar rules and AICPA Code of Professional Conduct both strongly recommend (often require) engagement letters. In accounting, the AICPA publishes form engagement letters by service type (audit, tax prep, compilation). In law, every matter opened should produce a signed engagement letter filed in the matter file — this is the first document a regulator or malpractice defense counsel will ask for if something goes wrong.</p>`,
    vertical: "law",
    relatedTerms: [
      "retainer-agreement",
      "matter-management",
      "conflict-check",
      "statement-of-work-sow",
      "client-onboarding",
    ],
    examples:
      "A boutique tax CPA sends every new client a year-in-advance engagement letter by January 15, listing specifically whether K-1s, state filings, and estimated-tax work are in or out of scope — preventing December 31st scope disputes.",
    source: {
      name: "AICPA",
      url: "https://www.aicpa-cima.com/",
    },
  },

  // ─────────────────────────────────────────────
  // HR (7)
  // ─────────────────────────────────────────────
  {
    slug: "multi-state-compliance",
    term: "Multi-State Compliance",
    shortDefinition:
      "The body of wage, tax, benefits, and employment laws a company must satisfy in every US state where it has employees working, which can differ substantially from one state to the next.",
    longDefinition: `<p>Multi-state compliance is the operational challenge of running a company with employees in more than one state. Every state sets its own minimum wage, overtime rules, unemployment insurance rate, state income tax withholding, workers' compensation requirements, sick-leave mandates, final-paycheck timing rules, and employment classification tests. Most states also have unique notice requirements — new hires must be given state-specific forms on day one.</p><p>Remote work has made this far harder. A company headquartered in Austin that hires one remote employee in California now owes California SIT, CA-SDI, CA-EIT, California workers' comp, and may need to register as a foreign employer with the Secretary of State and the Franchise Tax Board. Hiring a second California employee can cross a threshold that triggers additional state leave laws (CFRA) or pay transparency obligations.</p><p>Small firms serving clients with multi-state headcount typically build compliance matrices that track, per state, which thresholds apply at what headcount and which laws activate. SHRM and state employer associations publish this data; many HR advisory firms bill specifically for keeping the matrix up to date. A missed state registration commonly results in penalty-and-interest assessments worth tens of thousands of dollars.</p>`,
    vertical: "hr",
    relatedTerms: [
      "employment-classification",
      "peo",
      "eor",
      "benefits-administration",
      "osha-compliance",
    ],
    examples:
      "A 14-person SaaS company with employees in 11 states hires an HR advisory firm to maintain its compliance matrix — the advisor catches a California pay-data reporting requirement that activates at 100 employees and flags it two quarters before the threshold.",
    source: {
      name: "SHRM",
      url: "https://www.shrm.org/",
    },
  },
  {
    slug: "employee-handbook",
    term: "Employee Handbook",
    shortDefinition:
      "A written document distributed to every employee that communicates a company's policies, procedures, benefits, expected conduct, and employment terms.",
    longDefinition: `<p>The employee handbook serves three audiences. For employees, it is a reference manual — what the vacation policy is, how to request FMLA leave, what the dress code is. For the company, it is a consistency tool — every employee operates under the same rules, and every manager applies the same standards. For regulators and plaintiffs, it is evidence — the handbook will be produced in every EEOC charge, wage-hour lawsuit, and unemployment appeal to establish what the company actually required.</p><p>A modern handbook covers at-will employment language (and its required state-specific exceptions — Montana is not at-will), equal employment opportunity, anti-harassment and anti-retaliation policies, wage-hour classification, PTO and leave, expense reimbursement, benefits eligibility, remote-work expectations, technology and social-media policies, and discipline procedures. It should be reviewed annually and anytime the company crosses a headcount threshold that triggers new compliance obligations.</p><p>Handbooks must be tailored to every state where employees work. Policies that are legal in Texas (at-will employment with no just cause required, no mandatory PTO payout at termination) can be illegal in California (final wages due on the last day, accrued vacation must be paid out). Most HR advisory firms maintain 50-state handbook templates and deliver state-specific addendums as part of onboarding.</p>`,
    vertical: "hr",
    relatedTerms: [
      "multi-state-compliance",
      "employment-classification",
      "osha-compliance",
      "benefits-administration",
    ],
    examples:
      "A five-person HR consulting shop rewrites the handbook for a 40-person client that has just hired its first Colorado employee — adding Colorado's pay-transparency, sick-leave, and equal-pay-for-equal-work provisions as a state-specific addendum.",
    source: {
      name: "SHRM",
      url: "https://www.shrm.org/",
    },
  },
  {
    slug: "peo",
    term: "PEO",
    shortDefinition:
      "A Professional Employer Organization is a firm that co-employs a company's workers, handling payroll, benefits, and HR compliance under a shared-employer arrangement in exchange for a per-employee fee.",
    longDefinition: `<p>A PEO (Professional Employer Organization) is a co-employment arrangement. The client company retains direction and control of its workers' day-to-day work; the PEO becomes the employer of record for payroll tax filings, benefits administration, workers' compensation coverage, and HR compliance paperwork. The client pays the PEO a bundled fee — usually a percentage of payroll (2–6%) or a flat per-employee-per-month (PEPM) amount ($100–$200).</p><p>The economics work because the PEO pools its clients into a single large plan. A 20-person startup cannot negotiate competitive health insurance rates on its own, but a PEO with 100,000 worksite employees can — and passes a portion of the savings to the client. The PEO also absorbs the back-office cost of payroll filings, multi-state compliance, and HR administration.</p><p>PEOs make sense for growing companies that want enterprise-grade HR without hiring an HR department. They make less sense for companies large enough to self-administer (typically 75+ employees) or companies whose benefits offering is a strategic differentiator (because PEO plans offer limited customization). Major PEOs include TriNet, Insperity, ADP TotalSource, and Justworks. PEOs are regulated at the state level; IRS certification (CPEO) offers additional tax protections.</p>`,
    vertical: "hr",
    relatedTerms: [
      "eor",
      "multi-state-compliance",
      "benefits-administration",
      "employment-classification",
    ],
    examples:
      "A 22-person agency joins TriNet as its PEO. Health insurance premiums drop 18% under the pooled plan, and the company's CFO reclaims 10 hours a month previously spent on multi-state payroll and compliance work.",
    source: {
      name: "NAPEO",
      url: "https://www.napeo.org/",
    },
  },
  {
    slug: "eor",
    term: "EOR",
    shortDefinition:
      "An Employer of Record is a third party that legally employs workers on behalf of another company, typically used to hire internationally or in US states where the company lacks legal registration.",
    longDefinition: `<p>An EOR (Employer of Record) legally hires workers for another company. Unlike a PEO — which is a <em>co</em>-employer — an EOR is the <em>sole</em> legal employer. The client company directs the work; the EOR signs the employment contract, runs payroll, administers benefits, and carries the full legal liability of the employment relationship. The EOR invoices the client for wages plus a service fee (flat monthly per-employee or a percentage).</p><p>EORs solve a specific problem: hiring a worker in a jurisdiction where the hiring company is not set up to be an employer. This could be another country (the most common use case — hiring a developer in Portugal or Argentina without establishing a legal entity there), or another US state (hiring one California employee without registering as a foreign employer with California Secretary of State, FTB, EDD, and CDTFA).</p><p>Major international EORs include Deel, Remote, Velocity Global, and Rippling. For US interstate hires, Gusto, Rippling, and many PEOs offer state-registration-as-a-service that approximates EOR for a single jurisdiction. The downside: EOR employment is more expensive per head than direct employment, and EOR workers cannot easily be moved between entities. Most scaling companies use EOR to start hiring in a country, then transition to their own local entity at 5–10 employees.</p>`,
    vertical: "hr",
    relatedTerms: [
      "peo",
      "multi-state-compliance",
      "employment-classification",
      "benefits-administration",
    ],
    examples:
      "A 30-person US SaaS company uses Deel as EOR to hire three engineers in Brazil. Each Deel-employed engineer costs the company $600/month above salary in EOR fees — far less than standing up a Brazilian legal entity.",
    source: null,
  },
  {
    slug: "employment-classification",
    term: "Employment Classification",
    shortDefinition:
      "The legal categorization of a worker as either an employee (W-2, subject to wage-hour laws) or an independent contractor (1099, self-employed), determined by a multi-factor test that varies by jurisdiction.",
    longDefinition: `<p>Employment classification is the determination — made by the IRS, the Department of Labor, and every state labor agency — of whether a given worker is an <em>employee</em> or an <em>independent contractor</em>. The question is not answered by what the parties call the relationship in a written agreement; it is answered by the actual facts of the working relationship.</p><p>The federal tests vary by agency. The IRS uses a 20-factor common-law test focused on behavioral and financial control. The DOL under the FLSA uses the six-factor economic-realities test. California uses the ABC test codified in AB-5 — the most worker-protective test in the nation, presuming employee status unless the worker is free of control (A), performs work outside the hiring entity's usual business (B), and is customarily engaged in an independent trade (C). Other states adopt one or a hybrid of these.</p><p>Misclassification is extraordinarily expensive. A misclassified worker can recover unpaid overtime, unpaid meal and rest premiums, reimbursement for business expenses, penalties, interest, and attorney fees. The IRS can collect back employment taxes (SS, Medicare, FUTA) plus a 100% trust-fund recovery penalty against responsible individuals. Exempt/non-exempt classification — a separate question <em>within</em> employee status — carries similar risk for salaried workers incorrectly exempted from overtime.</p>`,
    vertical: "hr",
    relatedTerms: [
      "multi-state-compliance",
      "peo",
      "eor",
      "employee-handbook",
      "benefits-administration",
    ],
    examples:
      'A 15-person marketing agency reclassifies three long-term "freelancers" as W-2 employees after an HR audit flags that they take direction daily, use agency equipment, and work only for the agency — avoiding a California AB-5 enforcement action.',
    source: {
      name: "IRS",
      url: "https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee",
    },
  },
  {
    slug: "benefits-administration",
    term: "Benefits Administration",
    shortDefinition:
      "The ongoing operational work of managing employee benefits — enrollment, eligibility tracking, premium collection, COBRA, compliance reporting, and vendor coordination across health, dental, retirement, and ancillary plans.",
    longDefinition: `<p>Benefits administration is the operational side of employee benefits — as distinct from benefits <em>strategy</em> (what to offer) or benefits <em>brokerage</em> (selecting carriers). The admin function covers: open-enrollment logistics, new-hire eligibility and waiting periods, life-event changes, dependent verification, premium payroll deductions, employer contribution calculations, COBRA notices and payments, 401(k) vesting and loan tracking, FSA/HSA administration, leave interactions, and compliance reporting (ACA 1094/1095, Form 5500, nondiscrimination testing).</p><p>The work scales nonlinearly with headcount. A 10-person company with one health plan might spend two hours a month on admin. A 75-person company with health, dental, vision, FSA, HSA, 401(k), life, LTD, commuter benefits, and a wellness program across four states routinely spends 20+ hours a month. Errors are expensive — a missed dependent enrollment during a qualifying event can strand a spouse without coverage for months; a missed ACA filing triggers per-form penalties.</p><p>Companies typically choose one of three models: DIY administration with spreadsheets and carrier portals (very small, growing pain starts around 20 employees); a benefits-administration platform (Gusto, Rippling, BambooHR, Zenefits) that automates workflows; or outsourcing to a PEO (fully offloaded) or a dedicated benefits broker with admin services. AI-assisted tools are now handling eligibility determinations and compliance document generation.</p>`,
    vertical: "hr",
    relatedTerms: [
      "peo",
      "eor",
      "employment-classification",
      "multi-state-compliance",
      "employee-handbook",
    ],
    examples:
      "A 35-employee company hires an HR advisory firm to manage annual benefits open enrollment — the advisor handles plan communication, eligibility tracking, carrier data feeds, and payroll integration end-to-end.",
    source: {
      name: "SHRM",
      url: "https://www.shrm.org/",
    },
  },
  {
    slug: "osha-compliance",
    term: "OSHA Compliance",
    shortDefinition:
      "The body of workplace safety requirements employers must meet under the Occupational Safety and Health Act, including hazard communication, injury recordkeeping, required training, and posted notices.",
    longDefinition: `<p>OSHA compliance is the federal (and in 22 state-plan states, state-administered) workplace-safety regime. Every covered employer must furnish a workplace "free from recognized hazards," post the OSHA "It's the Law" poster, maintain a written Hazard Communication Program, train employees on chemical and physical hazards, record injuries and illnesses on Forms 300/300A/301, and respond to employee safety complaints without retaliation.</p><p>Many employers underestimate their OSHA obligations because they imagine OSHA as a construction-and-manufacturing issue. In fact, offices, healthcare facilities, restaurants, and retail all have OSHA obligations — including ergonomic hazards, bloodborne-pathogen rules for healthcare workers, heat-illness standards for outdoor workers, COVID-era respiratory standards (in some states), and workplace-violence-prevention programs (newly enacted in California for most industries as of 2024).</p><p>The cost of noncompliance has increased sharply. Serious violations are penalized at up to $16,131 per instance (2024 adjusted); willful or repeated violations at up to $161,323 per instance. A fatality triggers a mandatory OSHA investigation and almost always multiple citations. Many HR advisory firms bundle OSHA-compliance review into a broader compliance-audit service; some offer outsourced Safety Officer duties for small clients.</p>`,
    vertical: "hr",
    relatedTerms: [
      "multi-state-compliance",
      "employee-handbook",
      "benefits-administration",
      "employment-classification",
    ],
    examples:
      "An HR consultant running an annual compliance review for a 60-person manufacturer catches that the OSHA 300A summary was never posted during the February 1–April 30 window — correcting the posting and training the designated safety coordinator before an inspector arrives.",
    source: {
      name: "OSHA",
      url: "https://www.osha.gov/",
    },
  },

  // ─────────────────────────────────────────────
  // CONSULTING (6)
  // ─────────────────────────────────────────────
  {
    slug: "statement-of-work-sow",
    term: "Statement of Work (SOW)",
    shortDefinition:
      "A project-specific contract attached to a Master Service Agreement that defines the scope, deliverables, schedule, pricing, and acceptance criteria for one engagement.",
    longDefinition: `<p>A Statement of Work (SOW) is the document that actually describes the work. It sits underneath a Master Service Agreement (MSA) — the MSA sets the legal framework (liability, IP, payment terms, confidentiality), the SOW applies that framework to a specific project with its own scope, deliverables, timeline, acceptance criteria, and fees.</p><p>A disciplined SOW includes at minimum: project background and objectives, in-scope activities, explicit out-of-scope activities (the most important section for preventing scope creep), deliverables with acceptance criteria and due dates, a project schedule, resource commitments from both sides, fees and payment schedule, change-order procedures, and sign-off requirements. Multi-phase engagements may have one SOW per phase or a single SOW with phase gates.</p><p>The SOW is where disputes are won or lost. When a client says "but I thought X was included," the SOW language is dispositive. Consulting firms typically maintain a library of SOW templates (fixed-price build, time-and-materials advisory, retainer) that include standard sections refined over dozens of prior engagements. AI-assisted tools increasingly scan draft SOWs for ambiguous language, missing deliverable criteria, and clauses that conflict with the parent MSA.</p>`,
    vertical: "consulting",
    relatedTerms: [
      "master-service-agreement-msa",
      "retainer-model",
      "deliverable-review",
      "scope-creep",
      "engagement-letter",
    ],
    examples:
      "A boutique strategy firm signs an MSA with a mid-market manufacturer, then issues three sequential SOWs — market-sizing research, strategy workshop, and implementation playbook — each with its own fee, timeline, and acceptance criteria.",
    source: {
      name: "PMI",
      url: "https://www.pmi.org/",
    },
  },
  {
    slug: "master-service-agreement-msa",
    term: "Master Service Agreement (MSA)",
    shortDefinition:
      "A long-term contract that establishes the general legal terms between a service provider and a client, under which individual project-level Statements of Work are issued over time.",
    longDefinition: `<p>A Master Service Agreement (MSA) is an umbrella contract negotiated once and then referenced across many projects. It governs the terms that rarely change from project to project — limitation of liability, indemnification, IP ownership, confidentiality, data security, payment terms, termination rights, dispute resolution, insurance requirements, and governing law. Individual projects are documented as Statements of Work that incorporate the MSA by reference.</p><p>The model exists because negotiating every single project from scratch is wasteful. A client with ten consulting projects per year across five vendors would otherwise sign fifty full contracts annually. With an MSA, each new project becomes a short SOW that takes days to finalize instead of weeks. The relationship is pre-negotiated; only the project-specific terms remain.</p><p>MSAs are most common in enterprise sales and in service categories with high repeat-business potential — consulting, IT services, marketing, design, staffing. A well-drafted MSA has a clear order-of-precedence clause (when the MSA and an SOW conflict, the SOW controls for project-specific terms but the MSA controls for legal terms). Small firms often accept clients' standard MSA templates; more mature firms bring their own paper and negotiate from it.</p>`,
    vertical: "consulting",
    relatedTerms: [
      "statement-of-work-sow",
      "retainer-model",
      "scope-creep",
      "engagement-letter",
    ],
    examples:
      "A 12-person product consultancy spends six weeks negotiating a global MSA with a Fortune 500 client. Over the next three years it issues 14 SOWs under that MSA, each signed in under 10 business days.",
    source: {
      name: "PMI",
      url: "https://www.pmi.org/",
    },
  },
  {
    slug: "retainer-model",
    term: "Retainer Model",
    shortDefinition:
      "A pricing model where a client pays a recurring fixed fee in exchange for ongoing access to a defined scope of services or hours, creating predictable revenue for the provider.",
    longDefinition: `<p>The retainer model — common in consulting, legal, marketing, and accounting — is a recurring fee structure. The client pays a monthly or quarterly amount; the provider delivers against a defined scope. The model shifts risk from the client to the provider: the client gets predictable access; the provider gets predictable revenue but carries the risk that the actual work effort exceeds the fee.</p><p>Three variations are common. A <em>general retainer</em> is an availability fee — the client buys priority access to the provider's time; work done beyond the scope is billed separately. A <em>scope retainer</em> bundles a specific package of deliverables (monthly strategy session, quarterly report, unlimited email access) for a fixed fee. A <em>hours retainer</em> prepays a bucket of hours at a discounted rate, often with rollover.</p><p>Retainers are attractive because they smooth revenue. A firm with 20 clients on $8,000 monthly retainers has $160,000 of MRR — meaningful predictability for hiring, runway, and valuation. The risk: scope creep erodes margin silently. A disciplined firm tracks actual hours against retainer scope monthly and renegotiates when utilization signals the original pricing is wrong. Some firms publish a utilization-rate dashboard to every retainer client.</p>`,
    vertical: "consulting",
    relatedTerms: [
      "master-service-agreement-msa",
      "statement-of-work-sow",
      "scope-creep",
      "utilization-rate",
      "client-retainer",
    ],
    examples:
      "A three-person HR consulting shop moves its five largest clients from hourly billing to $4,500/month retainers with defined scope. MRR becomes predictable enough to hire a junior associate.",
    source: null,
  },
  {
    slug: "utilization-rate",
    term: "Utilization Rate",
    shortDefinition:
      "The percentage of a professional's available working hours that are billable to clients, used by service firms as the primary measure of individual productivity and firm capacity.",
    longDefinition: `<p>Utilization rate is the dominant productivity metric in professional services. It is computed as billable hours divided by available working hours. A consultant with 1,800 billable hours against a 2,000-hour working year has a 90% utilization rate — an exceptional number. Industry targets vary: management consulting targets 70–85% for associates and 40–60% for partners; accounting firms target 1,400–1,700 billable hours for associates; law firms often target 1,800–2,100.</p><p>Utilization is a <em>capacity</em> metric, not a <em>profitability</em> metric. Higher utilization means the firm is converting its labor supply into billable revenue; it does not directly indicate whether the work is profitable. Realization rate — the percentage of billed hours that are actually collected — is a separate metric that measures write-downs and write-offs. Multiplying utilization × realization × average rate gives an approximate per-hour economic yield.</p><p>Over-utilization is a leading indicator of burnout and turnover. A sustainable associate utilization is typically in the 65–80% band. Under-utilization may indicate a sales or staffing-model problem. Many firms publish weekly utilization dashboards by person and team, which can become toxic if the metric displaces quality of work in management conversations.</p>`,
    vertical: "consulting",
    relatedTerms: [
      "billable-hour",
      "retainer-model",
      "scope-creep",
      "deliverable-review",
      "service-firm-benchmark",
    ],
    examples:
      "A 15-person strategy firm targets 75% utilization for senior associates. A team member running at 95% for six consecutive weeks triggers an automatic staffing review to prevent burnout.",
    source: {
      name: "SPI Research",
      url: "https://www.spiresearch.com/",
    },
  },
  {
    slug: "deliverable-review",
    term: "Deliverable Review",
    shortDefinition:
      "The formal process of evaluating a consultant's or service provider's output against the agreed acceptance criteria before the client accepts it and releases payment.",
    longDefinition: `<p>Deliverable review is the acceptance checkpoint at the end of a project phase. The consultant submits a deliverable (report, recommendation, code, design, workshop); the client reviews it against the criteria defined in the SOW; the client either accepts it, requests revisions, or rejects it. Acceptance typically triggers invoicing; rejection triggers a dispute process.</p><p>Good deliverable review has three properties. First, the <em>acceptance criteria</em> are explicit and measurable — "a 30-page market-sizing report covering X, Y, Z with primary source citations" rather than "a good market-sizing report." Second, there is a <em>defined review window</em> — typically 5–10 business days, after which the client is deemed to have accepted. Third, there is a <em>defined revision loop</em> — usually one or two rounds of included revisions, after which additional work is billed as a change order.</p><p>Ambiguous deliverable review is the number-one cause of project-level disputes. A client who drags a review for six weeks has effectively extended the project at the consultant's expense; a consultant who delivers against a vague criterion invites endless revisions. Internal review — the consulting firm's own pre-submission QA — is equally important; firms typically run every client-facing deliverable through a senior partner or dedicated QA reviewer before release.</p>`,
    vertical: "consulting",
    relatedTerms: [
      "statement-of-work-sow",
      "master-service-agreement-msa",
      "scope-creep",
      "retainer-model",
    ],
    examples:
      "A market-research consultancy ships a 48-page report on day 22 of a 30-day engagement. The SOW's review window is 10 business days; on day 32 the client has not responded, and the firm invoices the milestone as deemed accepted.",
    source: {
      name: "PMI",
      url: "https://www.pmi.org/",
    },
  },
  {
    slug: "scope-creep",
    term: "Scope Creep",
    shortDefinition:
      "The gradual expansion of a project's work beyond the originally defined scope, typically without corresponding increases in fees or timeline, which erodes margin and triggers team burnout.",
    longDefinition: `<p>Scope creep is the incremental addition of work to an engagement after the SOW has been signed. It usually arrives as small, reasonable-sounding requests — "while you're at it, can you also look at…" — that each feel too minor to push back on but that cumulatively transform a 200-hour engagement into a 350-hour engagement. The consulting firm absorbs the cost; the client perceives a generous vendor.</p><p>Two patterns drive scope creep. First, <em>scope ambiguity in the SOW</em> — if the scope language is not crisp, reasonable interpretations on both sides will diverge. Second, <em>relationship asymmetry</em> — a junior consultant on the client side asks a junior consultant on the firm side for an additional analysis, and neither person is empowered to say "that requires a change order." Both patterns are preventable with better contracts and better project management discipline.</p><p>The countermeasure is a <em>change-order process</em>: any request that extends scope triggers a written change order describing the added work, the revised fee, and the revised timeline. Disciplined firms train their consultants to say "happy to do that — let me put together a quick change order so we have it documented" instead of silently absorbing the work. PMI certifies change-control processes as part of the project-management body of knowledge.</p>`,
    vertical: "consulting",
    relatedTerms: [
      "statement-of-work-sow",
      "master-service-agreement-msa",
      "utilization-rate",
      "deliverable-review",
      "retainer-model",
    ],
    examples:
      'A 10-week implementation engagement grows to 16 weeks as the client keeps adding "small" additions. The consulting firm writes four change orders totaling an extra $70,000 — recovering margin and resetting the client\'s expectations on how scope is managed.',
    source: {
      name: "PMI",
      url: "https://www.pmi.org/",
    },
  },

  // ─────────────────────────────────────────────
  // AGENCY (6)
  // ─────────────────────────────────────────────
  {
    slug: "account-manager",
    term: "Account Manager",
    shortDefinition:
      "The person inside a marketing or creative agency who owns the day-to-day client relationship, translates client needs into internal briefs, and coordinates the delivery team.",
    longDefinition: `<p>The Account Manager (AM) is the agency-side owner of the client relationship. They sit at the intersection of client demands and internal capacity — translating a client's desire into an internal brief, staffing the brief, managing the delivery timeline, presenting work back to the client, handling revisions, and collecting payment. AMs are not generally the creative or strategic leads; they are the <em>integrator</em> who makes sure work ships.</p><p>The role varies with agency size. At a small shop, one AM may run five clients and also handle strategy, project management, and billing. At a mid-market agency, AMs lead a client team that includes a strategist, a creative director, and producers; the AM is accountable for client satisfaction and account profitability. At a large holding-company agency, AMs sit in a formal Account Management department with distinct AM 1/AM 2/AM 3/Director tiers.</p><p>Strong AMs are measured on three things — client retention (do clients renew?), account growth (does revenue per client expand?), and team health (do creatives want to work on this AM's accounts?). The hardest part of the job is saying "no" to scope creep without damaging the relationship. Most agencies over-index on client satisfaction and under-invest in AM training, creating turnover in the exact role where continuity matters most.</p>`,
    vertical: "agency",
    relatedTerms: [
      "client-retainer",
      "campaign-brief",
      "creative-review",
      "client-lifetime-value-clv",
      "brand-guidelines",
    ],
    examples:
      "A boutique brand agency assigns a senior Account Manager to its seven largest retainer clients. The AM runs weekly status calls, owns the brief for every new project, and personally presents final deliverables — lifting client renewal rate from 62% to 84%.",
    source: {
      name: "4A's",
      url: "https://www.aaaa.org/",
    },
  },
  {
    slug: "client-retainer",
    term: "Client Retainer",
    shortDefinition:
      "A recurring monthly fee a client pays an agency for an agreed scope of ongoing services — retainer revenue is the primary driver of agency stability and valuation.",
    longDefinition: `<p>In agency language, a client retainer is the monthly recurring fee a client pays for a package of ongoing services — typically some combination of strategy, content, campaign management, reporting, and creative work. It is the same underlying mechanic as a consulting retainer, but the agency usage has its own conventions.</p><p>Three common agency retainer structures exist. A <em>fee-for-hours</em> retainer prepays a defined number of hours per month, with rollover policies and overage rates. A <em>fee-for-scope</em> retainer bundles a defined monthly output (8 blog posts, 1 email campaign, 4 social posts) for a fixed fee. A <em>management-fee-plus-pass-through</em> retainer charges a monthly fee for strategy and account management and passes through media, software, and third-party costs at cost or a markup.</p><p>Retainer revenue is what agencies sell when they are acquired — project revenue is worth 0.5–1× annual revenue, retainer revenue is worth 1–3× (or more for specialty shops with proven retention). Every mature agency instruments retainer retention and expansion carefully: renewals timed away from budget cycles, quarterly business reviews that justify the fee, graduated scope packages that can expand with the client. A retainer book with 90%+ annual retention is the single strongest signal of agency health.</p>`,
    vertical: "agency",
    relatedTerms: [
      "account-manager",
      "client-lifetime-value-clv",
      "campaign-brief",
      "retainer-model",
      "service-firm-benchmark",
    ],
    examples:
      "A 12-person digital agency restructures its project-heavy book into retainers — 22 clients at $3,500–$15,000 per month. Within eighteen months MRR is $140,000 and the agency is valued at 2.5× revenue instead of 0.8×.",
    source: null,
  },
  {
    slug: "campaign-brief",
    term: "Campaign Brief",
    shortDefinition:
      "A structured internal document that translates a client's marketing goal into a concrete set of constraints, audiences, deliverables, and success metrics that the creative team can execute against.",
    longDefinition: `<p>The campaign brief is the single most important document in agency work. It is where a client's "we need a campaign" becomes something the team can actually build. A good brief defines the business objective, the target audience with real psychographic detail, the core insight or message, the competitive context, the deliverables and channels, the budget and timeline, the mandatories (legal disclaimers, brand requirements), and the success metrics.</p><p>Briefs fail in three characteristic ways. First, they are <em>too vague</em> — "drive awareness" is not a business objective. Second, they are <em>too prescriptive</em> — spelling out the creative solution in the brief short-circuits the creative process. Third, they are <em>written by committee</em> — every stakeholder adds a line, the brief becomes 14 pages, and nothing is actually prioritized.</p><p>The industry has well-known brief templates (BBH's "rolling thunder," Ogilvy's "Big Idea" brief, the AAAA creative brief format). A disciplined agency maintains a standard brief template and refuses to staff work that doesn't have one. AI-assisted tools increasingly draft first-pass briefs by analyzing the client's past campaigns, audience research, and brand guidelines — freeing the strategist to sharpen the insight rather than compile the facts.</p>`,
    vertical: "agency",
    relatedTerms: [
      "account-manager",
      "brand-guidelines",
      "creative-review",
      "client-retainer",
      "client-onboarding",
    ],
    examples:
      "A brand agency's strategist writes a 2-page campaign brief for a luggage retailer's holiday campaign — one clear objective (drive $1.2M in gift-set revenue), one audience (urban women 28–45 buying for partners), one insight, three mandatories.",
    source: {
      name: "4A's",
      url: "https://www.aaaa.org/",
    },
  },
  {
    slug: "brand-guidelines",
    term: "Brand Guidelines",
    shortDefinition:
      "A written reference document specifying how a brand should be expressed visually and verbally across every channel — logo usage, color palette, typography, voice, and imagery rules.",
    longDefinition: `<p>Brand guidelines are the governance document for a brand's expression. At minimum they cover logo variations and clear-space rules, color palette with hex/Pantone/CMYK/RGB values for each color, typography (display, headline, body, caption with approved substitutes), imagery and photography style, iconography style, and voice-and-tone direction. Mature brands add motion principles, social-post templates, legal language, and a brand-in-motion reel.</p><p>The guidelines exist so that consistent brand expression can scale across many teams and vendors without each one reinventing decisions. A 30-page PDF style guide is the traditional artifact; modern brands increasingly publish interactive digital brand systems (brand.ai, Frontify, Lingo) with downloadable assets, live code snippets, and approval workflows for non-standard usage.</p><p>Agencies both <em>consume</em> brand guidelines (when working for a client whose brand is already defined) and <em>produce</em> them (when the agency has been hired to build a brand from scratch or rebrand an existing company). The production side is a specialty — strong brand-identity work is one of the most defensible agency offerings because the deliverable has a decade of downstream use. Brand guidelines should be versioned; a 2018 brand standard often lacks the digital, motion, and accessibility guidance required today.</p>`,
    vertical: "agency",
    relatedTerms: [
      "campaign-brief",
      "creative-review",
      "account-manager",
      "client-retainer",
    ],
    examples:
      "A fintech rebrand launches with a 68-page interactive brand system on Frontify. Every downstream agency — PR, paid media, product marketing — pulls from one source, cutting off-brand output from 11% of deliverables to under 1%.",
    source: null,
  },
  {
    slug: "creative-review",
    term: "Creative Review",
    shortDefinition:
      "The formal meeting or workflow where agency creative work is presented to the client for feedback and approval before it ships to production or market.",
    longDefinition: `<p>Creative review is the agency analog of deliverable review. The creative team presents concepts or executions; the client reviews against brand guidelines, the brief, and the acceptance criteria; the client approves, requests revisions, or rejects. In modern agencies, creative review is usually a blended live + asynchronous workflow — a live presentation to build context, followed by written comments in a tool like Frame.io, Ziflow, or ReviewBoard.</p><p>Three dynamics make creative review hard. First, <em>creative work is subjective</em> in ways that a spreadsheet deliverable is not — a client's "I don't love it" can kill a concept that brilliantly solves the brief. Second, <em>clients often don't know what they want</em> until they see something they don't want, requiring the agency to show options. Third, <em>too many reviewers</em> produces consensus-driven mediocrity; a strong agency fights to identify the single decision-maker on the client side.</p><p>Best practice includes presenting <em>against the brief</em> (not just showing executions), providing <em>rationale</em> for every creative decision, structuring feedback channels so revisions are consolidated rather than one-at-a-time, and enforcing <em>revision rounds</em> from the SOW so endless iteration becomes a change order. Modern AI-assisted review tools can pre-check deliverables against brand guidelines and flag potential violations before the client ever sees them.</p>`,
    vertical: "agency",
    relatedTerms: [
      "campaign-brief",
      "brand-guidelines",
      "account-manager",
      "deliverable-review",
      "client-retainer",
    ],
    examples:
      "A video agency presents three concepts for a CPG holiday spot, leading with the brief and a rationale for each concept. The client picks one, provides consolidated feedback within the 48-hour review window, and the agency moves to production with clarity.",
    source: null,
  },
  {
    slug: "client-lifetime-value-clv",
    term: "Client Lifetime Value (CLV)",
    shortDefinition:
      "The total revenue (or gross profit) a single client is expected to generate over the full duration of the relationship — a core metric for prioritizing acquisition investment and account management.",
    longDefinition: `<p>Client Lifetime Value (CLV, sometimes CLTV or LTV) is the expected revenue or gross profit from a single client across the entire relationship. For agencies, the simple formula is average monthly revenue × expected relationship length (in months). For more rigorous modeling, replace revenue with gross profit, apply a discount rate, and incorporate probability of expansion or churn in each future period.</p><p>CLV matters because it sets the ceiling on acquisition economics. If a client's CLV is $80,000, an agency can reasonably spend up to $8,000–$15,000 to acquire that client (10–20% of CLV is a common benchmark). If CLV is only $12,000, the same $15,000 acquisition cost is catastrophic. This math is why specialty agencies with higher retainer prices and longer relationships can afford more aggressive sales functions than commodity shops.</p><p>CLV is a lagging indicator — it is known with certainty only after the client churns. Agencies approximate it in-flight using cohort retention curves (of clients acquired in Q1 2020, what share are still active?), average account size, and expansion rates. Mature agencies segment CLV by source channel and by vertical to identify where to double down. CLV combined with Customer Acquisition Cost (CAC) produces the LTV:CAC ratio, the gold-standard economic metric for service businesses.</p>`,
    vertical: "agency",
    relatedTerms: [
      "client-retainer",
      "account-manager",
      "service-firm-benchmark",
      "client-concentration-risk",
    ],
    examples:
      "A digital agency calculates that its average retained client runs $9,400/month for 28 months, producing CLV of $263,000. That math justifies a dedicated business-development hire and a new-client onboarding program that adds $2,500 of sunk cost per new client.",
    source: null,
  },

  // ─────────────────────────────────────────────
  // CROSS-CUTTING (5)
  // ─────────────────────────────────────────────
  {
    slug: "context-switching-cost",
    term: "Context Switching Cost",
    shortDefinition:
      "The time and cognitive penalty incurred when a professional moves from one client engagement to another — typically 5–15 minutes per switch — which compounds into hundreds of lost hours per year across a multi-client workload.",
    longDefinition: `<p>Context switching cost is the time penalty incurred each time a professional moves from working on one client to working on another. In a small firm managing 50–200 clients, a single professional may switch clients 15–30 times a day. Each switch requires reloading the mental model of the client — their business, their people, the state of the engagement, the pending questions, the last conversation, the applicable history.</p><p>Research from cognitive psychology (Meyer, Monsell, and others) establishes a 20–40% efficiency loss on the first task after a switch. Field data from professional services firms consistently puts the practical per-switch cost at 5–15 minutes. A professional switching 20 times per day at 10 minutes per switch loses 3.3 hours — over 40% of the working day — to the overhead of switching alone.</p><p>Small firms feel this acutely because they cannot specialize headcount the way large firms do. The partner at a 6-person CPA firm genuinely has to remember details about 80+ clients; the partner at a 600-person firm supervises teams whose members specialize. The AI workspace category (Practiq and similar tools) exists largely to collapse this cost — instead of reloading context from memory and spreadsheets, the professional opens a client workspace and the system has already synthesized state.</p>`,
    vertical: "cross",
    relatedTerms: [
      "client-onboarding",
      "service-firm-benchmark",
      "practice-management-system",
      "client-concentration-risk",
    ],
    examples:
      "A bookkeeping partner managing 80 clients switches between them 18 times a day; an internal audit of time-logging data reveals 3 hours daily lost to context reloading — $170,000 of annual opportunity cost at her $225/hour blended rate.",
    source: null,
  },
  {
    slug: "service-firm-benchmark",
    term: "Service Firm Benchmark",
    shortDefinition:
      "Industry-wide performance reference data — utilization rates, realization rates, revenue per head, client retention, growth rates — that small firms use to evaluate their own operational health.",
    longDefinition: `<p>Service firm benchmarks are the reference numbers by which a professional services firm measures its own performance. Core benchmarks include: <em>revenue per full-time-equivalent employee</em> (typically $150K–$350K depending on vertical and size), <em>utilization rate</em> (65–85% for producers), <em>realization rate</em> (90–97% of billed hours actually collected), <em>client retention</em> (90%+ in healthy firms), <em>gross profit margin</em> (35–60%), and <em>compound annual growth rate</em> (10–25% in typical market conditions).</p><p>Different bodies publish benchmarks for different verticals: the AICPA publishes the PCPS Management of an Accounting Practice (MAP) Survey; SPI Research publishes consulting benchmarks annually; the ABA publishes law-firm economic data; state bars publish local surveys. Trade associations like the AAF (agency) and SHRM (HR) publish industry-specific data.</p><p>Benchmarks are tools, not targets. A firm with 72% utilization may be thriving if its gross margin is 55% and clients renew at 95%; a firm at 92% utilization with 28% margin and 65% retention is in trouble. Strong firms triangulate benchmarks — looking at utilization <em>alongside</em> retention <em>alongside</em> realization — rather than optimizing any single number. Benchmarks also shift with firm size; a 5-person shop and a 50-person shop should not share the same targets.</p>`,
    vertical: "cross",
    relatedTerms: [
      "utilization-rate",
      "client-retainer",
      "client-lifetime-value-clv",
      "client-concentration-risk",
      "context-switching-cost",
    ],
    examples:
      "An 8-person CPA firm with $1.9M revenue benchmarks against the AICPA MAP Survey and discovers its revenue-per-professional is 18% below median — diagnosing a rates problem rather than a capacity problem.",
    source: {
      name: "AICPA PCPS MAP Survey",
      url: "https://www.aicpa-cima.com/",
    },
  },
  {
    slug: "professional-liability-insurance",
    term: "Professional Liability Insurance",
    shortDefinition:
      "Insurance coverage (also called errors and omissions or malpractice insurance) that protects professional service providers against claims of negligence, errors, or omissions in their work.",
    longDefinition: `<p>Professional liability insurance — called errors and omissions (E&O) in most industries and malpractice in law and medicine — is the financial backstop against the risk of making a mistake that harms a client. A tax preparer who misses a deduction that triggers IRS penalties, a lawyer who misses a statute-of-limitations deadline, a consultant whose recommendation causes a loss, a designer whose work infringes third-party IP — all face potential claims that professional liability insurance is designed to cover.</p><p>Policies are typically written on a <em>claims-made</em> basis: coverage applies when a claim is made against the firm during the policy period, regardless of when the alleged error occurred (subject to a retroactive date). This structure means lapsed coverage is catastrophic — if the firm drops coverage and a claim surfaces six months later, nothing responds. Firms retiring or being acquired typically buy <em>tail coverage</em> to extend the claims window.</p><p>Coverage limits vary widely: $1M/$3M (per claim / aggregate) is common for small firms; $5M–$25M layered coverage is common for mid-market; large firms carry much more. Premiums depend on revenue, services rendered, claims history, and risk-control practices. Bar associations, state CPA societies, and SHRM often broker preferred E&O carriers for members. Many client contracts — especially with enterprise clients — require specific minimum coverage limits before work can begin.</p>`,
    vertical: "cross",
    relatedTerms: [
      "engagement-letter",
      "retainer-agreement",
      "master-service-agreement-msa",
      "client-onboarding",
    ],
    examples:
      "A 4-person CPA firm carries $2M/$4M professional liability coverage at $3,800/year. When a client disputes a $180K prior-year tax position, the carrier covers defense costs and a $45K settlement.",
    source: {
      name: "AICPA Professional Liability Insurance Program",
      url: "https://www.aicpa-cima.com/",
    },
  },
  {
    slug: "client-onboarding",
    term: "Client Onboarding",
    shortDefinition:
      "The structured process of bringing a new client into a firm — collecting information, setting up systems, establishing expectations, and producing the first deliverable — that determines whether the relationship starts strong or struggles.",
    longDefinition: `<p>Client onboarding is the first 30–90 days of a professional services relationship. It is the highest-leverage part of the entire engagement because first impressions and operational habits formed in onboarding persist for the life of the relationship. A well-onboarded client understands the engagement scope, knows their points of contact, has provided all necessary information, has seen the firm's first deliverable on time, and has a clear mental model of how the relationship will work going forward.</p><p>Good onboarding is an operational playbook. It includes an engagement letter or SOW, a kickoff call with a structured agenda, an information-collection intake (often a portal or secure form), system access provisioning, kickoff of compliance checks (conflict check for law, acceptance procedures for accounting, brand/identity intake for agencies), introduction of the full account team, a defined first milestone, and a 30-day check-in to recalibrate.</p><p>Poor onboarding shows up six months later as confusion about scope, delayed deliverables, billing disputes, and churn. Research consistently shows that clients who churn within the first year are disproportionately clients whose onboarding was rushed or inconsistent. Many mature firms run onboarding as a dedicated workflow separate from ongoing work, with its own owner and its own set of templates; some firms use "onboarding specialists" whose only job is to run the first 60 days of every new client.</p>`,
    vertical: "cross",
    relatedTerms: [
      "engagement-letter",
      "conflict-check",
      "campaign-brief",
      "retainer-agreement",
      "practice-management-system",
    ],
    examples:
      "A law firm's onboarding playbook runs for 14 days — conflict check on day 1, engagement letter signed on day 3, secure portal provisioned on day 4, kickoff meeting on day 7, first substantive deliverable on day 14. Clients onboarded this way renew at 2x the rate of ad-hoc onboardings.",
    source: {
      name: "SHRM",
      url: "https://www.shrm.org/",
    },
  },
  {
    slug: "client-concentration-risk",
    term: "Client Concentration Risk",
    shortDefinition:
      "The risk to a professional services firm's revenue and continuity when a disproportionate share of total revenue depends on a small number of clients — typically considered concerning above 20% from any single client.",
    longDefinition: `<p>Client concentration risk is the risk that the loss of one client (or a small number of clients) would materially damage the firm's revenue, cash flow, or viability. A practical rule is that any single client representing more than 20% of firm revenue is a concentration red flag; any client above 35% is a crisis waiting to happen. The same math applies to industry or geographic concentration — a firm that bills 60% of revenue from restaurants will feel the next hospitality downturn acutely.</p><p>The risk has three components. First, <em>cash-flow risk</em> — if a 30%-of-revenue client churns, the firm loses 30% of its income overnight but cannot shed 30% of its cost structure as quickly. Second, <em>operational capture risk</em> — a large client can demand custom workflows, dedicated staff, and pricing concessions that a diversified client base would never accept. Third, <em>valuation risk</em> — acquirers discount concentrated firms heavily (often 2×+ revenue for diversified books vs 0.5–1× for concentrated ones).</p><p>Countermeasures include deliberately limiting any client to a capped share of revenue, diversifying across verticals or geographies, sub-dividing large clients across multiple partners, and maintaining waitlists so a departure can be quickly backfilled. Auditors, acquirers, and lenders routinely probe concentration; mature firms maintain the data monthly and manage to a target (e.g., "no client above 15%").</p>`,
    vertical: "cross",
    relatedTerms: [
      "client-lifetime-value-clv",
      "service-firm-benchmark",
      "client-onboarding",
      "practice-management-system",
    ],
    examples:
      "A 5-person HR consulting firm realizes its largest client represents 41% of revenue after the client's CFO hints at in-housing the function. The partner immediately accelerates its business development to close three mid-size retainers as a buffer.",
    source: null,
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}

export function getRelatedTerms(
  term: GlossaryTerm,
  limit = 5
): GlossaryTerm[] {
  const related: GlossaryTerm[] = [];
  for (const slug of term.relatedTerms) {
    const t = getGlossaryTerm(slug);
    if (t) related.push(t);
    if (related.length >= limit) break;
  }
  return related;
}

export const VERTICAL_LABELS: Record<GlossaryVertical, string> = {
  accounting: "Accounting",
  law: "Law",
  hr: "HR Advisory",
  consulting: "Consulting",
  agency: "Agency",
  cross: "Cross-Cutting",
};
