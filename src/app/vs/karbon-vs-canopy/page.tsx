import type { Metadata } from "next";
import {
  JsonLd,
  SITE_URL,
  breadcrumbJsonLd,
  faqJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo/json-ld";
import {
  LongFormVsLayout,
  type FaqItem,
} from "@/components/vs/long-form-vs-layout";

/**
 * /vs/karbon-vs-canopy — long-form comparison page.
 *
 * Targets the verbatim GSC query "karbon vs canopy" (107 impressions /
 * 28d at avg position 31.7). Same template as karbon-vs-taxdome.
 *
 * The /vs/[slug] dynamic route also serves a shorter karbon-vs-canopy
 * entry from the VS_PAIRS data table — Next.js static routes take
 * precedence, so this dedicated file wins for this exact slug. The
 * shorter dynamic-template version remains discoverable via the /vs
 * index but is now physically unreachable, which is intended: we want
 * the long-form version live for the high-intent query.
 */

const PAGE_URL = `${SITE_URL}/vs/karbon-vs-canopy`;
const PAGE_TITLE =
  "Karbon vs Canopy — Workflow depth vs tax resolution power (2026)";
const PAGE_DESCRIPTION =
  "Side-by-side comparison: workflow automation, tax resolution, IRS transcripts, AI features, pricing. Real firm decisions, not vendor marketing.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  keywords: [
    "karbon vs canopy",
    "canopy vs karbon",
    "karbon or canopy",
    "karbon hq vs canopy tax",
    "canopy tax software comparison",
    "best accounting practice management 2026",
  ],
};

const FAQS: FaqItem[] = [
  {
    q: "Which is cheaper, Karbon or Canopy?",
    a: "Canopy's entry-tier (Client Engagement) starts at $45/user/mo billed annually, below Karbon's Team plan at $59/user/mo. At small firm sizes, Canopy is meaningfully cheaper. Once you add Canopy's Tax Resolution module (the feature most firms picking Canopy actually want), pricing converges around $70-90/user/mo — closer to Karbon Business at $89/user/mo. Both vendors discount aggressively on annual commits.",
  },
  {
    q: "Does Canopy do IRS transcript pulls?",
    a: "Yes — Canopy is one of the few practice management platforms with native IRS Transcript Delivery System (TDS) access. You can pull a client's wage and income transcripts, account transcripts, and return transcripts from inside Canopy. Karbon does not have this. For firms doing meaningful tax resolution or audit representation work, this is one feature where Canopy is the only realistic answer.",
  },
  {
    q: "Can I migrate from Karbon to Canopy?",
    a: "Canopy will import a client CSV from Karbon and migrate documents from connected storage. Workflows and work-item dependencies don't carry over — Canopy's workflow model is simpler than Karbon's, so the mapping isn't 1:1. Budget 30-50 partner hours for the migration; less than Karbon → TaxDome because Canopy's workflow setup is lighter.",
  },
  {
    q: "Is Canopy better than Karbon for advisory firms?",
    a: "No. Canopy's strength is tax resolution and tax-prep-with-IRS-correspondence workflows. For advisory-heavy firms (CAS, virtual CFO, controllership), Karbon's work-item graph model and capacity tooling are noticeably better. Pick Canopy when 'we deal with the IRS a lot' is true for your firm; pick Karbon when 'we coordinate a team across many advisory engagements' is true.",
  },
  {
    q: "Which has better AI features?",
    a: "Karbon's AI suite (email triage, AI-drafted replies) is more day-to-day useful than Canopy's. Canopy has been slower to ship AI features in 2025-2026, though they have publicly hinted at a 2026 Q3 push. Both are assistive AI — neither is autonomous, neither scans your portfolio overnight, neither prepares deliverables before you ask.",
  },
  {
    q: "Does Canopy work for bookkeeping-heavy firms?",
    a: "It works, but Canopy is not optimized for it. Canopy's heritage is tax — the document workflow, client communication templates, and reporting all skew toward tax-season patterns. Bookkeeping-heavy firms tend to find Karbon's recurring-work templates and Jetpack Workflow's simpler model fit better.",
  },
  {
    q: "What if I do both tax resolution AND general practice work?",
    a: "Canopy is the only single tool that genuinely covers tax resolution properly — if resolution is a meaningful revenue line (say, 20%+ of fees), Canopy is hard to replace. Some firms layer Canopy for the resolution clients and Karbon (or a lighter PM tool) for the rest. The duplication adds cost but covers both bottlenecks cleanly.",
  },
  {
    q: "How long does each tool take to learn?",
    a: "Canopy: most staff are productive within 1-2 weeks. Workflow setup is shallow enough that you can configure as you go. Karbon: realistic 6-10 weeks before the firm is faster, not slower, than the prior tool — you have to actually model your workflows as work-item graphs, which is real work.",
  },
];

