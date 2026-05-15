import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — Practiq",
  description:
    "Detailed answers to the 60+ most common questions about Practiq's AI-Native workspace for boutique accounting, law, HR, consulting, and agency firms. Pricing, product, integrations, security, founding member program, and more.",
  alternates: { canonical: "https://practiq.dev/faq" },
  openGraph: {
    title: "Practiq — Frequently Asked Questions",
    description:
      "60+ answers on product, pricing, integrations, and the Founding Member program for 2-10 person professional services firms.",
    url: "https://practiq.dev/faq",
    type: "website",
  },
};

type FaqEntry = { q: string; a: string };
type FaqSection = { title: string; id: string; faqs: FaqEntry[] };

const SECTIONS: FaqSection[] = [
  {
    title: "What is Practiq?",
    id: "what-is-practiq",
    faqs: [
      {
        q: "What is Practiq?",
        a: "Practiq is an AI-Native workspace for boutique professional services firms (2-10 people) that manage 30-200 clients. An AI agent scans every client overnight, prepares deliverables, drafts client communications, and surfaces what needs partner judgment each morning. Practiq's core thesis: the problem is not that firms don't have enough tools — the problem is that context is lost between clients, and no existing tool holds context the way a human brain does.",
      },
      {
        q: "What problem does Practiq solve?",
        a: "Context switching cost. Partners at firms managing 50+ clients lose an estimated $170,000 per year per partner to rebuilding mental state when switching between client files. Practiq holds client context externally (AI memory per client, background monitoring, proactive deliverable prep) so partners arrive to a queue of approval decisions rather than reconstruction work.",
      },
      {
        q: "Who is Practiq built for?",
        a: "Boutique professional services firms with 2-10 people managing 30-200 active clients each. Primary verticals are accounting/tax/bookkeeping, law firms, HR advisory, consulting, and marketing/creative agencies. The common thread: operators who have outgrown spreadsheets and tribal knowledge but can't afford enterprise practice management (Ironclad, Workday, AuditBoard tier).",
      },
      {
        q: "How is Practiq different from ChatGPT or Claude?",
        a: "ChatGPT and Claude respond when you ask. Practiq acts autonomously. Practiq's background agent scans every client every night, detects anomalies, prepares financial statements / matter summaries / client emails before you ask, and puts them in an approval queue. You review and approve rather than generate from scratch. Also: Practiq is not a chat interface bolted onto your tools — it's a product that integrates with QuickBooks, Clio, Gusto, etc. so the AI has real data to work on.",
      },
      {
        q: "How is Practiq different from TaxDome, Karbon, Clio, MyCase, etc.?",
        a: "Traditional practice management tools (TaxDome, Karbon, Clio, MyCase, PracticePanther) organize client work but require you to do the work. Practiq is a layer on top of or alongside these tools — it uses their data but adds AI-driven proactive work. A firm can keep TaxDome for billing + Practiq for context, or switch to Practiq entirely as Practiq gains integration coverage. See /compare and /alternatives for head-to-head breakdowns.",
      },
      {
        q: "Is Practiq a ChatGPT wrapper?",
        a: "No. Practiq uses multiple LLMs under the hood but the product is not the LLM — the product is the integration layer (QuickBooks/Clio/Gusto data flows), the agent orchestration (background scans, approval queue), the workflow (per-client context memory, pattern learning), and the UI (Command Center dashboard). Swapping GPT-5 for Claude 4 tomorrow does not change what Practiq does.",
      },
    ],
  },
  {
    title: "Pricing & Founding Member",
    id: "pricing",
    faqs: [
      {
        q: "How much does Practiq cost?",
        a: "Practiq is $15 per client per month, with the first 50 firms locking in $10 per client per month for life as Founding Members (33% off forever). Each client comes with 500K tokens per month included. Unlimited team seats. Free trial covers 3 clients for 14 days, no credit card required. Top-up credits available at $10 per 1M tokens (firm-wide shared pool). See /pricing for the full breakdown.",
      },
      {
        q: "What is the Founding Member program?",
        a: "The first 50 firms to commit lock in $10 per client per month for life — the price never increases, even as standard pricing rises after launch. That's 33% off the $15/client/month standard rate, forever. It's our way of thanking early-access firms who commit before the product is fully proven in market. Once 50 firms claim, the Founding Member tier closes permanently.",
      },
      {
        q: "Do you charge per seat or per client?",
        a: "Per client. Pricing tracks the work you do (clients served), not the team you build. A 4-person firm managing 120 clients does more work than a 12-person firm managing 40 — but per-seat pricing punishes the first and subsidizes the second. Per-client pricing aligns the bill with the actual work. Hiring more teammates never bumps your subscription. Cancel anytime.",
      },
      {
        q: "When does billing start?",
        a: "When your firm is invited off the waitlist and completes onboarding, a 14-day free trial begins covering up to 3 clients. Billing starts on day 15 unless you cancel. No credit card required to join the waitlist or start the trial.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. Cancel with one click in your account settings. We export all your client context, documents, and conversation history as a ZIP within 24 hours. After 30 days we permanently delete from our servers. No lock-in, no data ransom.",
      },
      {
        q: "What if I run out of tokens for a client mid-month?",
        a: "Each client includes 500K tokens per month (input + output combined — typical usage runs 200-350K per client). If you go over, top-up credits are available at $10 per 1M tokens, pooled firm-wide so a heavy month on one client draws from credits any client can use. Opt-in only — no surprise auto-overage charges.",
      },
      {
        q: "Do you offer annual discounts?",
        a: "Yes — annual billing is 15% off monthly. Founding Members can choose monthly or annual and keep the Founding Member rate either way.",
      },
      {
        q: "Can I add or remove clients mid-month?",
        a: "Yes. Add a client — prorated charge for the remaining days that month. Remove a client — prorated credit applies to your next invoice. Pricing flexes with the actual size of your book, not with arbitrary plan thresholds.",
      },
    ],
  },
  {
    title: "Product & features",
    id: "product",
    faqs: [
      {
        q: "What does Practiq's AI actually do?",
        a: "Five things: (1) Autonomous monitoring — the AI scans every client's QuickBooks / Clio / Gusto / connected tools data every night and detects anomalies (unusual transactions, missing receipts, deadline approach). (2) Proactive preparation — the AI prepares draft financial statements, matter summaries, payroll reports, and client emails before you ask, based on upcoming deadlines and recurring patterns. (3) Pattern learning — the AI learns how your firm handles specific situations and applies that learning to other similar clients automatically. (4) Workflow orchestration — coordinates month-end close / tax season / quarterly reviews across all your clients in parallel, tracking each client's state. (5) Intelligent intervention — flags problems (cash flow warnings, compliance risks) before they escalate, with recommended action.",
      },
      {
        q: "Does Practiq replace my practice management software?",
        a: "Not initially. Practiq starts as a layer alongside your existing tools (QuickBooks/TaxDome/Clio/Gusto/etc.), using their data to produce AI-driven briefings and deliverables. Over time, as Practiq's feature set grows, some firms choose to consolidate onto Practiq as a primary workspace. Our goal is augmentation first, replacement second — not asking firms to rip out tools that work.",
      },
      {
        q: "How does the Approval Queue work?",
        a: "Every deliverable Practiq's AI prepares (financial statements, emails, matter summaries) enters an Approval Queue. Partners review via a lightweight UI — approve, request changes, or reject. Nothing sends to clients or commits to systems without explicit human approval. The queue is designed for fast triage (keyboard shortcuts, batch approvals for routine items, detailed review for judgment calls).",
      },
      {
        q: "Can I use Practiq without connecting QuickBooks / Clio / etc.?",
        a: "Yes, but with reduced functionality. Practiq works at basic level with manual uploads (financial statements, matter files) — the AI can still hold context and prepare deliverables from uploaded documents. Integration dramatically increases value because the AI gets live data without manual effort.",
      },
      {
        q: "Does Practiq work for solo practitioners?",
        a: "Yes. Per-client pricing works the same whether you're a solo CPA with 12 clients ($120-180/month) or a 6-person firm with 120 clients. Many features designed for teams (multi-seat collaboration, role-based permissions) are hidden for solos, but the core AI-Native Agent features (overnight scan, approval queue, deliverable prep, pattern learning) all work the same. No artificial floor — pay only for the clients you actually serve.",
      },
      {
        q: "How does Practiq handle clients with very different industries?",
        a: "Each client in Practiq has its own context card with industry + firm metadata. The AI adapts its analysis per client — a restaurant client gets food-cost ratio analysis, a SaaS client gets MRR / CAC / runway analysis, a medical practice gets insurance claim aging analysis. The AI learns which metrics matter per industry within your specific firm's workflow.",
      },
      {
        q: "What happens if the AI makes a mistake?",
        a: "Every AI output is reviewed by a human before anything commits. The Approval Queue is designed to catch errors. We also maintain a full audit trail — every AI decision, every human approval, every correction. You can trace any delivered document back to the source data and the approval moment.",
      },
      {
        q: "Can multiple people on my team use Practiq?",
        a: "Yes — unlimited team seats at every price point. Pricing is per client, not per seat, so adding a teammate never bumps your bill. Each seat gets their own login and their own views, with shared access to client context across the team. Role-based permissions (owner / member / viewer, plus per-client access controls) are available on plans with 25+ clients.",
      },
    ],
  },
  {
    title: "Integrations",
    id: "integrations",
    faqs: [
      {
        q: "What integrations does Practiq support?",
        a: "Launch integrations (2026 Q3): QuickBooks Online (read), Clio (read), Gusto (read), Xero (read), Dropbox/Google Drive (read). Planned Q4 2026: bidirectional sync for QB + Clio + Gusto, plus Resend/Gmail for client email. 2027 roadmap: TaxDome, Karbon, BambooHR, Rippling, PracticePanther, MyCase, Salesforce, HubSpot. We prioritize based on waitlist signup verticals.",
      },
      {
        q: "Does Practiq integrate with QuickBooks Desktop?",
        a: "QuickBooks Online is the integration priority for launch. QuickBooks Desktop support is on the 2027 roadmap but requires different architecture (local file import via CSV export). In the meantime, QB Desktop firms can upload trial balances + financial reports manually and Practiq's AI processes them.",
      },
      {
        q: "Can Practiq read my email?",
        a: "Only with explicit opt-in per mailbox. We do not scan general inboxes. For firms that opt in, Practiq reads only emails matching connected client domains, extracts relevant facts (meeting notes, deadline references, client preferences), and stores them in the per-client context. You can disable this anytime.",
      },
      {
        q: "Can I import data from my old practice management tool?",
        a: "Yes, for the top providers (Clio, MyCase, TaxDome, Karbon, Gusto, Rippling). We provide a migration concierge that exports your client list, matter/client histories, document archives, and imports them into Practiq's context system. One-time setup, typically completed in 2-5 business days.",
      },
    ],
  },
  {
    title: "Security & compliance",
    id: "security",
    faqs: [
      {
        q: "How does Practiq handle client data security?",
        a: "Client data is encrypted at rest (AES-256) and in transit (TLS 1.3). We use Supabase (Postgres with row-level security) and AWS for storage, both SOC 2 certified at infrastructure level. Practiq's own SOC 2 Type II audit is in progress for 2026 Q4. Each firm's data is logically isolated per tenant.",
      },
      {
        q: "Is Practiq SOC 2 compliant?",
        a: "SOC 2 Type I audit in progress (expected Q4 2026). Type II follows in 2027. In the interim, our security posture aligns with SOC 2 controls and we can provide a security questionnaire response for firms that need one.",
      },
      {
        q: "How does Practiq handle attorney-client privilege?",
        a: "For law firm customers, we treat all client data as privileged. No cross-firm data sharing. No AI training on your data. Data stays logically isolated. Our terms of service explicitly acknowledge privilege obligations. If a firm-specific Bar Counsel question arises, we work with your ethics counsel directly.",
      },
      {
        q: "Do you train AI models on my firm's data?",
        a: "No. Your firm's client data is never used to train foundation models. We use leading LLMs (OpenAI, Anthropic, Google) with contracts that explicitly prohibit training on input data. All prompt/response data stays in your tenant and is deleted on cancellation.",
      },
      {
        q: "Where is data stored?",
        a: "US East region (AWS us-east-1). For firms with data residency requirements, we offer EU region (Q4 2026) and Canada region (2027 roadmap).",
      },
      {
        q: "Can I delete all my data?",
        a: "Yes. Cancel anytime — we export your full dataset as ZIP within 24 hours and permanently delete from our servers after 30 days. No soft-delete, no backup holds.",
      },
    ],
  },
  {
    title: "For specific verticals",
    id: "verticals",
    faqs: [
      {
        q: "Does Practiq work for accounting / tax / bookkeeping firms?",
        a: "Yes — this is Practiq's primary launch vertical. Features calibrated for CPA/EA workflows include: month-end close orchestration across clients, tax season tracking, QuickBooks anomaly detection, client deliverable preparation (financial statements, tax summaries), and ratio analysis per industry. See /for/accounting for vertical-specific detail.",
      },
      {
        q: "Does Practiq work for law firms?",
        a: "Yes. Law-firm-specific features: matter context persistence, IOLTA trust account anomaly flagging, conflict check workflow, engagement letter templating, and billable hour summarization. Integration with Clio, MyCase, PracticePanther priority. See /for/law and /compare/clio, /compare/mycase, /compare/practicepanther.",
      },
      {
        q: "Does Practiq work for HR advisory firms?",
        a: "Yes. Multi-client HR advisory features: state-by-state compliance monitoring per client company, employee handbook versioning, multi-client benefits administration, and cross-client benchmarking (with explicit consent). Integration with Gusto, Rippling, BambooHR. See /for/hr.",
      },
      {
        q: "Does Practiq work for consulting firms?",
        a: "Yes. Boutique consulting features: engagement lifecycle tracking, MSA/SOW versioning, utilization rate dashboards, deliverable preparation (decks, reports), and renewal prep 90 days out. Integration with Monday, Asana, Notion. See /for/consulting.",
      },
      {
        q: "Does Practiq work for marketing/creative agencies?",
        a: "Yes. Agency-specific features: account manager client load balancing, retainer scope tracking, campaign context per client, brand guidelines surfacing, and scope creep detection. Integration with HubSpot, Monday, ClickUp. See /for/agency.",
      },
      {
        q: "Does Practiq work for financial advisors / wealth management?",
        a: "Phase 2 roadmap. The AI-Native Agent paradigm fits wealth management well (many clients, high context per client, compliance-sensitive), but we're launching the 5 primary verticals first to validate the product-market fit before expanding.",
      },
      {
        q: "Does Practiq work for medical practices or healthcare admin?",
        a: "Phase 2+ roadmap. Healthcare has HIPAA + PHI requirements that add implementation complexity. We'll pursue healthcare after SOC 2 Type II + dedicated BAA arrangements are in place.",
      },
    ],
  },
  {
    title: "Launch & access",
    id: "launch",
    faqs: [
      {
        q: "When does Practiq launch?",
        a: "Public beta Q3 2026. Early-access waitlist customers are invited in waves — priority based on signup date, vertical fit, and Founding Member commitment. Join the waitlist at /#cta to be placed in the invitation queue.",
      },
      {
        q: "How do I get early access?",
        a: "Sign up at practiq.dev — that's it. We'll email you when your firm's vertical + size matches an invitation wave. No payment required to join. The first 50 firms also lock in Founding Member pricing — $10 per client per month for life (33% off the $15/client/month standard rate, forever).",
      },
      {
        q: "Who is behind Practiq?",
        a: "Practiq is built by Cliwant, Inc. (Delaware). The founding team comes from technology + professional services backgrounds. Contact: seungdo@practiq.dev. Physical address: 1111b South Governors Ave STE 93589, Dover, DE 19904. Replies from the waitlist go directly to the founder.",
      },
      {
        q: "Is Practiq funded?",
        a: "Practiq is currently bootstrapped while in waitlist validation phase. After hitting validation thresholds, we'll pursue seed funding aligned with AI-Native category investors.",
      },
      {
        q: "Can I schedule a demo before the product launches?",
        a: "Yes — email seungdo@practiq.dev with your firm name and vertical. We do 1:1 demos of the product prototype for firms that commit to Founding Member status or are considering enterprise-tier adoption at launch.",
      },
      {
        q: "Do you offer a free tier?",
        a: "Not permanently — professional services firms are a narrow market and the economics don't support a permanent free tier. What we do offer: a 14-day free trial that covers up to 3 clients (no credit card required), and Founding Member pricing for the first 50 firms ($10 per client per month for life — 33% off forever). Solo operators with a few clients can start at roughly $30-50/month and grow with their book.",
      },
    ],
  },
  {
    title: "Comparison with alternatives",
    id: "alternatives",
    faqs: [
      {
        q: "How does Practiq compare to Clio?",
        a: "Clio is practice management (billing, document storage, matter tracking) for law firms. Practiq is AI-Native workspace that works alongside Clio — reading matter data, preparing draft summaries, surfacing context. Clio charges around $99/user/month; Practiq charges $15/client/month ($10 founding) with unlimited team seats. A 4-attorney firm with 50 matters pays Clio ~$400/mo + Practiq $500-750/mo for the AI layer. Many law firms use both. Detailed comparison: /compare/clio.",
      },
      {
        q: "How does Practiq compare to TaxDome?",
        a: "TaxDome is client portal + workflow + document signing for accounting firms. Practiq is AI-Native Agent that prepares deliverables + monitors clients overnight. TaxDome charges around $50/user/month; Practiq charges $15/client/month ($10 founding) with unlimited team seats. Some firms layer Practiq on TaxDome; others consolidate onto Practiq as features expand. Detailed comparison: /compare/taxdome.",
      },
      {
        q: "How does Practiq compare to Karbon?",
        a: "Karbon is task/email workflow for accounting firms. Practiq's AI-Native approach differs fundamentally — Karbon helps you do work, Practiq does work and asks for your approval. Karbon charges $59-89/user/month; Practiq charges $15/client/month ($10 founding) with unlimited team seats — so adding teammates never bumps your Practiq bill. Detailed comparison: /compare/karbon.",
      },
      {
        q: "How does Practiq compare to generic AI assistants (ChatGPT Plus, Claude Pro)?",
        a: "ChatGPT/Claude work on demand, with no context persistence and no integration to your practice tools. Practiq holds persistent client context, integrates with QuickBooks/Clio/Gusto, acts autonomously (overnight scans), and produces completed deliverables via an approval queue. Think ChatGPT = Swiss army knife, Practiq = purpose-built AI-Native workspace for boutique professional services.",
      },
      {
        q: "Can I use Practiq with my existing AI assistants?",
        a: "Yes — some firms use ChatGPT / Claude / Copilot for ad-hoc tasks and Practiq for persistent firm-wide workflows. Practiq's export formats work with other AI tools (e.g., export a client summary, paste into ChatGPT for follow-up questions). Over time more firms consolidate AI usage into Practiq for context reasons.",
      },
    ],
  },
];

