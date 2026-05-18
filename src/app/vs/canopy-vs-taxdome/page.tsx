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
 * /vs/canopy-vs-taxdome — long-form comparison page.
 *
 * Targets the verbatim GSC query "canopy vs taxdome" (60 impressions /
 * 28d at avg position 45.0). The dynamic /vs/[slug] also serves
 * "taxdome-vs-canopy" via VS_PAIRS; this dedicated page captures the
 * less-common "canopy-vs-taxdome" ordering with richer, intent-matched
 * content.
 */

const PAGE_URL = `${SITE_URL}/vs/canopy-vs-taxdome`;
const PAGE_TITLE =
  "Canopy vs TaxDome — IRS resolution power vs all-in-one client portal (2026)";
const PAGE_DESCRIPTION =
  "Side-by-side comparison for boutique tax firms: workflow, tax resolution, IRS transcripts, client portal, AI, pricing. Honest verdicts.";

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
    "canopy vs taxdome",
    "taxdome vs canopy",
    "canopy or taxdome",
    "canopy tax software vs taxdome",
    "best tax practice management 2026",
    "tax resolution software comparison",
  ],
};

const FAQS: FaqItem[] = [
  {
    q: "Which is cheaper, Canopy or TaxDome?",
    a: "Canopy's base tier (Client Engagement) at $45/user/mo is the cheapest sticker in the category. TaxDome's flat $800/user/year (~$67/mo) sits higher. But TaxDome bundles everything (portal, e-sign, payments, document management) into the base price, while Canopy charges separately for the Tax Resolution module ($50/user/mo additional). For a tax-resolution-heavy firm, all-in Canopy lands around $95/user/mo — higher than TaxDome. For a tax-prep-only firm, Canopy stays cheaper.",
  },
  {
    q: "Does Canopy have IRS transcript access that TaxDome doesn't?",
    a: "Yes — and this is the single biggest differentiator. Canopy has native IRS Transcript Delivery System (TDS) integration: wage and income transcripts, account transcripts, return transcripts pulled in 90 seconds without leaving Canopy. TaxDome does not have this. If you do meaningful tax resolution or audit representation work, this alone is reason enough to pick Canopy.",
  },
  {
    q: "Which has the better client portal?",
    a: "TaxDome — clearly and consistently. TaxDome's portal includes a branded mobile app (your firm's logo and colors), a guided tax organizer flow for individual clients, integrated e-signature, payment collection, and the highest measured client document return rate in the category. Canopy's portal is responsive web with e-sign and document requests — functional and clean, but visibly less mobile-polished than TaxDome's native app.",
  },
  {
    q: "Can I migrate from Canopy to TaxDome?",
    a: "Yes. TaxDome's white-glove migration team will pull your client list, document library, and tax engagement history from Canopy. Workflows have to be rebuilt manually because the two platforms model engagements differently. Budget 30-50 partner hours for the migration. Going the other direction (TaxDome → Canopy) is similar effort.",
  },
  {
    q: "Which has better AI features?",
    a: "TaxDome — narrowly. TaxDome ships document summarization, automatic document tagging (W-2, 1099, K-1 detection on upload), and a chat-style Q&A across the document set. Canopy's AI features in 2026 are limited to improved document search. Neither is autonomous AI — neither scans portfolios overnight or prepares deliverables before you ask. The AI gap favors TaxDome for tax-prep-focused workflows; it isn't large.",
  },
  {
    q: "Is Canopy better for tax resolution work?",
    a: "Yes — substantially. Canopy ships purpose-built workflows for Form 433-A/B/F (collection information statements), Form 656 (offer in compromise), audit representation, and IRS notice intake with auto-tagging. TaxDome has no equivalent resolution-specific workflows. For firms whose practice mix is 20%+ resolution work, Canopy is the only realistic answer.",
  },
  {
    q: "Which fits a solo CPA best?",
    a: "TaxDome — usually. Solo CPAs typically don't need Canopy's resolution module, the bundled all-in-one pricing of TaxDome means fewer integrations to manage, and the client portal experience reduces document-chasing time during tax season. The exception: a solo CPA whose practice is heavily resolution-focused (an EA who specializes in IRS work, for example) should still pick Canopy.",
  },
  {
    q: "Can I run Canopy alongside TaxDome?",
    a: "It's done occasionally — typically by firms that want Canopy's resolution module for their resolution clients and TaxDome's portal for everyone else. The duplication adds $50-80/user/month and ~3-5 hours/week of admin keeping client records in sync. It's only worth it for firms with a meaningful resolution practice running alongside a high-volume tax prep operation. Most firms pick one.",
  },
];