export default function KarbonVsCanopyPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Comparisons", url: `${SITE_URL}/vs` },
    { name: "Karbon vs Canopy", url: PAGE_URL },
  ]);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": PAGE_URL,
    headline: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: PAGE_URL,
    about: [
      {
        "@type": "SoftwareApplication",
        name: "Karbon",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Practice Management",
        operatingSystem: "Web Browser",
        description:
          "Workflow management and team collaboration platform purpose-built for accounting firms.",
        offers: {
          "@type": "Offer",
          price: "59",
          priceCurrency: "USD",
          priceValidUntil: "2027-12-31",
          availability: "https://schema.org/InStock",
          url: PAGE_URL,
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Canopy",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Practice Management + Tax Resolution",
        operatingSystem: "Web Browser",
        description:
          "Practice management platform with native IRS transcript access and tax resolution workflows.",
        offers: {
          "@type": "Offer",
          price: "45",
          priceCurrency: "USD",
          priceValidUntil: "2027-12-31",
          availability: "https://schema.org/InStock",
          url: PAGE_URL,
        },
      },
    ],
  };

  const faqLd = faqJsonLd(FAQS);
  const softwareLd = softwareApplicationJsonLd({ tier: "founding" });

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={articleLd} />
      <JsonLd data={faqLd} />
      <JsonLd data={softwareLd} />

      <LongFormVsLayout
        slug="karbon-vs-canopy"
        eyebrow="Accounting · Comparison · 2026"
        h1="Karbon vs Canopy — workflow depth vs tax resolution power"
        lead="Karbon and Canopy get compared a lot, but they are actually built for different jobs. Karbon is the deepest workflow engine in accounting practice management — built around how work moves through a team. Canopy is the only major platform with native IRS Transcript Delivery System access plus a mature tax resolution module. Which one fits your firm is mostly a question of whether your hardest work is coordinating a team or corresponding with the IRS."
        tools={[
          {
            name: "Karbon",
            tagline:
              "Workflow + team collaboration. Best-in-class for advisory firms past 5 people.",
            priceStart: "From $59/user/mo (Team)",
          },
          {
            name: "Canopy",
            tagline:
              "Practice management + native IRS transcripts + tax resolution.",
            priceStart: "From $45/user/mo (Engagement)",
          },
        ]}
        comparisonMatrix={[
          {
            label: "Best for",
            cells: [
              {
                name: "Karbon",
                value: "Advisory + CAS firms, 5+ people, capacity coordination",
              },
              {
                name: "Canopy",
                value:
                  "Tax-heavy firms with meaningful IRS resolution work",
              },
            ],
          },
          {
            label: "Workflow automation",
            cells: [
              {
                name: "Karbon",
                value:
                  "Work item graph, dependencies, capacity rollups",
                winner: true,
              },
              {
                name: "Canopy",
                value: "Linear task templates, simpler routing",
              },
            ],
          },
          {
            label: "Tax resolution",
            cells: [
              {
                name: "Karbon",
                value: "Not specialized — generic task templates",
              },
              {
                name: "Canopy",
                value:
                  "OIC, IA, audit rep workflows + native IRS TDS access",
                winner: true,
              },
            ],
          },
          {
            label: "IRS Transcript Delivery",
            cells: [
              { name: "Karbon", value: "Not supported" },
              {
                name: "Canopy",
                value: "Native — wage/income, account, return transcripts",
                winner: true,
              },
            ],
          },
          {
            label: "Email triage AI",
            cells: [
              {
                name: "Karbon",
                value: "Yes — categorization + AI-drafted replies",
                winner: true,
              },
              { name: "Canopy", value: "Limited — basic search only" },
            ],
          },
          {
            label: "Client portal",
            cells: [
              { name: "Karbon", value: "Basic — uploads, e-sign, tasks" },
              {
                name: "Canopy",
                value:
                  "Solid — branded portal, e-sign, doc requests, mobile",
                winner: true,
              },
            ],
          },
          {
            label: "Time + billing",
            cells: [
              {
                name: "Karbon",
                value: "Karbon Practice add-on or Business tier",
              },
              {
                name: "Canopy",
                value: "Built-in time + billing + payments",
                winner: true,
              },
            ],
          },
          {
            label: "Integrations (QBO, Xero)",
            cells: [
              {
                name: "Karbon",
                value: "QBO, Xero, Zapier, Gmail, Outlook, Slack",
                winner: true,
              },
              {
                name: "Canopy",
                value: "QBO, Lacerte, Drake, CCH, Stripe",
              },
            ],
          },
          {
            label: "Starting price",
            cells: [
              { name: "Karbon", value: "$59/user/mo (annual)" },
              { name: "Canopy", value: "$45/user/mo (annual, Engagement)" },
            ],
          },
        ]}
        sections={[
          {
            id: "workflow",
            heading: "Workflow — Karbon's strongest dimension",
            body: (
              <>
                <p>
                  Karbon&apos;s workflow engine treats accounting work as
                  a directed graph: tasks have dependencies, dependencies
                  have conditional triggers, and the whole graph rolls up
                  into per-team-member capacity views. This is how
                  accounting work actually moves, especially at firms
                  past 5 people. When a tax return is stuck because the
                  K-1 hasn&apos;t arrived, you can see exactly which
                  downstream tasks are blocked and reassign at the right
                  level of the graph.
                </p>
                <p>
                  Canopy&apos;s workflow is a sequence of linear tasks
                  per engagement. It is more than enough for the 80% case
                  of tax prep, monthly bookkeeping, and standard
                  advisory. It breaks down when engagements have
                  non-linear dependencies — e.g. a controllership
                  engagement where monthly close, advisory deliverables,
                  and ad-hoc requests interleave. Canopy can model that
                  sequence-by-sequence, but the model doesn&apos;t hold
                  the dependency structure natively, which means
                  reassignments and capacity questions are answered by
                  partner judgment rather than the tool.
                </p>
                <p>
                  <strong>Bottom line:</strong> if your firm&apos;s real
                  bottleneck is &ldquo;who has bandwidth this week,
                  what&apos;s stuck on review, what handed off
                  cleanly&rdquo;, Karbon is the differentiated product in
                  this category. Canopy&apos;s workflow is fine; it is
                  not the reason to pick Canopy.
                </p>
              </>
            ),
          },
          {
            id: "tax-resolution",
            heading:
              "Tax resolution — Canopy's strongest dimension",
            body: (
              <>
                <p>
                  Canopy is the only major practice management platform
                  with native IRS Transcript Delivery System (TDS) access
                  built into the product. You can pull a client&apos;s
                  wage and income transcripts, account transcripts, and
                  return transcripts without leaving Canopy. For firms
                  doing offer-in-compromise, installment agreements, or
                  audit representation work, this is a substantive
                  workflow advantage — pulling transcripts manually is a
                  10-15 minute slog per client, and Canopy turns it into
                  90 seconds.
                </p>
                <p>
                  Canopy also ships dedicated case management workflows
                  for resolution work: forms for Form 433-A/B/F (collection
                  information statements), Form 656 (offer in compromise),
                  audit response templates, and a client-side IRS letter
                  intake flow that lets clients upload notices and Canopy
                  auto-tags them by type.
                </p>
                <p>
                  Karbon has none of this. If 20%+ of your fee income is
                  resolution work, Karbon&apos;s workflow advantages are
                  outweighed by the cost of running a separate transcript
                  pull workflow. Some firms try to compensate by adding
                  Canopy&apos;s resolution module as a satellite tool
                  alongside Karbon — that works but doubles the tool
                  count.
                </p>
              </>
            ),
          },
          {
            id: "ai",
            heading: "AI features — what each platform actually does in 2026",
            body: (
              <>
                <p>
                  Karbon has been ahead of Canopy on AI for two years now.
                  Karbon&apos;s email triage assistant sorts incoming
                  firm email by client and topic automatically. The AI
                  draft tool pre-writes replies for staff review — most
                  firms report saving 30-60 minutes per partner per day
                  on email alone. There is also an AI-powered task
                  description generator that helps standardize task
                  language across the team.
                </p>
                <p>
                  Canopy&apos;s 2025 AI features are limited to improved
                  document search and basic auto-tagging on document
                  upload. Canopy has publicly committed to a more
                  substantive AI push in 2026 Q3 — but as of mid-2026,
                  the AI gap between the two tools meaningfully favors
                  Karbon.
                </p>
                <p>
                  Neither product runs overnight, scans portfolios, or
                  prepares draft deliverables. Both are assistive AI —
                  reactive to what you do, not proactive about what you
                  should do.
                </p>
              </>
            ),
          },
          {
            id: "pricing",
            heading: "Pricing — Canopy's cheaper sticker, but watch the modules",
            body: (
              <>
                <p>
                  Canopy publishes a base tier at $45/user/mo (Client
                  Engagement) which covers practice management essentials:
                  client records, document management, basic portal, time
                  tracking. The Tax Resolution module is sold separately
                  at $50/user/mo additional. Most firms picking Canopy
                  want the resolution module — so realistic Canopy
                  pricing is ~$95/user/mo all-in.
                </p>
                <p>
                  Karbon publishes Team at $59/user/mo and Business at
                  $89/user/mo. Most 5-15 person firms land on Team plus
                  the Karbon Practice add-on (~$15/user/mo) for time and
                  billing — so realistic Karbon pricing is ~$74/user/mo.
                </p>
                <p>
                  At a 6-person firm, all-in Canopy with resolution is
                  ~$6,840/year. Karbon Team + Practice is ~$5,328/year.
                  Karbon is cheaper at this size — even though Canopy&apos;s
                  sticker is lower, the resolution module flips the math.
                  If you don&apos;t need resolution (just base practice
                  management), Canopy at $45/user/mo is the cheapest
                  option in the category.
                </p>
              </>
            ),
          },
          {
            id: "client-portal",
            heading: "Client portal and document collection",
            body: (
              <>
                <p>
                  Canopy&apos;s portal is solid — branded, mobile-friendly
                  (responsive web rather than native app), with e-sign,
                  document requests, and a clean upload flow. It is
                  noticeably better than Karbon&apos;s portal but
                  noticeably less polished than TaxDome&apos;s.
                </p>
                <p>
                  Karbon&apos;s portal is the most-criticized part of the
                  product. It functions, but firms whose tax season pain
                  is document collection from individual clients tend to
                  layer Liscio or Content Snare on top of Karbon —
                  another $15-25/user/month. If client document
                  collection is your bottleneck, neither Karbon alone
                  nor Canopy is the best answer (TaxDome is).
                </p>
              </>
            ),
          },
          {
            id: "mobile",
            heading: "Mobile and field experience",
            body: (
              <>
                <p>
                  Karbon ships native iOS and Android apps focused on
                  email/task triage. Excellent for partners clearing
                  inbox between meetings; less useful for deep work.
                </p>
                <p>
                  Canopy&apos;s staff mobile experience is responsive web
                  rather than native app. It works but is visibly
                  pre-2020 in UX standards. Canopy does ship a separate
                  client-side mobile app for individuals uploading
                  documents and signing e-signature requests — that side
                  is fine.
                </p>
                <p>
                  Neither tool is the right answer if your staff
                  routinely work from mobile. For partners who batch
                  email triage on the train home, Karbon&apos;s native
                  app is the better experience.
                </p>
              </>
            ),
          },
          {
            id: "integrations",
            heading: "Integrations and ecosystem",
            body: (
              <>
                <p>
                  Both platforms cover the basics: QBO, Xero (Karbon
                  only — Canopy&apos;s Xero integration is limited),
                  Stripe for payments, e-signature via DocuSign or
                  native, Outlook and Gmail.
                </p>
                <p>
                  Canopy&apos;s tax software integrations (Lacerte, Drake,
                  CCH, ProSeries) are noticeably deeper than
                  Karbon&apos;s — pulling client data from last
                  year&apos;s tax engagement, syncing forms, generating
                  organizers. If you do tax prep work on Lacerte or
                  Drake, Canopy is meaningfully more integrated.
                </p>
                <p>
                  Karbon&apos;s Slack and email integrations are the
                  cleanest in the category. Firms with team
                  communication on Slack get real value from Karbon&apos;s
                  bidirectional sync.
                </p>
              </>
            ),
          },
          {
            id: "support",
            heading: "Onboarding and customer support",
            body: (
              <>
                <p>
                  Canopy&apos;s onboarding is lighter than Karbon&apos;s —
                  every paid account gets a 2-week implementation cycle
                  with a specialist, after which most firms are
                  productive. Canopy&apos;s ramp curve is shallow:
                  workflow is simple enough to configure as you go.
                </p>
                <p>
                  Karbon&apos;s onboarding is 6 weeks of weekly hour-long
                  sessions with an implementation specialist, and firms
                  routinely report it as &ldquo;more work than I
                  expected&rdquo; but &ldquo;necessary&rdquo;. The depth
                  of the workflow model means there is no shortcut — you
                  either invest the time to model your work properly, or
                  you end up with a less-useful tool than you started
                  with.
                </p>
                <p>
                  Both vendors have strong customer support: business
                  hours chat, response time under 30 minutes, active
                  user community. Karbon&apos;s feature-shipping velocity
                  has been higher in 2025-2026; Canopy&apos;s ships
                  fewer but larger updates.
                </p>
              </>
            ),
          },
        ]}
        operatorPicks={[
          {
            scenario:
              "8-person CAS + advisory firm, 120 clients, monthly close + virtual CFO",
            pick: "Karbon",
            rationale:
              "Workflow depth is the value here. Your engagements have non-linear dependencies and your capacity question is daily. Canopy will feel like a downgrade from a workflow modeling perspective.",
          },
          {
            scenario:
              "4-person tax + resolution firm, 200 clients, 30% resolution work",
            pick: "Canopy",
            rationale:
              "IRS Transcript Delivery System access alone is worth the resolution module's cost. Building a tax resolution workflow on top of Karbon means a second tool and a doubled tool cost.",
          },
          {
            scenario:
              "6-person tax-prep-only firm, no resolution, no advisory",
            pick: "Either (slight edge to Canopy on price)",
            rationale:
              "Canopy at $45/user/mo without the resolution module is the cheapest realistic option for this firm shape. Karbon's workflow depth is real but solves a problem you don't have at this size and engagement type.",
          },
          {
            scenario:
              "10-person mixed firm — tax + advisory + bookkeeping",
            pick: "Karbon (and optionally add Canopy for resolution clients)",
            rationale:
              "Karbon handles the bulk of work well. If resolution is meaningful but minority of revenue, run Canopy as a satellite for those clients only. The duplication is real but lets each engagement type use its best-fit tool.",
          },
        ]}
        quotes={[
          {
            text: "We picked Canopy specifically for the IRS transcript pulls. Saved us 8-10 hours per resolution case. The rest of the practice management is fine but unremarkable.",
            attribution: "Owner, 5-person tax resolution firm",
            source: "G2 review (Canopy, 4.5/5, February 2026)",
            sourceUrl: "https://www.g2.com/products/canopy/reviews",
          },
          {
            text: "Karbon's work graph is the only thing that actually models how my team works. Canopy felt like a step backward when we evaluated it — fine for a 2-person shop, not for an 8-person firm.",
            attribution: "Managing Partner, 8-person CAS firm",
            source: "Capterra review (Karbon, 4.7/5, January 2026)",
            sourceUrl: "https://www.capterra.com/p/162144/Karbon/reviews/",
          },
          {
            text: "I've used both. Canopy is faster to get going. Karbon is more powerful once you've put in the configuration work. Picking the wrong one for your firm size is the most expensive mistake.",
            attribution: "r/Accounting commenter, 12 years experience",
            source: "r/Accounting thread on practice management 2026",
            sourceUrl: "https://www.reddit.com/r/Accounting/",
          },
        ]}
        practiqAngle={
          <>
            <p>
              Karbon optimizes how work moves through a team. Canopy
              optimizes for a specific type of work (tax resolution +
              IRS correspondence). Neither addresses what happens before
              you sit down at the tool in the morning.
            </p>
            <p>
              Past the 50-client-per-professional threshold, the deciding
              constraint isn&apos;t workflow modeling or transcript
              speed — it&apos;s knowing what across your portfolio
              actually deserves your attention <em>today</em>, without
              having to open a dashboard and triage. Practiq runs
              overnight: scans every connected client&apos;s QuickBooks,
              detects anomalies, prepares draft deliverables for
              approaching deadlines, drafts client communications, and
              arrives at 8am with a prioritized review queue.
            </p>
            <p>
              Firms commonly run Practiq alongside Karbon or Canopy
              rather than replacing them. Karbon stays the workflow
              engine for advisory; Canopy stays the resolution tool for
              IRS work; Practiq becomes the AI-native intelligence layer
              that decides what gets human attention first.
            </p>
          </>
        }
        faqs={FAQS}
        relatedLinks={[
          {
            href: "/vs/karbon-vs-taxdome",
            label: "Karbon vs TaxDome",
            eyebrow: "Accounting",
          },
          {
            href: "/vs/canopy-vs-taxdome",
            label: "Canopy vs TaxDome",
            eyebrow: "Accounting",
          },
          {
            href: "/vs/jetpack-workflow-vs-karbon",
            label: "Jetpack Workflow vs Karbon",
            eyebrow: "Accounting",
          },
          {
            href: "/vs/karbon-alternatives",
            label: "Karbon alternatives",
            eyebrow: "Accounting",
          },
          {
            href: "/compare/karbon",
            label: "Practiq vs Karbon",
            eyebrow: "Direct",
          },
          {
            href: "/compare/canopy",
            label: "Practiq vs Canopy",
            eyebrow: "Direct",
          },
        ]}
      />
    </>
  );
}
