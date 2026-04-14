import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/data/blog";
import type { BlogCategory } from "@/data/blog";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { withUtm } from "@/lib/utm";

const SITE_URL = "https://practiq.dev";

// ─────────────────────────────────────────────────────────────────────────
// Vertical configuration — one entry per hub page. Every field here flows
// directly into copy, metadata, and schema.org output.
// ─────────────────────────────────────────────────────────────────────────

interface VerticalFaq {
  question: string;
  answer: string;
}

interface VerticalBenefit {
  heading: string;
  body: string;
}

interface VerticalConfig {
  // Canonical label used in blog post frontmatter (`category` field).
  label: BlogCategory;
  // Plural form used in headings ("Accounting Firms", "Law Firms").
  title: string;
  // Short uppercase kicker shown above the hero title.
  kicker: string;
  // Hero headline — leads with the firm owner's felt pain.
  heroTitle: string;
  // 2–3 sentence subtitle explaining the product against this pain.
  heroSubtitle: string;
  // Page title (≤ 60 chars ideal) and meta description (150–160 chars).
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  // "Why a workspace like this" — 3–4 vertical-specific benefit blocks.
  benefits: VerticalBenefit[];
  // 4–5 FAQs used both on-page and (potentially later) as FAQ schema.
  faqs: VerticalFaq[];
}

