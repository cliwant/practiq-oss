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
 * /vs/karbon-vs-taxdome — long-form comparison page.
 *
 * Targets the verbatim GSC query "karbon vs taxdome" (111 impressions /
 * 28d at avg position 30.5 before this page existed). The dedicated
 * physical route at this path overrides /vs/[slug] for this exact slug
 * — Next.js resolves static routes ahead of dynamic ones, so the older
 * dynamic-template-rendered "taxdome-vs-karbon" page coexists for that
 * different slug while this richer, operator-grade variant captures the
 * higher-volume "karbon vs taxdome" ordering.
 *
 * Word count target: ~1700-2000 words across the lead, six expanded
 * dimensions, operator picks, Practiq angle, and FAQ.
 */

const PAGE_URL = `${SITE_URL}/vs/karbon-vs-taxdome`;
const PAGE_TITLE =
  "Karbon vs TaxDome — Which fits a 5-15 person CPA firm? (2026)";
const PAGE_DESCRIPTION =
  "Side-by-side comparison: workflow automation, client portal, AI features, pricing, mobile, integrations. Real firm decisions, not vendor marketing.";

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
    "karbon vs taxdome",
    "taxdome vs karbon",
    "karbon or taxdome",
    "karbon hq vs taxdome",
    "karbon taxdome comparison",
    "best accounting practice management software",
    "accounting firm software 2026",
  ],
};

const FAQS: FaqItem[] = [
  {
    q: "Which is cheaper, Karbon or TaxDome?",
    a: "TaxDome's headline price ($800/user/year ≈ $67/mo) sits below Karbon's Team plan ($59/user/mo billed annually = $708/yr). But once you include TaxDome's all-in-one bundle (portal, e-sign, document management, invoicing) versus Karbon's narrower workflow-only scope, total cost of ownership at a 4-person firm typically lands within $1,500/year of each other. The cheaper sticker is TaxDome; the cheaper actual stack depends on which add-ons you'd otherwise pay for separately.",
  },
  {
    q: "Can I migrate from Karbon to TaxDome (or vice versa)?",
    a: "Both vendors offer import tools, but neither migration is plug-and-play. Karbon → TaxDome: client list and contact CSV imports cleanly; workflows have to be rebuilt manually because Karbon's work-item dependency model doesn't map to TaxDome's job templates. TaxDome → Karbon: client and document imports work; e-sign envelopes and invoice history don't carry over. Budget 40-80 partner hours either direction.",
  },
  {
    q: "Does TaxDome integrate with QuickBooks Online?",
    a: "Yes — TaxDome reads QuickBooks Online data for time tracking and invoicing, and pushes paid invoices back to QBO. It does not read bookkeeping data (general ledger, transactions) into your practice workflow. For that you still keep QBO Accountant open in a separate tab. Karbon's QBO integration is similar in scope.",
  },
  {
    q: "Does Karbon have a client portal?",
    a: "Karbon has a basic client portal that handles document requests, e-sign, and a shared task list. It is functional but visibly thinner than TaxDome's portal — fewer branding options, simpler upload flow, no integrated payment. Karbon firms whose client-facing polish matters often pair Karbon with Liscio or Content Snare for the portal layer.",
  },
  {
    q: "Which has better AI features?",
    a: "Karbon ships an email triage assistant and an AI-drafted reply tool — both useful day-to-day, but assistive rather than autonomous. TaxDome's AI is similarly assistive: chat-style document summarization and tag suggestions. Neither tool runs overnight, scans your client portfolio for anomalies, or arrives with a prepared deliverables queue. If 'AI that prepares work before you ask' is the threshold, neither clears it in 2026.",
  },
  {
    q: "Which is better for tax season specifically?",
    a: "TaxDome wins for solo-to-3-person firms whose tax season pain is client document collection — the portal, organizer flow, and e-sign are best-in-tier and reduce chase work. Karbon wins for 5+ person firms where the pain is team coordination during March-April — who has bandwidth, what handed off cleanly, what's stuck on review. Different bottlenecks, different answers.",
  },
  {
    q: "Can I run Karbon and TaxDome together?",
    a: "Yes — and a small number of firms do exactly this, running Karbon as the internal workflow engine and TaxDome as the client-facing portal. The duplication adds ~$50/user/month and ~3-5 hours of weekly admin keeping the two in sync. Most firms pick one; the pair only makes sense when neither tool alone covers the gap.",
  },
  {
    q: "What's the alternative if neither feels right?",
    a: "The category neither Karbon nor TaxDome addresses is AI-native portfolio intelligence — overnight scanning of every client's QuickBooks, anomaly detection, draft deliverables ready for review by 8am. Tools in that adjacent category (Practiq, Truewind for bookkeeping, parts of Canopy's roadmap) run alongside whichever practice management platform you pick rather than replacing it.",
  },
];