export default function CanopyVsTaxDomePage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Comparisons", url: `${SITE_URL}/vs` },
    { name: "Canopy vs TaxDome", url: PAGE_URL },
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
        name: "Canopy",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Practice Management + Tax Resolution",
        operatingSystem: "Web Browser",
        description:
          "Practice management with native IRS Transcript Delivery System access and tax resolution workflows.",
        offers: {
          "@type": "Offer",
          price: "45",
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
          "All-in-one practice management with strongest client portal, document management, and e-signature in the category.",
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
        slug="canopy-vs-taxdome"
        eyebrow="Tax & Accounting · Comparison · 2026"
        h1="Canopy vs TaxDome — IRS resolution power vs all-in-one client portal"
        lead="Canopy and TaxDome are the two practice management platforms most often shortlisted by US tax-heavy firms in 2026. They are not really competitors in the strict sense — they win on different feature dimensions. Canopy is the only major PM with native IRS Transcript Delivery System access plus a mature tax resolution module. TaxDome is the strongest client portal and the best all-in-one bundle for solo-to-small firms. Which one fits depends almost entirely on whether IRS correspondence is a meaningful slice of your fee revenue."
        tools={[
          {
            name: "Canopy",
            tagline:
              "PM + native IRS transcripts + resolution workflows. Best for tax-resolution-heavy firms.",
            priceStart: "From $45/user/mo (Engagement)",
          },
          {
            name: "TaxDome",
            tagline:
              "Best-in-tier client portal + all-in-one bundle. Best for solo-to-4-person firms.",
            priceStart: "From $800/user/yr (~$67/mo)",
          },
        ]}
        comparisonMatrix={[
          {
            label: "Best for",
            cells: [
              {
                name: "Canopy",
                value: "Tax-resolution-heavy firms, IRS correspondence work",
              },
              {
                name: "TaxDome",
                value: "Solo-to-4-person tax-prep firms wanting bundled tools",
              },
            ],
          },
          {
            label: "IRS Transcript Delivery",
            cells: [
              {
                name: "Canopy",
                value:
                  "Native — wage/income, account, return transcripts",
                winner: true,
              },
              { name: "TaxDome", value: "Not supported" },
            ],
          },
          {
            label: "Tax resolution workflows",
            cells: [
              {
                name: "Canopy",
                value: "Form 433-A/B/F, Form 656, audit response native",
                winner: true,
              },
              { name: "TaxDome", value: "Generic job templates only" },
            ],
          },
          {
            label: "Client portal",
            cells: [
              { name: "Canopy", value: "Responsive web, e-sign, doc requests" },
              {
                name: "TaxDome",
                value:
                  "Branded mobile app, organizer flow, payments, e-sign",
                winner: true,
              },
            ],
          },
          {
            label: "Document management",
            cells: [
              { name: "Canopy", value: "Solid — folders, e-sign, OCR" },
              {
                name: "TaxDome",
                value:
                  "Best-in-tier — OCR + auto-tagging + AI summarization",
                winner: true,
              },
            ],
          },
          {
            label: "AI features (2026)",
            cells: [
              { name: "Canopy", value: "Improved doc search only" },
              {
                name: "TaxDome",
                value: "Doc summarization + auto-tagging + chat Q&A",
                winner: true,
              },
            ],
          },
          {
            label: "Time + billing + payments",
            cells: [
              {
                name: "Canopy",
                value: "Built-in time + billing + Stripe payments",
                winner: true,
              },
              {
                name: "TaxDome",
                value: "Built-in invoicing + payment processing",
                winner: true,
              },
            ],
          },
          {
            label: "Integrations (QBO, Lacerte, Drake)",
            cells: [
              {
                name: "Canopy",
                value: "QBO, Lacerte, Drake, CCH, ProSeries",
                winner: true,
              },
              {
                name: "TaxDome",
                value: "QBO, Xero, Lacerte, Drake, ProSeries, Zapier",
                winner: true,
              },
            ],
          },
          {
            label: "Mobile client experience",
            cells: [
              {
                name: "Canopy",
                value: "Responsive web (client side has separate app)",
              },
              {
                name: "TaxDome",
                value: "Native branded mobile app for clients",
                winner: true,
              },
            ],
          },
          {
            label: "Starting price",
            cells: [
              { name: "Canopy", value: "$45/user/mo (Engagement)" },
              { name: "TaxDome", value: "$800/user/yr (~$67/mo)" },
            ],
          },
        ]}
        sections={[
          {
            id: "tax-resolution",
            heading:
              "Tax resolution — the only feature where one tool wins by a wide margin",
            body: (
              <>
                <p>
                  This is the dimension where Canopy and TaxDome diverge
                  most cleanly. Canopy is the only major accounting
                  practice management platform with native IRS
                  Transcript Delivery System (TDS) integration. You pull
                  a client&apos;s wage and income transcripts, account
                  transcripts, or return transcripts in 90 seconds
                  without leaving Canopy. The same workflow on
                  TaxDome — or any other major PM — is a 10-15 minute
                  manual flow through the IRS e-Services portal.
                </p>
                <p>
                  Canopy also ships purpose-built workflows for the rest
                  of resolution practice: Form 433-A, 433-B, and 433-F
                  (collection information statements) auto-populated from
                  client records, Form 656 (offer in compromise)
                  drafting, audit representation case templates, IRS
                  notice intake from the client portal with auto-tagging
                  by notice type. TaxDome has none of this — you would
                  build the resolution workflow on top of TaxDome&apos;s
                  generic job templates, which works for low volume but
                  doesn&apos;t scale.
                </p>
                <p>
                  <strong>The deciding question:</strong> if 15%+ of your
                  fee revenue comes from resolution, OIC, IA, or audit
                  rep work, you are picking Canopy. If you are 95% tax
                  prep with maybe one or two resolution clients a year,
                  the question is genuinely open.
                </p>
              </>
            ),
          },
          {
            id: "client-portal",
            heading:
              "Client portal — TaxDome's strongest dimension",
            body: (
              <>
                <p>
                  TaxDome&apos;s portal is the single feature firms cite
                  most often when explaining why they picked TaxDome.
                  The portal includes a branded native mobile app (your
                  firm logo, your colors), a guided tax organizer flow
                  that walks individual clients through each document
                  needed, integrated e-signature, integrated payment
                  collection, and a clean upload experience that works
                  identically from desktop and mobile.
                </p>
                <p>
                  The measurable consequence: TaxDome firms commonly
                  report document return rates 15-25% higher than their
                  pre-TaxDome baseline during tax season. The mobile app
                  is the lever — it removes the &ldquo;I&apos;ll do it
                  on my desktop later&rdquo; problem that kills document
                  collection for most firms whose clients are
                  individuals.
                </p>
                <p>
                  Canopy&apos;s portal is responsive web — it works on
                  mobile but it is not a native app, the upload flow has
                  more friction, and the organizer flow is shallower.
                  Canopy compensates with a separate client-side
                  document-upload mobile app, which is better than
                  Karbon&apos;s portal but visibly less polished than
                  TaxDome&apos;s.
                </p>
              </>
            ),
          },
          {
            id: "document-management",
            heading: "Document management and AI processing",
            body: (
              <>
                <p>
                  Both platforms ship competent document management:
                  folder structures by client, version history, OCR on
                  uploads, integrated e-signature. The difference is at
                  the AI layer.
                </p>
                <p>
                  TaxDome&apos;s 2026 AI suite includes automatic
                  document tagging (uploaded files are tagged W-2, 1099,
                  K-1, Schedule A, etc. with high accuracy), one-paragraph
                  document summarization that drops a TL;DR at the top
                  of any uploaded PDF, and a chat-style Q&A interface
                  across the document set. The auto-tagging alone saves
                  5-10 minutes per client per tax season.
                </p>
                <p>
                  Canopy&apos;s 2026 AI features are limited to improved
                  document search. Canopy has publicly committed to a
                  Q3 2026 AI push, but as of mid-2026 the document AI
                  gap meaningfully favors TaxDome.
                </p>
              </>
            ),
          },
          {
            id: "pricing",
            heading:
              "Pricing — Canopy is cheaper at the base tier, TaxDome wins when modules pile up",
            body: (
              <>
                <p>
                  Canopy publishes a base tier (Client Engagement) at
                  $45/user/mo billed annually, which covers practice
                  management essentials: client records, document
                  management, basic portal, time tracking, client
                  communication. The Tax Resolution module is sold
                  separately at $50/user/mo additional. Most firms
                  picking Canopy want the resolution module, so realistic
                  Canopy all-in pricing is ~$95/user/mo.
                </p>
                <p>
                  TaxDome publishes a flat $800/user/year (~$67/mo), with
                  all features included at the base price. Multi-year
                  commits unlock meaningful discounts on negotiation.
                  At a 4-person firm: TaxDome runs ~$3,200/year, Canopy
                  base only runs ~$2,160/year, Canopy with resolution
                  runs ~$4,560/year.
                </p>
                <p>
                  <strong>Pricing winners by firm shape:</strong> if you
                  don&apos;t need resolution, Canopy base is the cheapest
                  realistic option in the category. If you do need
                  resolution, TaxDome is cheaper than all-in Canopy,
                  but Canopy is the only one that ships the feature
                  you&apos;re paying for. Pricing isn&apos;t the
                  deciding lever — feature fit is.
                </p>
              </>
            ),
          },
          {
            id: "workflow",
            heading: "Workflow automation and template flexibility",
            body: (
              <>
                <p>
                  Both platforms model engagements as sequences of tasks
                  with assigned roles. Neither has the work-item graph
                  depth Karbon ships. For repeatable seasonal work (1040
                  prep, 1120-S prep, monthly bookkeeping), both tools
                  work fine.
                </p>
                <p>
                  TaxDome&apos;s job template library is broader and more
                  refined for tax prep specifically. The templates ship
                  pre-built for every common return type and walk
                  staff through review checkpoints with built-in
                  conditional logic (e.g. &ldquo;skip the K-1 review step
                  if client has no pass-through entities&rdquo;).
                </p>
                <p>
                  Canopy&apos;s workflow is comparably capable but the
                  template library is shallower out of the box — firms
                  typically build their own. Canopy&apos;s strength
                  reappears on resolution: the resolution-specific
                  workflows are unique in the category.
                </p>
                <p>
                  Neither tool fits advisory or CAS work well. If your
                  engagements are non-linear with dependencies, Karbon
                  is the right answer; if your work is repeatable tax
                  prep, either works.
                </p>
              </>
            ),
          },
          {
            id: "mobile",
            heading: "Mobile experience for clients and staff",
            body: (
              <>
                <p>
                  TaxDome wins this dimension at both ends. Staff get a
                  native iOS/Android app that can review documents, send
                  e-sign requests, approve invoices, and chat with
                  clients. Clients get a branded native mobile app
                  (your firm&apos;s logo, your colors) for upload,
                  e-sign, and payment.
                </p>
                <p>
                  Canopy ships a staff-side responsive web experience
                  rather than a native app. Functional but pre-2020 in
                  UX standards. Canopy does ship a separate client-side
                  mobile app for individuals — that side is fine, just
                  not branded as your firm.
                </p>
                <p>
                  For tax-heavy firms whose individual clients live on
                  their phones, the gap is consequential during January
                  through April. For firms whose clients are
                  businesses with desktop-first work patterns, the gap
                  matters less.
                </p>
              </>
            ),
          },
          {
            id: "integrations",
            heading: "Tax software and accounting integrations",
            body: (
              <>
                <p>
                  Both platforms integrate well with the major tax
                  software stacks: Lacerte, Drake, ProSeries, CCH
                  ProSystem fx. Both will pull last year&apos;s organizer
                  data to pre-populate this year&apos;s document
                  requests.
                </p>
                <p>
                  TaxDome&apos;s integration depth on tax software is
                  slightly ahead of Canopy&apos;s — the import flow is
                  better-documented and the data mapping is more
                  reliable. The difference is small enough that it
                  rarely tips a decision.
                </p>
                <p>
                  On accounting integrations (QuickBooks Online, Xero):
                  TaxDome covers both, Canopy is QBO-strong and
                  Xero-weak. If you have meaningful Xero clients, lean
                  TaxDome.
                </p>
                <p>
                  Canopy&apos;s Stripe integration for payment
                  processing is native; TaxDome&apos;s is also native
                  through TaxDome Payments. Both charge typical Stripe
                  rates (~2.9% + 30¢).
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
                  TaxDome&apos;s onboarding is the lightest in the
                  category. White-glove migration of your client list
                  and templates is included. The TaxDome Academy
                  (training library) is best-in-class — well-produced
                  video courses for every feature with exercises. Most
                  firms are self-sufficient on TaxDome within 2-3 weeks.
                </p>
                <p>
                  Canopy&apos;s onboarding includes a 2-week
                  implementation cycle with a dedicated specialist.
                  Training resources are solid but not as polished as
                  TaxDome Academy. Most firms are productive within 1-2
                  weeks, similar to TaxDome.
                </p>
                <p>
                  Ongoing support is comparable at both vendors:
                  business-hours chat support, median response under 30
                  minutes, active user communities. TaxDome ships
                  features faster; Canopy&apos;s features tend to land
                  with deeper polish.
                </p>
              </>
            ),
          },
        ]}
        operatorPicks={[
          {
            scenario:
              "3-person tax + resolution firm, 60 clients, 35% resolution work",
            pick: "Canopy",
            rationale:
              "IRS Transcript Delivery alone saves you 8-10 hours per resolution case. Resolution-specific forms (433-A, 656) live natively in Canopy. TaxDome's superior portal would help with the 65% tax prep side, but the resolution gap is too large to ignore at this practice mix.",
          },
          {
            scenario:
              "2-person solo+1 tax prep firm, 100 individual clients, no resolution",
            pick: "TaxDome",
            rationale:
              "Your bottleneck is document collection from individuals during tax season. TaxDome's mobile app and organizer flow are the differentiated value here. Canopy is cheaper sticker but solves a problem you don't have.",
          },
          {
            scenario:
              "5-person tax-prep-heavy firm, 200 clients, 5% incidental resolution",
            pick: "TaxDome",
            rationale:
              "5% resolution isn't enough to pay for Canopy's resolution module. TaxDome's portal advantage scales with your client count. For the rare resolution case, you can pull transcripts manually — annoying, but not the deciding constraint.",
          },
          {
            scenario:
              "6-person mixed firm — 60% tax prep + 40% resolution",
            pick: "Canopy (with caveats)",
            rationale:
              "Resolution share is too high to skip the Canopy resolution module. Live with the weaker portal experience for now, or run Liscio alongside Canopy if document collection from individual clients becomes a real bottleneck. The TaxDome alternative would require you to build resolution workflows from generic templates, which doesn't scale.",
          },
        ]}
        quotes={[
          {
            text: "We're a tax resolution shop. Canopy's transcript pulls are basically the entire reason we use them. Everything else about Canopy is good, not great — but the transcript piece saved us 12-15 hours a week during peak.",
            attribution: "Owner, 4-person EA practice",
            source: "G2 review (Canopy, 4.6/5, March 2026)",
            sourceUrl: "https://www.g2.com/products/canopy/reviews",
          },
          {
            text: "Moved off Canopy to TaxDome two years ago. The portal alone got our document return rate from ~70% on time to ~92%. We don't do resolution so we never used those features. Best decision we made.",
            attribution: "Managing Partner, 5-person tax-prep firm",
            source: "Capterra review (TaxDome, 4.7/5, January 2026)",
            sourceUrl: "https://www.capterra.com/p/172769/TaxDome/reviews/",
          },
          {
            text: "Both are good. Canopy is for the firm that says 'we handle a lot of IRS stuff.' TaxDome is for the firm that says 'we just want clients to give us the documents.'",
            attribution: "r/Accounting commenter",
            source: "r/Accounting discussion thread, Q1 2026",
            sourceUrl: "https://www.reddit.com/r/Accounting/",
          },
        ]}
        practiqAngle={
          <>
            <p>
              Canopy gives you superpowers for IRS correspondence.
              TaxDome gives you superpowers for client document
              collection. Neither addresses the deeper problem of
              <em> knowing what across your 50-200 clients deserves
              attention today before you have to go looking</em>.
            </p>
            <p>
              Past the 50-clients-per-professional threshold, the
              dominant cost in a tax-heavy firm is context switching —
              the 12 minutes it takes to load context for the next
              client, multiplied by however many times a day you switch.
              Canopy and TaxDome both assume you will open the tool,
              look at a dashboard, and decide what to work on. Practiq
              inverts that: it scans every connected client&apos;s
              QuickBooks overnight, detects anomalies, monitors
              deadlines, prepares draft deliverables, and arrives at 8am
              with a prioritized review queue.
            </p>
            <p>
              The integration story is straightforward — Practiq runs
              alongside Canopy or TaxDome, not instead of. Canopy keeps
              handling resolution; TaxDome keeps handling portal;
              Practiq becomes the AI-native intelligence layer that
              decides what gets your attention first.
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
            href: "/vs/karbon-vs-canopy",
            label: "Karbon vs Canopy",
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
            href: "/compare/canopy",
            label: "Practiq vs Canopy",
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