const VERTICALS: Record<string, VerticalConfig> = {
  accounting: {
    label: "Accounting",
    title: "Accounting Firms",
    kicker: "For accounting firms",
    heroTitle:
      "Managing 50 clients at a small accounting firm, without losing your mind.",
    heroSubtitle:
      "Practiq is the shared team workspace for small CPA, tax, and bookkeeping firms running 30–200 client relationships. Each client gets a dedicated space with full history, and an AI assistant scans every client overnight so Monday doesn't start with three hours of tab-switching.",
    metaTitle:
      "Practiq for Accounting Firms — AI workspace for CPAs managing 50+ clients",
    metaDescription:
      "Practiq is the AI workspace for small accounting firms managing 50–200 clients. Shared memory, overnight scans, one-click context switching. Early access open.",
    keywords: [
      "accounting firm software",
      "CPA practice management",
      "small accounting firm AI",
      "bookkeeping firm workspace",
      "tax firm client management",
      "multi-client accounting",
      "accounting firm context switching",
      "CPA workspace",
    ],
    benefits: [
      {
        heading: "Every client, fully remembered",
        body: "Balances, prior years, the questions their CFO always asks, the quirks of their QuickBooks chart of accounts — Practiq stores the entire relationship, not just the tasks. Switching from an S-Corp to a restaurant to a 1099 contractor takes one click and the context loads instantly.",
      },
      {
        heading: "An AI that works the overnight shift",
        body: "Every night Practiq scans each client's books, flags unusual transactions, queues ready-to-send follow-up questions, and builds a morning priority list. You walk in Monday to a triaged view of the 5 clients that need you today — not a 50-row checklist that forces you to decide where to start.",
      },
      {
        heading: "Shared memory when people move on",
        body: "When a staff accountant leaves or a new one joins, the client knowledge doesn't walk out the door. Notes, preferences, recurring questions, and deliverable history live inside the workspace — not in someone's inbox, notebook, or head.",
      },
      {
        heading: "Built for the firm, not a single seat",
        body: "Practiq is designed around how small firms actually work: partners reviewing, senior staff preparing, juniors learning. Everyone sees the same client truth. The AI writes in your firm's voice, not a generic one.",
      },
    ],
    faqs: [
      {
        question:
          "Does Practiq replace QuickBooks or my tax prep software?",
        answer:
          "No. Practiq sits on top of the tools you already use. It's the shared workspace and AI memory layer — QuickBooks, Drake, Lacerte, and your document store continue to be the system of record. Practiq makes switching between clients and finding context trivial, not another silo to maintain.",
      },
      {
        question: "How is this different from Karbon or TaxDome?",
        answer:
          "Karbon and TaxDome are workflow / practice management platforms built around tasks and templates. Practiq is a workspace built around client memory and AI assistance. The difference shows up the first Monday morning you use it: instead of checking off tasks, you're reviewing what the AI already flagged and prepared overnight.",
      },
      {
        question:
          "How many clients does it take for this to be worth it?",
        answer:
          "Based on our conversations with small firms, the client-context cost starts eating the day somewhere between 30 and 50 active clients. Below 30, a good notes discipline and calendar will usually do. Above 50, firms report losing 6–10 hours a week to tab-switching alone — that's where Practiq pays for itself fastest.",
      },
      {
        question: "What about busy season / tax season?",
        answer:
          "That's exactly when the workspace matters most. Practiq's overnight scans surface which returns are missing documents, which clients still owe responses, and which deliverables are stale — so you spend the peak weeks on the work that only a CPA can do, not on hunting down where you left off with Client #38.",
      },
      {
        question: "Is my client data secure?",
        answer:
          "Yes. Every workspace is isolated, data is encrypted in transit and at rest, and we do not train models on customer data. Practiq is designed to meet the same confidentiality bar small firms already hold for client trust — not to be a novelty AI tool bolted onto that bar.",
      },
    ],
  },

  law: {
    label: "Law",
    title: "Law Firms",
    kicker: "For law firms",
    heroTitle:
      "The practice management surface small law firms actually wanted.",
    heroSubtitle:
      "Practiq is the shared workspace for solo and small-firm attorneys managing 30–200 active matters. Each client gets a dedicated space with full case history, and an AI assistant surfaces what needs attention before you start billing time.",
    metaTitle:
      "Practiq for Law Firms — AI workspace for solo and small firms",
    metaDescription:
      "Practiq is the AI workspace for small law firms managing 30–200 matters. Shared client memory, overnight priority scans, one-click matter switching. Early access.",
    keywords: [
      "small law firm software",
      "solo attorney practice management",
      "law firm AI workspace",
      "matter management software",
      "case management alternative",
      "law firm client memory",
      "practiq law",
      "small firm legal tech",
    ],
    benefits: [
      {
        heading: "Every matter, fully in context",
        body: "Parties, prior communications, pleadings, deadlines, the client's preferred tone, the way opposing counsel has behaved — Practiq stores the full matter context, not just billable entries. Switching matters takes one click and you arrive already oriented.",
      },
      {
        heading: "Deadlines that surface themselves",
        body: "Practiq scans your active matters overnight and flags what needs attention: statutes approaching, filings stale, clients who have gone quiet. Monday morning becomes a triaged priority list, not a desperate sort through the inbox.",
      },
      {
        heading: "Shared memory across the firm",
        body: "When a paralegal moves on or you bring in contract help, the matter knowledge doesn't leave with them. Notes, key documents, and communication history live inside the workspace — available to everyone who needs them, locked to those who don't.",
      },
      {
        heading: "Billable hours, less busywork",
        body: "Small firms win by being senior-touch on every matter. Practiq removes the non-billable overhead around that work — the hunting, the re-reading, the re-explaining — so every hour you log is closer to the hour a client actually pays for.",
      },
    ],
    faqs: [
      {
        question:
          "Does Practiq replace Clio / MyCase / PracticePanther?",
        answer:
          "No. Practiq is the workspace and AI memory layer on top of whatever practice management tool you use for billing, trust accounting, and matter tracking. We don't try to replace Clio's trust-accounting compliance surface — we make the day-to-day matter context instantly available so you don't have to go hunting in three places.",
      },
      {
        question:
          "Is this okay from a confidentiality / privilege standpoint?",
        answer:
          "Workspaces are strictly isolated per client. Data is encrypted in transit and at rest, and we do not train models on customer data. Attorneys using Practiq treat it the same way they treat their document management system — a tool under the firm's confidentiality umbrella, not a public-facing surface.",
      },
      {
        question: "How many matters makes this worth it?",
        answer:
          "Solo attorneys and small firms tell us the wall hits somewhere between 20 and 50 active matters. Below that, a good calendar and file discipline works. Above that, context-switching time dominates — one attorney we talked to measured 90 minutes a day lost to tab-switching alone across a 40-matter caseload.",
      },
      {
        question: "Can the AI draft pleadings or give legal advice?",
        answer:
          "No, and that's a design choice. Practiq's AI summarizes context, flags priorities, and helps draft routine client communication — the non-judgment work. Every legal judgment, every pleading that goes out the door, stays with the attorney. We are very deliberately not building an 'AI lawyer'.",
      },
      {
        question: "What about trust accounting and IOLTA compliance?",
        answer:
          "That stays in your practice management / accounting system. Practiq doesn't touch trust accounting — we operate at the matter-context and communication layer above it. Bright-line rule: anything that touches client funds lives in your trust-accounting system of record.",
      },
    ],
  },

  consulting: {
    label: "Consulting",
    title: "Consulting Firms",
    kicker: "For consulting firms",
    heroTitle:
      "The client workspace boutique consulting firms keep rebuilding in Notion.",
    heroSubtitle:
      "Practiq is the shared workspace for consulting boutiques running 20–100 simultaneous engagements. Each client gets a dedicated space with the full engagement history, and an AI assistant builds a priority view of what's slipping and what's billable this week.",
    metaTitle:
      "Practiq for Consulting Firms — AI workspace for boutique engagements",
    metaDescription:
      "Practiq is the AI workspace for consulting firms managing 20–100 engagements. Shared team memory, engagement context switching, AI priority scans. Early access.",
    keywords: [
      "consulting firm software",
      "boutique consulting workspace",
      "engagement management",
      "consulting client management",
      "consulting firm AI",
      "management consulting tools",
      "small consulting firm",
      "consulting utilization",
    ],
    benefits: [
      {
        heading: "Engagements with complete memory",
        body: "Scope, stakeholders, prior decks, the CEO's line-in-the-sand position, what the CFO actually worries about — Practiq captures the shape of every engagement. Switching from a go-to-market engagement to a cost-out engagement takes one click and lands you in the right head.",
      },
      {
        heading: "Utilization you can actually see",
        body: "Practiq scans every active engagement overnight and flags where the team is over-committed, which clients have gone quiet, and which deliverables are stale. Partners see the real picture of the book; consultants see what the week actually demands.",
      },
      {
        heading: "Knowledge that compounds across the firm",
        body: "Deliverables, methodologies, and hard-won frameworks stay in the workspace instead of on someone's laptop. When a junior joins or a senior rolls off, the firm's IP doesn't disappear with them. The AI draws on that corpus, never the public web by default.",
      },
      {
        heading: "Billable-first, not busywork-first",
        body: "The reason boutique firms beat Big Four on engagements like these is senior-touch on every client. Practiq removes the non-billable overhead — the context reconstruction, the deck archaeology, the 'where did we leave this?' — so you can keep that senior-touch as you scale.",
      },
    ],
    faqs: [
      {
        question: "Is this a replacement for Notion / Airtable / Asana?",
        answer:
          "No — it's the layer you keep trying to build inside those tools. Notion and Airtable are generic canvases; consulting firms end up rebuilding the same client-workspace pattern in every one. Practiq ships that pattern with AI memory out of the box, and the tools you do keep are the ones that actually fit what they were built for.",
      },
      {
        question: "Does it work for retainer as well as project work?",
        answer:
          "Yes. Retainers, fixed-scope projects, and hybrid engagements all map to the same client-workspace unit. The AI treats open retainers and active projects the same way: scan, flag, prioritize. Billing model is orthogonal to memory model.",
      },
      {
        question:
          "How does this help with scope creep and utilization?",
        answer:
          "Because the workspace is the single source of truth, everything the team does against a client shows up in one place. Partners see utilization across the book without DM-ing senior consultants. Scope additions get captured as they happen, not discovered at invoicing time. That two effects alone buy back several percentage points of margin for most firms.",
      },
      {
        question: "Can our clients see anything inside Practiq?",
        answer:
          "Not by default. Practiq is a team-internal workspace. Client-facing deliverables still go out via your document / email / presentation tools. The AI can help draft those deliverables in your firm's voice, but publishing them is an explicit action — we never auto-send anything to a client.",
      },
      {
        question: "Is my client work used to train models?",
        answer:
          "No. Client work is not used to train anyone's models, ours or our providers'. This is table stakes for boutique consulting — your IP and your clients' strategy can't leak into someone else's model. We treat that as a non-negotiable.",
      },
    ],
  },

  hr: {
    label: "HR",
    title: "HR Advisory Firms",
    kicker: "For HR advisory firms",
    heroTitle:
      "The shared memory layer every HR advisory firm eventually needs.",
    heroSubtitle:
      "Practiq is the shared workspace for fractional HR and HR advisory firms supporting 20–75 client companies at once. Each client gets a dedicated space with the full employee / policy / comp-plan history, and an AI assistant surfaces what needs attention across your book every morning.",
    metaTitle:
      "Practiq for HR Advisory Firms — AI workspace for fractional HR teams",
    metaDescription:
      "Practiq is the AI workspace for HR advisory and fractional HR firms managing 20–75 client companies. Shared client memory, compliance scans, overnight priorities.",
    keywords: [
      "HR advisory firm software",
      "fractional HR workspace",
      "HR consulting tools",
      "multi-client HR management",
      "HR firm AI",
      "PEO alternative",
      "fractional CPO",
      "HR compliance workspace",
    ],
    benefits: [
      {
        heading: "Every client, every policy, fully in memory",
        body: "Employee counts, jurisdictions, open investigations, comp philosophy, the handbook rev history — Practiq stores the full HR relationship, not just tasks. Switching from a 15-person agency to a 200-person factory to a remote-only startup takes one click and lands you in the right HR posture.",
      },
      {
        heading: "Compliance that surfaces itself",
        body: "Multi-state, multi-jurisdiction, multi-deadline. Practiq scans your book overnight and flags what's due, what's drifting out of compliance, and which clients need a conversation this week. You spend the week on the advisory work, not the 'what does California need this quarter' search.",
      },
      {
        heading: "Advisory knowledge that compounds",
        body: "Playbooks, templates, hard conversations you've already navigated — they stay in the workspace instead of on someone's laptop. When a junior consultant joins or a senior rolls off, the firm's HR IP stays put. Every client benefits from every past engagement.",
      },
      {
        heading: "Built for advisory, not self-serve HRIS",
        body: "Practiq isn't replacing your clients' HRIS. It's the firm-side workspace that makes senior-touch advisory work possible at the book sizes HR firms actually run. The product starts from 'you are a partner advising 30 companies,' not 'you are an HR manager for one.'",
      },
    ],
    faqs: [
      {
        question: "Does this replace BambooHR / Rippling / Gusto?",
        answer:
          "No. Those are the HRIS / payroll systems your clients use internally. Practiq is the advisory firm's workspace on top — the place where you keep the memory and judgment of serving 30 companies at once. The HRIS stays with the client; the context stays with you.",
      },
      {
        question: "How is this different from a PEO?",
        answer:
          "PEOs take legal co-employment of your clients' staff. Practiq doesn't touch employment — we sit inside the advisory firm. Many of our users advise clients on whether a PEO is right for them, and Practiq is the workspace where that advisory work happens. Very different layer of the stack.",
      },
      {
        question: "Can the AI give HR or legal advice?",
        answer:
          "No. The AI drafts, summarizes, and flags — it does not make employment-law judgments. Every policy, every decision, every difficult conversation stays under the HR advisor's professional responsibility. We intentionally don't build 'AI HR advice'.",
      },
      {
        question: "What about PII and sensitive employee data?",
        answer:
          "Workspaces are strictly isolated per client. Data is encrypted in transit and at rest, we do not train models on customer data, and you control what gets imported. HR advisory firms already hold a high confidentiality bar for their clients — Practiq is designed to sit inside that bar, not next to it.",
      },
      {
        question: "How many client companies makes this worth it?",
        answer:
          "Fractional HR firms report the wall hits somewhere between 20 and 40 concurrent client companies. Below that, a spreadsheet and a good notebook work. Above that, multi-jurisdiction compliance and the sheer number of open employee situations eat the week. That's where the workspace pays back fastest.",
      },
    ],
  },

  agency: {
    label: "Agency",
    title: "Marketing & Creative Agencies",
    kicker: "For agencies",
    heroTitle:
      "The agency workspace you keep trying to build in Notion and Slack.",
    heroSubtitle:
      "Practiq is the shared workspace for marketing, design, and creative agencies running 15–60 client accounts at once. Each account gets a dedicated space with the full account history, and an AI assistant builds a priority view of which accounts are slipping and which are ready to deliver.",
    metaTitle:
      "Practiq for Agencies — AI workspace for marketing & creative firms",
    metaDescription:
      "Practiq is the AI workspace for marketing and creative agencies managing 15–60 accounts. Shared account memory, scope scans, overnight priorities. Early access.",
    keywords: [
      "marketing agency software",
      "creative agency workspace",
      "agency client management",
      "account management AI",
      "agency utilization",
      "agency project management alternative",
      "boutique agency tools",
      "agency retainer management",
    ],
    benefits: [
      {
        heading: "Every account, fully remembered",
        body: "Brand guidelines, prior campaigns, the CMO's taste, the three things the founder always pushes back on — Practiq keeps the full account relationship. Switching from a B2B SaaS account to a DTC brand to a local ortho practice takes one click and lands you in the right creative posture.",
      },
      {
        heading: "Scope and utilization in one view",
        body: "Practiq scans active accounts overnight and flags scope creep, stalled deliverables, retainer hours trending over, and accounts that have gone quiet. Account leads see what's drifting; partners see what's profitable; creatives see what's actually due this week.",
      },
      {
        heading: "Creative memory that compounds",
        body: "Winning concepts, past decks, the brand's no-go list, client-specific conventions — all live in the workspace. When a strategist rolls off or a designer joins, the account's creative IP stays with the agency. The AI draws on that corpus, not the open web, when drafting in an account's voice.",
      },
      {
        heading: "Built for senior-touch agencies",
        body: "The reason a boutique agency wins the work is senior creative on every account. Practiq removes the non-creative overhead around that — the status-update archaeology, the 'what did we already try' search — so senior creatives stay on strategy and craft, not on hunting.",
      },
    ],
    faqs: [
      {
        question: "Is this a replacement for Asana / Monday / ClickUp?",
        answer:
          "No. Those are task / project trackers. Practiq is the account-level workspace and memory layer above them. Your task tracker keeps doing what it's good at; Practiq is where the story of each account lives — the decisions, the preferences, the voice, the history.",
      },
      {
        question: "Can the AI do the creative work?",
        answer:
          "No, and we're deliberate about that. The AI handles context, priority, and first-draft client communications in your voice. Concepts, strategy, and creative direction stay with the agency. 'AI that makes the ads' is not what boutique agency clients are hiring you for.",
      },
      {
        question:
          "How does this help with scope creep on retainers?",
        answer:
          "Because the workspace is the single source of truth, scope additions get captured when they happen — not at invoicing time. Practiq flags when an account is trending over retainer, when a small 'can you also…' has grown into a new deliverable, and when a conversation should become a change order. That alone buys back several points of agency margin.",
      },
      {
        question: "What about client approval workflows?",
        answer:
          "Client-facing deliverables still go out through your normal tools (email, Figma share links, Frame.io, etc.). Practiq is the agency-internal workspace behind that — we never auto-send anything to a client. The AI helps draft what goes out, the account lead decides what does.",
      },
      {
        question: "How many accounts does it take to be worth it?",
        answer:
          "Agencies tell us the breakage point is roughly 15 to 30 concurrent accounts. Below that, a good account lead and a weekly status meeting cover it. Above that, context-switching and scope drift dominate the week. That's where the shared workspace earns back multiples of its cost.",
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────

type VerticalSlug = keyof typeof VERTICALS;

interface Props {
  params: Promise<{ vertical: string }>;
}

export async function generateStaticParams() {
  return (Object.keys(VERTICALS) as VerticalSlug[]).map((vertical) => ({
    vertical,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vertical } = await params;
  const config = VERTICALS[vertical as VerticalSlug];
  if (!config) return {};
  const canonical = `${SITE_URL}/for/${vertical}`;
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    keywords: config.keywords,
    alternates: { canonical },
    openGraph: {
      title: config.metaTitle,
      description: config.metaDescription,
      type: "website",
      url: canonical,
      siteName: "Practiq",
    },
    twitter: {
      card: "summary_large_image",
      title: config.metaTitle,
      description: config.metaDescription,
    },
  };
}

export default async function VerticalHubPage({ params }: Props) {
  const { vertical } = await params;
  const config = VERTICALS[vertical as VerticalSlug];
  if (!config) notFound();

  const canonical = `${SITE_URL}/for/${vertical}`;

  // Filter + sort the blog corpus for this vertical. Category labels in the
  // blog data are the canonical vertical names — so "Accounting" exactly
  // matches BLOG_POSTS[i].category for posts in that vertical.
  const posts = BLOG_POSTS.filter((p) => p.category === config.label)
    .slice()
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, 12);

  // CollectionPage schema — tells Google + AEO crawlers "this is a hub of
  // articles about X industry," and gives them a BreadcrumbList for SERP
  // breadcrumbs.
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": canonical,
    url: canonical,
    name: `Practiq for ${config.title}`,
    description: config.metaDescription,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: {
      "@type": "Thing",
      name: config.title,
      description: `Boutique ${config.title.toLowerCase()} running 20–200 concurrent client relationships.`,
    },
    hasPart: posts.map((post) => ({
      "@type": "Article",
      headline: post.title,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.date,
      author: { "@type": "Organization", name: post.author },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "For", item: `${SITE_URL}/for` },
      {
        "@type": "ListItem",
        position: 3,
        name: config.title,
        item: canonical,
      },
    ],
  };

  const topCtaHref = withUtm("/#cta", {
    source: "hub",
    medium: "landing",
    campaign: `for-${vertical}`,
  });
  const bottomCtaHref = withUtm("/#cta", {
    source: "hub",
    medium: "landing",
    campaign: `for-${vertical}-bottom`,
  });

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="pt-32 pb-16 px-6">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto text-center mb-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-5">
            {config.kicker}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-100 tracking-[-0.03em] leading-[1.05] mb-6 text-balance">
            {config.heroTitle}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
            {config.heroSubtitle}
          </p>
          <Link
            href={topCtaHref}
            className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
          >
            Request Early Access
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* ── Why a workspace like this ──────────────────────────── */}
        <section className="max-w-5xl mx-auto mb-24">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Why a workspace like this
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-4">
              Built around the way {config.title.toLowerCase()} actually run.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {config.benefits.map((benefit) => (
              <div key={benefit.heading} className="bento-card p-8">
                <h3 className="text-lg font-bold text-zinc-100 mb-3 leading-snug">
                  {benefit.heading}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {benefit.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Key resources ───────────────────────────────────────── */}
        {posts.length > 0 && (
          <section className="max-w-5xl mx-auto mb-24">
            <div className="text-center mb-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
                Key resources
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-3">
                Reading for {config.title.toLowerCase()}
              </h2>
              <p className="text-sm text-zinc-500 max-w-xl mx-auto">
                Our recent writing on running a better {config.title.toLowerCase().replace(" firms", " firm").replace(" agencies", " agency")}.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bento-card p-7 flex flex-col justify-between hover:border-zinc-600 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <time className="text-xs text-zinc-500">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                      <span className="text-xs text-zinc-600">&middot;</span>
                      <span className="text-xs text-zinc-500">
                        {post.readingTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-3 group-hover:text-white transition-colors leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-end">
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                See all writing
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto mb-24">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Frequently asked
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-3">
              Questions from {config.title.toLowerCase()}
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {config.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group bento-card p-6 transition-colors"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer text-base font-bold text-zinc-100 leading-snug list-none">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="text-zinc-500 group-open:rotate-45 transition-transform text-xl font-light shrink-0"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto">
          <div className="glass-panel p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-[-0.03em] mb-4 text-balance">
              Ready to see what a firm-shaped workspace feels like?
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto mb-8">
              Practiq is in early access for boutique {config.title.toLowerCase()}. We read every signup and reply personally.
            </p>
            <Link
              href={bottomCtaHref}
              className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
            >
              Request Early Access
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