const flatFaqs = SECTIONS.flatMap((s) => s.faqs);

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: flatFaqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            {flatFaqs.length} answers · Updated 2026-04-17
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Frequently asked questions about Practiq
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Detailed answers across product, pricing, integrations, security, and
            the Founding Member program. Looking for something else?{" "}
            <a
              href="mailto:seungdo@practiq.dev"
              className="text-zinc-200 underline"
            >
              Email SD directly
            </a>
            .
          </p>
        </div>
      </section>

      {/* Section nav (anchor jumps) */}
      <nav className="sticky top-20 z-30 border-y border-zinc-800 bg-[#050505]/80 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl overflow-x-auto">
          <ul className="flex items-center gap-5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Link href={`#${s.id}`} className="hover:text-zinc-100">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Sections */}
      <div className="mx-auto max-w-4xl px-6 py-16">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="mb-16 scroll-mt-32">
            <h2 className="mb-8 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
              {section.title}
            </h2>
            <dl className="space-y-8">
              {section.faqs.map((f) => (
                <div key={f.q} className="border-b border-zinc-800 pb-8">
                  <dt className="mb-3 text-base font-bold text-zinc-100">{f.q}</dt>
                  <dd className="text-sm leading-relaxed text-zinc-400">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {/* CTA */}
        <section className="mt-20 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0a] p-10 text-center">
          <h2 className="mb-4 text-2xl font-bold text-zinc-100">
            Still have questions?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-sm text-zinc-400">
            Email the founder directly — every waitlist signup gets a personal
            reply. Or join the waitlist to secure your Founding Member spot.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:seungdo@practiq.dev"
              className="rounded-lg border border-zinc-700 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
            >
              Email the founder
            </a>
            <Link
              href="/#cta"
              className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Join the waitlist
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