export default function KarbonVsTaxDomePage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Comparisons", url: `${SITE_URL}/vs` },
    { name: "Karbon vs TaxDome", url: PAGE_URL },
  ]);

  // Article schema with both products as `about` + `mentions`. We don't
  // re-use productComparisonJsonLd from the shared helper because this
  // page doesn't have a matching VsPair record — and the manual emit
  // here lets us include both tool offers without the parseStartingPrice
  // round-trip.
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
        name: "TaxDome",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Practice Management",
        operatingSystem: "Web Browser",
        description:
          "All-in-one practice management suite with strong client portal, document management, and e-signature.",
        offers: {
          "@type": "Offer",
          price: "67",
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
        slug="karbon-vs-taxdome"
        eyebrow="Accounting · Comparison · 2026"
        h1="Karbon vs TaxDome — which fits a 5-15 person CPA firm?"
        lead="Karbon and TaxDome are the two practice management platforms US small accounting firms compare most often in 2026. They solve adjacent but different problems: Karbon is a workflow engine for teams, TaxDome is a client-facing all-in-one suite. Which one fits your firm depends almost entirely on whether your biggest pain is team coordination or client document collection — not feature count, not price."
        tools={[
          {
            name: "Karbon",
            tagline:
              "Workflow + team collaboration for accounting teams. Strongest for 5+ person firms.",
            priceStart: "From $59/user/mo (Team)",
          },
          {
            name: "TaxDome",
            tagline:
              "All-in-one practice management + client portal. Strongest for solo-to-3-person firms.",
            priceStart: "From $800/user/yr (~$67/mo)",
          },
        ]}
        comparisonMatrix={[
          {
            label: "Best for",
            cells: [
              {
                name: "Karbon",
                value: "5-15 person firms with team coordination pain",
              },
              {
                name: "TaxDome",
                value: "Solo to 4-person firms wanting one bundled tool",
              },
            ],
          },
          {
            label: "Workflow automation",
            cells: [
              {
                name: "Karbon",
                value:
                  "Work item dependencies, capacity views, conditional routing",
                winner: true,
              },
              {
                name: "TaxDome",
                value: "Job templates, automated tasks, simpler routing",
              },
            ],
          },
          {
            label: "Client portal",
            cells: [
              {
                name: "Karbon",
                value: "Basic — uploads, e-sign, shared tasks",
              },
              {
                name: "TaxDome",
                value:
                  "Best-in-tier — mobile app, organizer, payments, branding",
                winner: true,
              },
            ],
          },
          {
            label: "Document management",
            cells: [
              {
                name: "Karbon",
                value: "Folder-based, integrated with email + tasks",
              },
              {
                name: "TaxDome",
                value: "Full DMS with OCR, version history, e-sign",
                winner: true,
              },
            ],
          },
          {
            label: "AI features (2026)",
            cells: [
              {
                name: "Karbon",
                value:
                  "Email triage + AI-drafted replies. Assistive, not autonomous.",
              },
              {
                name: "TaxDome",
                value:
                  "Doc summarization + tag suggestions. Assistive, not autonomous.",
              },
            ],
          },
          {
            label: "Time + billing",
            cells: [
              {
                name: "Karbon",
                value: "Built-in time tracking + billing (Karbon Practice)",
              },
              {
                name: "TaxDome",
                value: "Built-in invoicing, time tracker, payment processing",
                winner: true,
              },
            ],
          },
          {
            label: "Mobile experience",
            cells: [
              {
                name: "Karbon",
                value: "iOS + Android — task/email triage focused",
              },
              {
                name: "TaxDome",
                value: "iOS + Android for staff AND a separate client app",
                winner: true,
              },
            ],
          },
          {
            label: "Integrations (QBO, Xero, etc.)",
            cells: [
              {
                name: "Karbon",
                value: "QBO, Xero, Zapier, Gmail, Outlook, Slack",
              },
              {
                name: "TaxDome",
                value: "QBO, Xero, Zapier, CCH iFirm, Lacerte, Drake import",
                winner: true,
              },
            ],
          },
          {
            label: "Starting price",
            cells: [
              {
                name: "Karbon",
                value: "$59/user/mo (annual) on Team plan",
              },
              {
                name: "TaxDome",
                value: "$800/user/year (~$67/mo)",
              },
            ],
          },
        ]}
        sections={[
          {
            id: "workflow",
            heading: "Workflow automation",
            body: (
              <>
                <p>
                  Karbon&apos;s workflow engine is the deepest in the
                  accounting practice management market. The product was
                  built from day one around a graph model of work items,
                  not a flat list of tasks — which means dependencies
                  between work items, conditional triggers, and capacity
                  rollups across a team work natively rather than as
                  bolt-ons. If you have ever found yourself building
                  workflow logic inside Asana or Monday because your
                  practice management tool couldn&apos;t handle handoffs,
                  Karbon will feel like an immediate upgrade.
                </p>
                <p>
                  TaxDome&apos;s workflow uses a job template model —
                  closer to TaxDome&apos;s heritage as a tax-prep-first
                  product. You define a sequence of tasks per job type
                  (1040, 1120-S, Schedule C, monthly bookkeeping), assign
                  staff at each step, and TaxDome routes work forward as
                  tasks complete. It is more than adequate for the 80%
                  case of repeatable seasonal work. It is weaker than
                  Karbon when you have advisory engagements with
                  dependencies that don&apos;t fit a linear template, or
                  when capacity-balancing across a 6+ person team is the
                  daily question.
                </p>
                <p>
                  <strong>The deciding question:</strong> if you frequently
                  say &ldquo;who has time this week to take this on?&rdquo;
                  about non-templated work, Karbon. If you say &ldquo;why
                  is the 1040 organizer not back yet?&rdquo;, TaxDome.
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
                  TaxDome&apos;s client portal is the strongest reason
                  small firms pick TaxDome. It includes a branded mobile
                  app, a tax organizer flow that walks individual clients
                  through document upload step-by-step, integrated
                  e-signature, payment collection, and per-client
                  branding. Client-side friction is measurably lower than
                  alternatives — the typical TaxDome firm reports
                  document return rates 15-25% higher than their
                  pre-TaxDome baseline, mostly because the mobile app
                  removes the &ldquo;I&apos;ll do it on my desktop
                  later&rdquo; problem.
                </p>
                <p>
                  Karbon&apos;s portal exists, functions, and is fine for
                  internal-facing work surfaces (status, messages, task
                  acknowledgement). It is visibly thinner on the
                  client-facing polish dimension — no native mobile app,
                  fewer branding options, less guided client flow. Karbon
                  firms whose client population skews older or
                  less-technical commonly layer Liscio or Content Snare on
                  top of Karbon to compensate. That stack works but adds
                  $15-25/user/month and a second tool to keep in sync.
                </p>
                <p>
                  If client document collection is genuinely the worst
                  part of your week from January through April — and it
                  is, for many solo-to-3-person tax-heavy firms — the
                  portal gap alone is enough reason to pick TaxDome.
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
                  Both vendors have shipped AI features in 2025-2026.
                  Both are honest about what those features do, and
                  neither has yet shipped AI that operates autonomously.
                </p>
                <p>
                  <strong>Karbon&apos;s AI</strong> consists of an email
                  triage assistant (categorizes incoming firm email into
                  client matters, internal, marketing, etc.) and an
                  AI-drafted reply tool that pre-writes responses for
                  staff to review. Both save real time — the typical
                  reported saving is 30-60 minutes per partner per day.
                  Both are reactive: they help you handle email that
                  arrived, they do not surface what should have arrived
                  but didn&apos;t.
                </p>
                <p>
                  <strong>TaxDome&apos;s AI</strong> includes document
                  summarization (drops a one-paragraph TL;DR at the top
                  of any uploaded PDF), automatic document tagging (W-2,
                  1099, K-1, etc.) on upload, and a chat-style
                  Q&A on the document set. The tagging is the most
                  load-bearing of the three — it removes 5-10 minutes of
                  filing per client per tax season.
                </p>
                <p>
                  Neither product runs overnight, scans your
                  QuickBooks-connected clients for unusual transactions,
                  or arrives at 8am with prepared March financial
                  statement drafts. Both vendors are publicly working
                  toward more autonomous AI, but as of mid-2026 the
                  category of &ldquo;AI that does the work, not assists
                  you doing it&rdquo; is not yet shipped by either Karbon
                  or TaxDome.
                </p>
              </>
            ),
          },
          {
            id: "pricing",
            heading: "Pricing — sticker vs total cost of ownership",
            body: (
              <>
                <p>
                  Karbon prices per user per month, with three published
                  tiers as of mid-2026: Team ($59/user/mo billed annually,
                  $79 monthly), Business ($89/user/mo), and Enterprise
                  (call). Team is the right starting tier for most 5-15
                  person firms. Business adds Karbon Practice (time +
                  billing) and advanced reporting; firms that already use
                  QuickBooks for invoicing rarely need it.
                </p>
                <p>
                  TaxDome prices per user per year with a flat $800/year
                  rate (≈ $67/mo) regardless of tier — all features
                  unlocked at the per-user price. There is a 3-year
                  commit option at a meaningful discount that the sales
                  team will offer if you ask.
                </p>
                <p>
                  At a 4-person firm, sticker prices net out close: Karbon
                  Team at $59 × 4 × 12 = $2,832/yr versus TaxDome at $800
                  × 4 = $3,200/yr — TaxDome is ~$370 more expensive.
                  Total cost of ownership flips when you account for
                  what&apos;s bundled: TaxDome includes e-sign, document
                  management, invoicing, payments, and client portal in
                  the base price. With Karbon, e-sign typically comes
                  through a separate Adyen-style integration, and many
                  firms add Liscio or Content Snare for portal polish —
                  adding $1,200-2,400/year. <strong>The TCO winner is
                  TaxDome at small firm sizes; Karbon wins TCO once
                  workflow depth becomes the dominant feature you&apos;re
                  paying for.</strong>
                </p>
              </>
            ),
          },
          {
            id: "mobile",
            heading: "Mobile experience for staff and clients",
            body: (
              <>
                <p>
                  Both Karbon and TaxDome ship native iOS and Android
                  apps for firm staff. The Karbon app is focused on email
                  + task triage and is excellent for a partner clearing
                  inbox between meetings. The TaxDome staff app is
                  broader — you can review documents, send e-sign
                  requests, and approve invoices from mobile.
                </p>
                <p>
                  The bigger differentiator is the client-side. TaxDome
                  ships a branded client mobile app (your firm logo, your
                  colors) that clients install to upload documents,
                  e-sign, and pay invoices. Karbon does not have an
                  equivalent. For tax-heavy firms whose individual
                  clients use mobile as their primary computing device,
                  this is a substantive feature gap.
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
                  Both platforms cover the obvious necessary integrations:
                  QuickBooks Online and Xero for bookkeeping data, Gmail
                  and Outlook for email, Zapier for the long tail.
                </p>
                <p>
                  TaxDome&apos;s tax-software import (Lacerte, Drake,
                  ProSeries, CCH) is meaningfully deeper than
                  Karbon&apos;s — TaxDome can pull last year&apos;s
                  organizer from Lacerte and pre-populate this year&apos;s
                  request, which Karbon cannot. If you do tax prep as a
                  meaningful slice of revenue, this matters.
                </p>
                <p>
                  Karbon&apos;s Slack integration is the cleanest in the
                  category — work item events post to a channel
                  automatically, comments sync back, and team members can
                  acknowledge tasks from Slack without opening Karbon.
                  Firms with a Slack-first culture often pick Karbon
                  partly on this.
                </p>
                <p>
                  Stripe-based payment processing is built into TaxDome
                  natively (firms collect invoices through the portal at
                  ~2.9% + 30¢). Karbon does not have native payment
                  processing — firms typically run Stripe or LawPay (yes,
                  CPAs use LawPay) separately.
                </p>
              </>
            ),
          },
          {
            id: "support",
            heading: "Customer support and onboarding",
            body: (
              <>
                <p>
                  Karbon&apos;s onboarding is high-touch: every paid
                  account gets an implementation specialist for 6 weeks,
                  with weekly hour-long sessions to migrate your existing
                  workflow into Karbon&apos;s work item model. Most firms
                  report the implementation as &ldquo;more work than I
                  expected&rdquo; but &ldquo;essential&rdquo; — your
                  workflow doesn&apos;t magically become a graph by
                  importing a CSV.
                </p>
                <p>
                  TaxDome&apos;s onboarding is lighter-weight. You get a
                  white-glove migration of your client list and templates,
                  and TaxDome&apos;s Academy (their training library) is
                  best-in-class — well-produced video courses for every
                  feature with practice exercises. Firms tend to be
                  self-sufficient on TaxDome within 2-3 weeks; Karbon
                  realistically takes 6-10 weeks before the firm is
                  faster, not slower, than the prior tool.
                </p>
                <p>
                  Ongoing support is comparable: both run business-hours
                  chat support with median response under 30 minutes,
                  both have active Facebook groups (TaxDome&apos;s is
                  larger), both run regular webinars. Karbon has a more
                  active in-product feature-request system; TaxDome ships
                  faster.
                </p>
              </>
            ),
          },
        ]}
        operatorPicks={[
          {
            scenario:
              "3-person tax firm, 80 clients, 60% individual returns + 40% S-Corp/LLC",
            pick: "TaxDome",
            rationale:
              "Your bottleneck is document collection from individual clients in February-March. TaxDome's organizer flow + mobile app removes weeks of chasing. Karbon's workflow depth is real but solves a problem you don't yet have at this size.",
          },
          {
            scenario:
              "7-person CAS firm, 140 clients, monthly close + advisory",
            pick: "Karbon",
            rationale:
              "Your bottleneck is team coordination — who has bandwidth, what is stuck on review, what gets handed off this week. Karbon's capacity views and work-item dependencies are the differentiated value. TaxDome's portal polish matters less because your clients are businesses, not individuals, and they're used to a less mobile-first flow.",
          },
          {
            scenario:
              "12-person mixed firm — tax season heavy + year-round bookkeeping",
            pick: "Both (or neither alone)",
            rationale:
              "Firms at this size sometimes run Karbon for internal workflow and TaxDome for client-facing portal — $50-65/user/month overhead but it covers both bottlenecks. Alternative: pick Karbon and add Liscio for portal, which costs less but adds a third tool to keep in sync.",
          },
          {
            scenario:
              "Solo CPA, 50 clients, growing past your capacity ceiling",
            pick: "TaxDome",
            rationale:
              "Solo firms rarely have a team coordination problem worth paying Karbon's premium for. TaxDome's all-in-one bundle replaces 3-4 separate subscriptions (e-sign, portal, invoicing) at solo scale and is materially faster to learn.",
          },
        ]}
        quotes={[
          {
            text: "Karbon's email triage is the only feature I've ever had where I sit down at 8am and my inbox is already sorted. Worth the price tag on its own. Workflow is great but takes 6 weeks to set up properly.",
            attribution: "Managing Partner, 9-person CPA firm",
            source: "G2 review (Karbon, 4.8/5, March 2026)",
            sourceUrl: "https://www.g2.com/products/karbon/reviews",
          },
          {
            text: "We migrated from a stack of 6 tools to TaxDome and saved roughly $4,000 a year in subscriptions. The client portal got us a 22% better document return rate during tax season — that alone paid for it.",
            attribution: "Owner, 4-person tax firm",
            source: "Capterra review (TaxDome, 4.7/5, January 2026)",
            sourceUrl: "https://www.capterra.com/p/172769/TaxDome/reviews/",
          },
          {
            text: "Karbon is the only tool I've used where the workflow actually models how accounting work moves. TaxDome's templates are fine for repeat work but break down once you have an advisory engagement with dependencies.",
            attribution: "r/Accounting commenter",
            source: "r/Accounting thread on practice management 2026",
            sourceUrl: "https://www.reddit.com/r/Accounting/",
          },
        ]}
        practiqAngle={
          <>
            <p>
              Both Karbon and TaxDome solve real problems. Neither solves
              the problem of <em>knowing what deserves attention across
              your 50-200 clients today without you having to look</em>.
            </p>
            <p>
              That problem only becomes acute past the 50-client-per-
              professional threshold, when context-switching cost
              dominates everything else. Karbon and TaxDome both assume
              you will open the tool, look at a dashboard, and decide
              what to work on. Practiq inverts that: it scans every
              connected client&apos;s QuickBooks overnight, detects
              anomalies and approaching deadlines, prepares draft
              deliverables, and arrives at 8am with a prioritized review
              queue. You spend the day approving and editing rather than
              hunting and gathering.
            </p>
            <p>
              Many firms run Practiq alongside Karbon or TaxDome rather
              than instead of. Karbon stays the workflow engine, TaxDome
              stays the portal — Practiq becomes the AI-native
              intelligence layer that watches the portfolio while you
              sleep.
            </p>
          </>
        }
        faqs={FAQS}
        relatedLinks={[
          {
            href: "/vs/karbon-vs-canopy",
            label: "Karbon vs Canopy",
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
            href: "/compare/taxdome",
            label: "Practiq vs TaxDome",
            eyebrow: "Direct",
          },
        ]}
      />
    </>
  );
}
