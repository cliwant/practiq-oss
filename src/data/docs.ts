/**
 * Docs data — skeleton structure for the /docs section.
 *
 * Each page renders HTML content via dangerouslySetInnerHTML with the
 * prose-dark utility class (see globals.css). Content is intentionally
 * lightweight placeholder copy that sounds real and points users to the
 * waitlist CTA until the full docs are written.
 */

export interface DocsPage {
  title: string;
  slug: string;
  description: string;
  content: string;
}

export interface DocsSection {
  title: string;
  slug: string;
  description: string;
  pages: DocsPage[];
}

const comingSoonNote = `<p class="text-zinc-500 italic">More details coming soon. <a href="/#cta" class="text-zinc-300 underline">Request early access</a> to get notified when this page is expanded.</p>`;

export const DOCS_SECTIONS: DocsSection[] = [
  {
    title: "Getting Started",
    slug: "getting-started",
    description:
      "A short orientation to Practiq — what it is, who it's for, and how to get moving.",
    pages: [
      {
        title: "What is Practiq?",
        slug: "what-is-practiq",
        description:
          "Practiq is an AI-native workspace for boutique professional services firms managing 30-200 client relationships.",
        content: `
<h2>An AI workspace built for multi-client work</h2>
<p>Practiq is a workspace for boutique professional services firms — accounting practices, small law firms, boutique consultancies, HR advisors, and marketing agencies — managing 30 to 200 active client relationships across a small team.</p>
<p>Instead of switching between QuickBooks, TaxDome, Google Drive, Slack, and a dozen open tabs to rebuild context every time a client name comes up, Practiq keeps the full picture of each client in one place and lets the AI do the reconstruction for you.</p>

<h2>What makes it different</h2>
<p>Most tools treat AI as a button you press after doing the work. Practiq treats AI as a teammate that has already done the preparation before you sit down. The distinction matters most during tax season, month-end close, or anywhere a small team is asked to hold context for hundreds of clients at once.</p>
<ul>
  <li>Per-client memory that persists across sessions and team members</li>
  <li>Proactive briefings so the first thing you see each morning is what changed overnight</li>
  <li>Draft-first outputs — emails, memos, statements — ready for your review, not a blank page</li>
  <li>Approval workflows that preserve professional judgment at every high-stakes step</li>
</ul>

<h2>Who should read this</h2>
<p>If you run or work at a firm where one person holds context for 30+ clients and the context switching tax is a real business problem, these docs are for you. Start with <a href="/docs/getting-started/quick-start" class="text-zinc-300 underline">Quick Start</a>, then skim <a href="/docs/getting-started/key-concepts" class="text-zinc-300 underline">Key Concepts</a>.</p>
${comingSoonNote}
`,
      },
      {
        title: "Quick Start",
        slug: "quick-start",
        description:
          "A 10-minute tour of the Practiq workspace and the first workflow to set up.",
        content: `
<h2>Before you start</h2>
<p>Practiq is in early access. These instructions describe the end state of the onboarding flow — the production signup is handled today via <a href="/#cta" class="text-zinc-300 underline">the waitlist</a>.</p>

<h2>Your first 10 minutes</h2>
<p>Once you're in the workspace, here's the path most firms take on day one:</p>
<ul>
  <li>Connect your primary system of record (QuickBooks, Clio, HubSpot, or upload a client list CSV)</li>
  <li>Let Practiq ingest the last 90 days of client activity — this runs in the background</li>
  <li>Open any client to see the auto-generated brief and chat with the AI in that client's context</li>
  <li>Review the proactive inbox — items Practiq flagged overnight that may need your attention</li>
  <li>Invite a teammate; their view inherits all the client context you've built</li>
</ul>

<h2>What to try first</h2>
<p>Pick one client you're about to meet with. Open their workspace, ask for a pre-meeting brief, and note how long it takes compared to your current prep workflow. Most firms report 80-90% time savings on this single task.</p>
${comingSoonNote}
`,
      },
      {
        title: "Key Concepts",
        slug: "key-concepts",
        description:
          "The vocabulary Practiq uses — clients, context, briefings, approvals, and outputs.",
        content: `
<h2>Clients</h2>
<p>A client is the atomic unit in Practiq. Every piece of context, every draft, every conversation is scoped to a single client and isolated from the others. Switching between clients is a one-click operation that swaps the entire working context.</p>

<h2>Context</h2>
<p>Context is the persistent memory Practiq maintains per client — financial position, recent correspondence, preferences, deadlines, past decisions, and anything else the AI needs to act as if it has been on the engagement the whole time.</p>

<h2>Briefings</h2>
<p>A briefing is a short, generated summary of what has changed and what needs attention for a given client or across your portfolio. Daily triage briefings run overnight; on-demand briefings are available any time you open a client.</p>

<h2>Approvals</h2>
<p>High-stakes actions — sending a client email, filing a return, signing off on a financial statement — flow through an approval queue rather than being automated end-to-end. The AI prepares; the professional signs.</p>

<h2>Outputs</h2>
<p>Outputs are the artifacts Practiq produces on your behalf — drafted emails, spreadsheets, memos, reconciliations. Every output is versioned and traceable back to the context and prompt that produced it.</p>
${comingSoonNote}
`,
      },
      {
        title: "For Whom Practiq Is Built",
        slug: "for-whom",
        description:
          "The firms and roles Practiq is designed for — and the ones it isn't.",
        content: `
<h2>The right fit</h2>
<p>Practiq is built for firms where the same handful of people hold context for a large number of clients. The pattern repeats across industries:</p>
<ul>
  <li>Accounting and tax practices with 2-10 professionals and 50-200 client entities</li>
  <li>Small law firms managing an active caseload of 30-150 matters</li>
  <li>Boutique consulting firms running 20-80 concurrent engagements</li>
  <li>Marketing and creative agencies with 15-60 retained clients</li>
  <li>HR advisory and fractional executive practices with 20-40 client companies</li>
</ul>

<h2>Roles that benefit most</h2>
<p>Managing partners, firm owners, senior associates, and anyone whose day is fractured by client switching. If you regularly say "hold on, let me pull up their file" before you can answer a question, you're the user we built this for.</p>

<h2>When Practiq is not the right tool</h2>
<p>Large enterprises with dedicated client success teams, individual freelancers with fewer than 10 clients, and firms that outsource substantially all client work to external automation tools will likely find Practiq heavier than they need.</p>
${comingSoonNote}
`,
      },
    ],
  },
  {
    title: "Features",
    slug: "features",
    description:
      "The core capabilities that make Practiq useful day-to-day.",
    pages: [
      {
        title: "Client Context Memory",
        slug: "client-context-memory",
        description:
          "Persistent per-client memory that survives time, team changes, and tool switches.",
        content: `
<h2>The problem it solves</h2>
<p>In a typical firm, the full picture of a client lives scattered across email threads, spreadsheet tabs, slack DMs, and whatever the senior associate happens to remember. When that person is out, or when a new hire is brought in, the context is effectively lost.</p>

<h2>How Practiq handles it</h2>
<p>Every client in Practiq has a structured memory layer that combines ingested system-of-record data, uploaded documents, conversation history, and inferred facts. The memory is queryable in plain language and visible as a living brief at the top of the client workspace.</p>
<ul>
  <li>Automatic extraction from email, documents, and system integrations</li>
  <li>Facts are timestamped and sourced so you can audit where something came from</li>
  <li>Manual pins for the handful of things that matter most for a given relationship</li>
  <li>Team-shared by default so context survives role changes</li>
</ul>

<h2>What it feels like in practice</h2>
<p>The pre-meeting brief that took 20 minutes of file-pulling happens in under 30 seconds. A new associate can be productive on a client in their first week instead of their third month.</p>
${comingSoonNote}
`,
      },
      {
        title: "AI Briefing and Daily Triage",
        slug: "ai-briefing",
        description:
          "Overnight summaries of what changed, what's urgent, and what can wait.",
        content: `
<h2>What the daily triage does</h2>
<p>Between the time you close the laptop and the time you open it again, Practiq runs a sweep across every client in your portfolio. The output is a short triage brief waiting for you each morning.</p>
<ul>
  <li>What changed since yesterday — new emails, filings, payments, deadlines</li>
  <li>What needs a decision today and roughly how long each item will take</li>
  <li>What can safely be deferred to later in the week</li>
  <li>Flagged anomalies that fell outside normal patterns for that specific client</li>
</ul>

<h2>Per-client briefings</h2>
<p>Separately, opening any client surfaces a fresh briefing scoped to that relationship — recent activity, open items, upcoming deadlines, and suggested next actions. This is the replacement for the mental model-rebuild that currently happens every time you switch contexts.</p>

<h2>Tuning</h2>
<p>Briefings adapt to your patterns. If you consistently ignore certain signal types, they stop appearing. If you spend time on a particular class of flag, similar flags get promoted.</p>
${comingSoonNote}
`,
      },
      {
        title: "One-Click Client Switching",
        slug: "client-switching",
        description:
          "Swap the entire working context in under a second.",
        content: `
<h2>Why switching is the tax that matters</h2>
<p>Research on knowledge workers consistently puts the cost of a single context switch between 10 and 25 minutes of recovered focus. A managing partner at a multi-client firm may switch 15-30 times a day. The math is brutal.</p>

<h2>How Practiq reduces the switch cost</h2>
<p>A client switch is a single click or keyboard shortcut. The chat history, open documents, draft queue, and reference notes all swap atomically. There's no loading state where you have to wait for context to rebuild because the context never left — it was always there, waiting.</p>
<ul>
  <li>Keyboard-driven switching with fuzzy client search</li>
  <li>Per-client browser tab semantics so the back button works naturally</li>
  <li>Recent clients surfaced first based on actual usage</li>
  <li>Pinned clients for high-touch accounts that deserve persistent visibility</li>
</ul>
${comingSoonNote}
`,
      },
      {
        title: "Multi-Format Output",
        slug: "multi-format-output",
        description:
          "Draft emails, spreadsheets, memos, and reports directly from the workspace.",
        content: `
<h2>What you can ask for</h2>
<p>Practiq produces finished artifacts in the formats your clients expect rather than paragraphs of text you have to reformat:</p>
<ul>
  <li>Client-ready email drafts with the tone and salutation conventions you've used before</li>
  <li>Spreadsheets with formulas, formatting, and cell references — not flattened markdown tables</li>
  <li>Memos and briefs in your firm's template with headers, footers, and branding intact</li>
  <li>Reconciliation worksheets pre-populated with the data Practiq already holds</li>
</ul>

<h2>Where the files live</h2>
<p>Every generated artifact is versioned inside the client workspace. You can open, edit, and share from there, or export to your existing file system. Nothing disappears into a chat scroll.</p>

<h2>What it does not do</h2>
<p>Practiq drafts; Practiq does not file. Tax returns, legal documents, and anything with a signature block flow through the approval queue and out to the system of record under the professional's authority, not the AI's.</p>
${comingSoonNote}
`,
      },
      {
        title: "Approval Queue",
        slug: "approval-queue",
        description:
          "The review surface for every outbound action the AI prepares.",
        content: `
<h2>Why an approval queue</h2>
<p>Professional services firms are held to standards of care that don't disappear because there's an LLM in the stack. Practiq draws a bright line between preparation (which the AI does autonomously) and commitment (which a human must sign off on).</p>

<h2>What flows through it</h2>
<p>Anything that creates an external effect — sending a client email, posting a transaction, filing a document, publishing a report — is staged in the approval queue first. Internal-only artifacts like reference notes and scratch analysis skip the queue.</p>

<h2>What the reviewer sees</h2>
<ul>
  <li>The generated artifact rendered in its final form</li>
  <li>The source context and prompt that produced it</li>
  <li>A diff against the last similar artifact for that client, when available</li>
  <li>One-click approve, revise with feedback, or discard</li>
</ul>

<h2>Bulk review</h2>
<p>For high-volume workflows like month-end client emails, reviewers can filter the queue, sample a few artifacts in detail, and approve the batch. The goal is to match the speed of AI generation with a matching speed of professional review.</p>
${comingSoonNote}
`,
      },
    ],
  },
  {
    title: "Integrations",
    slug: "integrations",
    description:
      "The systems of record Practiq connects to — and the ones on the roadmap.",
    pages: [
      {
        title: "QuickBooks",
        slug: "quickbooks",
        description:
          "Two-way sync with QuickBooks Online for accounting and tax practices.",
        content: `
<h2>What the integration covers</h2>
<p>Practiq connects to QuickBooks Online via the standard OAuth flow and pulls client companies, chart of accounts, transactions, invoices, and bill data into the per-client memory layer.</p>
<ul>
  <li>Read-only mode for firms that want to start cautiously</li>
  <li>Write-back for categorization, reconciliation, and transaction notes once trust is established</li>
  <li>Multi-company support — firms managing many client QBO files see them all in one Practiq workspace</li>
  <li>Differential sync so large books don't re-ingest on every update</li>
</ul>

<h2>What it enables</h2>
<p>Month-end close briefs, automated reconciliation drafts, categorization suggestions that learn your firm's conventions, and client-ready financial summaries that no longer require you to manually export, reformat, and annotate.</p>

<h2>Data handling</h2>
<p>Client financial data is isolated per client and never co-mingled in prompts or outputs. Practiq does not use client accounting data to train shared models.</p>
${comingSoonNote}
`,
      },
      {
        title: "Xero",
        slug: "xero",
        description:
          "Xero support for firms running international or non-QuickBooks practices.",
        content: `
<h2>Scope</h2>
<p>Xero integration mirrors the QuickBooks feature set — connection via OAuth, pull of organizations and transactions, and bidirectional sync for categorization and reconciliation.</p>

<h2>Regional considerations</h2>
<p>Xero is the dominant system of record in the UK, Australia, and New Zealand. The Practiq Xero connector handles multi-currency, GST and VAT schemas, and the reporting conventions specific to those jurisdictions.</p>

<h2>Migration and parallel use</h2>
<p>Firms with a mixed book of QuickBooks and Xero clients can connect both. Clients stay in their native system of record; Practiq presents a unified view across the firm.</p>
${comingSoonNote}
`,
      },
      {
        title: "Clio",
        slug: "clio",
        description:
          "Clio integration for small law firms managing active matters and client intake.",
        content: `
<h2>Matter-centric, not transaction-centric</h2>
<p>Legal work maps to matters and contacts rather than accounts and transactions. The Clio connector is built around that shape: matter timelines, contact rosters, billable time, and document threads flow into each client's memory.</p>

<h2>What it unlocks</h2>
<ul>
  <li>Pre-meeting briefs that summarize matter posture in under a page</li>
  <li>Drafts of routine client correspondence ready for review</li>
  <li>Deadline awareness that combines Clio calendars with Practiq's proactive triage</li>
  <li>Intake triage for new leads without re-keying the same facts in three places</li>
</ul>

<h2>Trust and privilege</h2>
<p>Attorney-client privileged material is treated with the same isolation guarantees as accounting data — per-client scoping, no cross-client prompts, no training on client content.</p>
${comingSoonNote}
`,
      },
      {
        title: "HubSpot",
        slug: "hubspot",
        description:
          "HubSpot CRM integration for agencies and consulting firms.",
        content: `
<h2>Who this is for</h2>
<p>Marketing agencies, consulting firms, and any practice where the client relationship runs through a CRM rather than a general ledger. HubSpot is the most common starting point; Salesforce is on the roadmap.</p>

<h2>What syncs</h2>
<p>Companies, deals, contacts, conversation history, and the custom properties your firm uses to track engagement status. Practiq does not replace HubSpot — it reads from it and, once you turn on write-back, creates activities and notes that show up in HubSpot for your team.</p>

<h2>Common workflows</h2>
<ul>
  <li>Weekly status briefs per engagement, drafted and staged for client review</li>
  <li>Meeting preparation that combines CRM notes with email and document context</li>
  <li>Renewal and expansion triage based on account health signals</li>
</ul>
${comingSoonNote}
`,
      },
      {
        title: "Coming Soon",
        slug: "coming-soon",
        description:
          "Integrations on the roadmap — and how to influence the order we ship them.",
        content: `
<h2>On the shortlist</h2>
<ul>
  <li>Salesforce — for firms standardized on Salesforce rather than HubSpot</li>
  <li>TaxDome and Karbon — for accounting practices with existing practice management tools</li>
  <li>Gmail and Microsoft 365 — deeper inbox triage beyond the initial read-only ingestion</li>
  <li>Drake, Lacerte, and UltraTax — tax prep software for seasonal workflows</li>
  <li>Notion and Google Docs — for firms storing client knowledge in shared workspaces</li>
</ul>

<h2>How priority gets set</h2>
<p>We ship integrations in the order that early-access firms ask for them. If you're on the waitlist, you'll get a short survey during onboarding — your answers directly shape the queue.</p>

<h2>Custom and direct-API connections</h2>
<p>Firms on enterprise plans can request custom connectors to internal tools or niche software. These go through a scoping conversation; we'll tell you honestly whether it's a good fit.</p>
${comingSoonNote}
`,
      },
    ],
  },
  {
    title: "FAQ",
    slug: "faq",
    description:
      "Answers to the questions firms ask before signing up.",
    pages: [
      {
        title: "General",
        slug: "general",
        description:
          "General questions about Practiq — what it is, who it's for, and how it compares.",
        content: `
<h2>How is this different from using ChatGPT with my client data?</h2>
<p>A general-purpose chat tool has no persistent per-client memory, no system-of-record integrations, no approval workflow, and no multi-user sharing model. Practiq is the workspace layer that turns an LLM into something a firm can actually run on.</p>

<h2>Do I need technical expertise to use Practiq?</h2>
<p>No. The primary interface is chat and approval queues. The firms using Practiq today are professional services teams, not engineering teams.</p>

<h2>What happens to my workflow during onboarding?</h2>
<p>Onboarding is designed to run alongside your existing tools for the first 30-60 days. Nothing in your current stack has to change on day one. Firms typically consolidate in their own time as they build trust in what Practiq is doing.</p>

<h2>Is there a trial?</h2>
<p>Early-access firms get a 30-day evaluation period that includes hands-on onboarding help. <a href="/#cta" class="text-zinc-300 underline">Request access here</a>.</p>
${comingSoonNote}
`,
      },
      {
        title: "Security and Privacy",
        slug: "security",
        description:
          "How Practiq handles sensitive client data, access control, and auditability.",
        content: `
<h2>Where does client data live?</h2>
<p>Client data is encrypted at rest and in transit. Each firm's workspace is logically isolated, and within a workspace each client's data is scoped separately so it cannot surface in other client contexts.</p>

<h2>Is my data used to train models?</h2>
<p>No. Client data is not used to train foundation models or shared Practiq models. Firm-scoped personalization is handled via retrieval and prompting, not by training on your content.</p>

<h2>Who at Practiq can see my data?</h2>
<p>Access to customer data is restricted to a small on-call team for diagnostic purposes and is logged. Routine operations do not require human access to your content.</p>

<h2>Compliance posture</h2>
<p>SOC 2 Type I certification is in progress, with Type II planned for the first full audit window after general availability. Firms with specific compliance requirements should reach out so we can scope what's needed.</p>
${comingSoonNote}
`,
      },
      {
        title: "Pricing and Early Access",
        slug: "pricing",
        description:
          "How pricing works, what early access includes, and what happens at GA.",
        content: `
<h2>Pricing structure</h2>
<p>Practiq prices per firm based on seat count and active client volume. Most early-access firms land in the range of a single mid-market SaaS subscription — similar in order of magnitude to what they already pay for their practice management tool.</p>

<h2>Early access benefits</h2>
<ul>
  <li>Founder-level onboarding support during setup</li>
  <li>Direct input into the integration roadmap</li>
  <li>Locked-in pricing for the duration of your first contract term</li>
  <li>Early access to features that are not yet generally available</li>
</ul>

<h2>When does GA pricing take effect?</h2>
<p>Firms that join during early access keep their current terms through their first renewal. General availability pricing applies to new firms joining after the public launch.</p>

<h2>How do I get a quote?</h2>
<p><a href="/#cta" class="text-zinc-300 underline">Request access</a> and we'll follow up with a short scoping call. Pricing is straightforward — no enterprise sales theatre.</p>
${comingSoonNote}
`,
      },
      {
        title: "Roadmap",
        slug: "roadmap",
        description:
          "What's shipping next, what's in design, and how to influence the queue.",
        content: `
<h2>Shipping in the next quarter</h2>
<ul>
  <li>Expanded approval queue with per-firm policy rules</li>
  <li>Salesforce connector</li>
  <li>Mobile briefing reader for morning triage on the phone</li>
  <li>Team analytics on where time goes across clients</li>
</ul>

<h2>In design</h2>
<ul>
  <li>Deeper document generation for filings and statements</li>
  <li>Multi-firm parent accounts for referral networks and franchise groups</li>
  <li>Voice input for fast context capture between meetings</li>
</ul>

<h2>Research phase</h2>
<p>We're exploring how Practiq should behave during acute events — tax deadline week, litigation sprints, agency pitch weeks — where the tempo changes and the usual triage heuristics are wrong. If your firm has strong opinions here, we want to hear them.</p>

<h2>How to influence what ships</h2>
<p>The shortest path is to be an early-access firm and tell us what hurts most. Roadmap priority is set by customer pain, not a product team calendar. <a href="/#cta" class="text-zinc-300 underline">Request access</a> to get into that loop.</p>
${comingSoonNote}
`,
      },
    ],
  },
];
