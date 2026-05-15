import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Practiq Changelog — Product Updates and Releases",
  description:
    "Every product update, feature release, integration, and platform improvement shipped to Practiq — the AI-Native workspace for boutique professional services firms.",
  alternates: { canonical: "https://practiq.dev/changelog" },
  openGraph: {
    title: "Practiq Changelog — Product Updates and Releases",
    description:
      "Chronological log of Practiq releases: AI agent upgrades, integrations, vertical workflows, performance wins, and platform infrastructure.",
    url: "https://practiq.dev/changelog",
    type: "website",
  },
};

type Category = "Feature" | "Improvement" | "Fix" | "Platform";

type ChangelogEntry = {
  version: string;
  date: string;
  displayDate: string;
  category: Category;
  title: string;
  bullets: string[];
};

const ENTRIES: ChangelogEntry[] = [
  {
    version: "v0.9.3",
    date: "2026-04-17",
    displayDate: "April 17, 2026",
    category: "Feature",
    title: "40-term glossary, 30-state geo expansion, and 27 buyer-intent pages",
    bullets: [
      "Shipped a 40-term professional services glossary at /glossary covering context switching, approval queue, matter management, trust accounting, month-end close, multi-state compliance, and the other vocabulary Practiq operators actually use. Every term carries DefinedTerm schema for AI Overview pickup.",
      "Expanded geographic landing surface to 30 priority states — each of the five verticals (accounting, law, HR, consulting, agency) now has a dedicated /for/{vertical}/{state} page with localized firm statistics, regulatory notes, and waitlist capture.",
      "Launched 15 'best for' buyer-intent pages under /best — top queries like 'best practice management for small CPA firms' and 'best AI workspace for boutique law firms' now land on Practiq pages with genuine comparative content rather than generic marketing.",
      "Launched 12 cross-competitor /vs pages — pairs like Clio vs MyCase and TaxDome vs Karbon now surface Practiq as the AI-Native third option with honest head-to-head tables.",
    ],
  },
  {
    version: "v0.9.2",
    date: "2026-04-10",
    displayDate: "April 10, 2026",
    category: "Feature",
    title: "Readiness Quiz and ROI Calculator",
    bullets: [
      "Released the Readiness Quiz at /readiness-quiz — ten questions that score a firm's context-switching cost and match it against the three plan tiers. Results are deep-linked so a firm can share its score with a partner before booking a demo.",
      "Released the ROI Calculator at /roi-calculator — calculates annual context-reconstruction cost based on headcount, client count, and average billable rate. Produces a per-firm dollar figure that flows into the waitlist form as a qualifying field.",
      "Both calculators persist to URL state so a firm can re-open their result or share the specific inputs with a colleague.",
    ],
  },
  {
    version: "v0.9.1",
    date: "2026-04-02",
    displayDate: "April 2, 2026",
    category: "Improvement",
    title: "Approval Queue keyboard shortcuts and batch actions",
    bullets: [
      "Approval Queue now supports keyboard triage: J / K to move between items, Y to approve, N to request changes, P to toggle preview, C to comment. Matches the Superhuman-style pattern that partners asked for during beta feedback.",
      "Batch approve now surfaces when three or more low-risk routine items (reconciliations, weekly briefs, recurring reports) share the same type and confidence above 90 percent. One click approves all matching items, cutting morning triage from twelve minutes to under three.",
      "Added an approved-with-comments state for cases where a partner wants the deliverable sent but also wants a pattern note logged for next cycle.",
    ],
  },
  {
    version: "v0.9.0",
    date: "2026-03-26",
    displayDate: "March 26, 2026",
    category: "Feature",
    title: "QuickBooks Online integration (read)",
    bullets: [
      "Connected QuickBooks Online as the first read-direction integration. Nightly scans pull trial balance, P&L, balance sheet, A/R aging, A/P aging, and transaction feeds for every client the firm flags as QBO-connected.",
      "Anomaly detector runs against every connected client's last seven days of transactions — flags uncategorized entries, threshold violations (single transaction over 10 percent of monthly average), duplicate candidates, and out-of-pattern vendor payments.",
      "Firms without QBO can still use Practiq at basic level via manual trial balance uploads. Anomaly detection stays disabled for manual-upload clients until an integration is connected.",
    ],
  },
  {
    version: "v0.8.6",
    date: "2026-03-18",
    displayDate: "March 18, 2026",
    category: "Feature",
    title: "Clio integration for law firms (read)",
    bullets: [
      "Connected Clio as the first law-firm practice management integration. Practiq's nightly agent reads active matters, time entries, trust accounts, and matter communications to produce per-matter briefings.",
      "Matter context persistence — every matter in Clio becomes a workspace in Practiq with full engagement history, deadlines, and recent communications surfaced for quick context recovery.",
      "Trust account anomaly flagging — Practiq's agent watches IOLTA balances and flags unusual movements (unexpected transfers, overdrafts, reconciliation gaps) during the nightly scan.",
    ],
  },
  {
    version: "v0.8.5",
    date: "2026-03-09",
    displayDate: "March 9, 2026",
    category: "Feature",
    title: "Tax season workflow orchestration",
    bullets: [
      "Shipped dedicated tax-season workflow for accounting firms. Single dashboard shows all clients in the tax pipeline with per-client status (documents collected, return drafted, ready for review, filed) and automatic aging of the pending stages.",
      "Document collection automation — Practiq detects missing W-2s, 1099s, and K-1s against a per-client checklist and drafts personalized reminder emails that a partner approves before sending. During beta, firms reported cutting document-chase time by 60 to 75 percent.",
      "Parallel return preparation — Practiq drafts Schedule C and Schedule E line items from QBO data for sole proprietor and pass-through returns. Partners review and adjust, then export to the firm's tax software.",
    ],
  },
  {
    version: "v0.8.4",
    date: "2026-02-27",
    displayDate: "February 27, 2026",
    category: "Feature",
    title: "Gusto integration for HR advisory and multi-state payroll",
    bullets: [
      "Connected Gusto for HR advisory firms that manage payroll and benefits for multiple client companies. Practiq's agent pulls headcount, payroll run status, state tax deposit status, and benefits enrollment per client company.",
      "Multi-state compliance watcher — tracks state tax registrations, unemployment insurance rates, and SUI wage bases per client. Flags clients with new-state-hire triggers (first employee in a new state) before the registration deadline hits.",
      "Quarterly compliance rollups — Practiq's agent drafts Q1, Q2, Q3, and Q4 compliance summaries per client at the end of each quarter with the filing status for 941, state withholding, and SUI returns.",
    ],
  },
  {
    version: "v0.8.3",
    date: "2026-02-14",
    displayDate: "February 14, 2026",
    category: "Improvement",
    title: "Per-client communication tone and pattern learning",
    bullets: [
      "Client context memory now tracks per-client communication preference signals — formal vs. casual tone, high-level summary vs. detailed breakdown, executive-facing vs. operator-facing framing. Practiq's drafts match the preference pattern automatically.",
      "Pattern learning now surfaces suggested auto-rules. When a partner approves the same adjustment five times in a row for similar clients (example: reclassifying food and beverage distributor invoices under a specific account for restaurant clients), Practiq proposes an auto-rule the partner can approve.",
      "Auto-rules respect hard boundaries — tax strategy calls, accounting principle interpretations, and regulatory responses always route to human approval regardless of confidence.",
    ],
  },
  {
    version: "v0.8.2",
    date: "2026-01-30",
    displayDate: "January 30, 2026",
    category: "Platform",
    title: "Nightly scan performance and background job infrastructure",
    bullets: [
      "Rebuilt the nightly scan pipeline on BullMQ with Redis to handle parallel scans across hundreds of clients per firm without blocking. A typical 120-client firm completes its full scan in under 25 minutes overnight, down from just over two hours on the previous single-threaded pipeline.",
      "Added scan progress telemetry — firms can see in the morning dashboard which clients were scanned, which completed, and which require retry. Retries run automatically in the next scan window.",
      "Approval Queue items generated overnight now stream into the dashboard via Server-Sent Events — partners see new items appear as scans complete, not in a single batch at a fixed hour.",
    ],
  },
  {
    version: "v0.8.1",
    date: "2026-01-22",
    displayDate: "January 22, 2026",
    category: "Improvement",
    title: "Audit trail, data export, and cancellation flow",
    bullets: [
      "Audit trail now captures every AI decision, every human approval, every correction, and every rule change — exportable to CSV for audit preparation. Retained for 90 days; unlimited retention available contractually for firms with 7-year regulatory requirements.",
      "Data export is now one click — a full firm ZIP (all client contexts, documents, approval history, conversation history) delivered within 24 hours of request. Cancellation triggers automatic export without needing to ask.",
      "After 30 days from cancellation, all firm data is permanently deleted from primary and backup systems. No soft-delete, no retention extension without written request.",
    ],
  },
  {
    version: "v0.8.0",
    date: "2026-01-15",
    displayDate: "January 15, 2026",
    category: "Feature",
    title: "Rippling integration and multi-state state registration tracker",
    bullets: [
      "Connected Rippling as the second payroll and HR integration after Gusto. Covers HR advisory firms whose clients standardized on Rippling for payroll, benefits, and device management.",
      "State registration tracker — across Gusto and Rippling clients, Practiq now maintains a single view of which states each client is registered in for payroll tax, SUI, and income tax withholding. Triggers a registration-in-progress task whenever a new state appears in the payroll feed.",
      "Launched /security page with the compliance roadmap, data handling practices, and vendor list so a firm's partners can answer 'where does our data live' without emailing support.",
    ],
  },
];

const ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Practiq Changelog — Product Updates and Releases",
  description:
    "Chronological log of Practiq releases — AI agent upgrades, integrations, vertical workflows, performance improvements, and platform infrastructure.",
  url: "https://practiq.dev/changelog",
  datePublished: "2026-01-15",
  dateModified: ENTRIES[0].date,
  author: { "@type": "Organization", name: "Practiq", url: "https://practiq.dev" },
  publisher: {
    "@type": "Organization",
    name: "Practiq",
    url: "https://practiq.dev",
    logo: {
      "@type": "ImageObject",
      url: "https://practiq.dev/icon.png",
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://practiq.dev/changelog",
  },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://practiq.dev" },
    { "@type": "ListItem", position: 2, name: "Changelog", item: "https://practiq.dev/changelog" },
  ],
};

const CATEGORY_STYLES: Record<Category, string> = {
  Feature: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  Improvement: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  Fix: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  Platform: "border-zinc-600 bg-zinc-800/60 text-zinc-300",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }}
      />

      {/* Hero */}
      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            {ENTRIES.length} releases · Last updated {ENTRIES[0].displayDate}
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            What&apos;s new in Practiq
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Every product update, feature release, and platform improvement.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl">
          <ol className="space-y-10">
            {ENTRIES.map((entry) => (
              <li
                key={entry.version}
                className="relative rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8 transition-colors hover:border-zinc-700"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${CATEGORY_STYLES[entry.category]}`}
                  >
                    {entry.category}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">
                    {entry.version}
                  </span>
                  <span className="text-xs text-zinc-500">&middot;</span>
                  <time dateTime={entry.date} className="text-xs text-zinc-500">
                    {entry.displayDate}
                  </time>
                </div>
                <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-zinc-100 sm:text-2xl">
                  {entry.title}
                </h2>
                <ul className="space-y-3 text-sm leading-relaxed text-zinc-300">
                  {entry.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Want to see these releases running in your firm?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-sm text-zinc-400">
            Be among the first 50 firms to get access.
          </p>
          <Link
            href="/#cta"
            className="inline-flex items-center rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Get early access
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
