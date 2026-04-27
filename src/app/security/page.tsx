import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { InlineFaq } from "@/components/seo/inline-faq";

const SITE_URL = "https://practiq.dev";

// Practitioner-vocabulary security FAQ — small firms need answers their
// own clients (corporate counsel, compliance partners) will accept.
// Pulled from r/CPA, r/LawFirm, and r/ITSecurity threads about SaaS
// vetting at sub-50-person firms. Each answer is 40–60 words, direct,
// and avoids hedging.
const SECURITY_FAQS: { q: string; a: string }[] = [
  {
    q: "My biggest client's security questionnaire asks about SOC 2 — can I share Practiq's report?",
    a: "SOC 2 Type II is in progress; we share Type I results plus a current control map under NDA. Most enterprise procurement accepts the Type I + control map combination for vendors at our stage. Email security@practiq.dev with the questionnaire and we turn it around inside 48 hours.",
  },
  {
    q: "Is my client memory isolated, or are you running shared models that leak across firms?",
    a: "Each firm's external memory is row-isolated in Postgres with userId+firmId enforced at the query layer — never via shared embedding spaces. AI calls inject only the active client's context. We've never trained a shared model on customer data; the architecture won't allow it without explicit per-firm opt-in.",
  },
  {
    q: "What happens to client data if I cancel during context-switching season?",
    a: "Cancellation triggers a ZIP export within 24 hours covering every client thread, deliverable, and audit-log line. Raw data persists 30 days for re-import; after that, hard-delete with cryptographic shred. Backups expire on the same 30-day cadence. No silent retention, no clauses that survive termination.",
  },
  {
    q: "How do you handle a partner who needs read-only access for one specific client?",
    a: "RBAC scopes at the client level: owner, member, viewer. A viewer on Client 17 sees only that workspace — no roster, no global search, no other client memory. Tested as part of our weekly access-control regression suite. Ships on Practice and Firm tiers; Solo gets the single-owner default.",
  },
  {
    q: "Where does the data sit, and can I keep it inside a specific US region?",
    a: "Primary data is in AWS us-east-1 with encrypted backups in us-west-2. Single-region Firm tier customers can request us-east-1-only on contract. We don't replicate to non-US regions; AI calls hit Anthropic's US endpoints exclusively. Data residency commitments live in the master subscription agreement.",
  },
];

export const metadata: Metadata = {
  title: "Security & Compliance at Practiq",
  description:
    "How Practiq handles security, compliance, and client data — SOC 2 roadmap, AES-256 encryption, SSO and 2FA, role-based access, US-only infrastructure, audit logging, and responsible AI use for professional services firms.",
  alternates: { canonical: "https://practiq.dev/security" },
  openGraph: {
    title: "Security & Compliance at Practiq",
    description:
      "SOC 2 Type II in progress, AES-256 at rest, TLS 1.3 in transit, SSO + 2FA, RBAC, US-only infrastructure, full audit logging, and responsible AI — the security posture small firms need to show their partners.",
    url: "https://practiq.dev/security",
    type: "website",
  },
};

const ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Security & Compliance at Practiq",
  description:
    "Practiq's security posture — encryption, access controls, compliance roadmap, data residency, audit logging, vendor security, incident response, and responsible AI.",
  url: "https://practiq.dev/security",
  datePublished: "2026-01-15",
  dateModified: "2026-04-17",
  author: { "@type": "Organization", name: "Practiq", url: "https://practiq.dev" },
  publisher: {
    "@type": "Organization",
    name: "Practiq",
    url: "https://practiq.dev",
    logo: { "@type": "ImageObject", url: "https://practiq.dev/icon.png" },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://practiq.dev/security",
  },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://practiq.dev" },
    { "@type": "ListItem", position: 2, name: "Security", item: "https://practiq.dev/security" },
  ],
};

type Section = {
  id: string;
  title: string;
  lede: string;
  bullets: string[];
};

const SECTIONS: Section[] = [
  {
    id: "data-encryption",
    title: "Data encryption",
    lede: "Every byte of client data that flows through Practiq is encrypted end-to-end.",
    bullets: [
      "AES-256 encryption at rest for all data stored in primary databases, object storage, and backup systems. Per-tenant encryption keys isolate one firm's data from another at the storage layer.",
      "TLS 1.3 for data in transit across every network hop — browser to API, API to database, API to integration partners (QuickBooks, Clio, Gusto). No plaintext data ever crosses a public network.",
      "Encrypted backups run daily and retain for 30 days. Backups are encrypted with a separate key hierarchy from primary storage.",
      "Quarterly key rotation for data encryption keys and on-demand rotation if a security event warrants it. Firms on Firm tier can request dedicated encryption keys scoped to their tenant.",
    ],
  },
  {
    id: "access-controls",
    title: "Access controls",
    lede: "Authentication and authorization designed for small teams that need to scale.",
    bullets: [
      "Single sign-on via Google Workspace and Microsoft 365 Entra — the identity providers small firms already use. Password-based login available as fallback; SSO is required for all accounts on Firm tier.",
      "Two-factor authentication mandatory for every account type (TOTP apps like Authy and 1Password, plus WebAuthn hardware keys). No plain-password logins past the first session.",
      "Role-based permissions — Owner, Partner, Senior, Staff, and Read-only roles with distinct capabilities. Client-level access scoping lets a firm assign specific staff to specific client workspaces.",
      "Session management — idle timeout at 30 minutes, absolute session expiration at 12 hours, revocation on demand from the admin panel. Every session is bound to a device fingerprint.",
    ],
  },
  {
    id: "compliance-roadmap",
    title: "Compliance roadmap",
    lede: "Small firms handle client data that regulators take seriously. We are on the path to the compliance posture partners can show their clients.",
    bullets: [
      "SOC 2 Type II audit in progress, targeted completion Q3 2026. SOC 2 Type I report available on request for firms that need interim assurance during the waitlist period.",
      "GDPR-ready data handling — data subject request workflow for EU-based client-of-client contacts, lawful basis documentation, and data processing addendum available for signature.",
      "CCPA-compliant data handling for California-based client-of-client contacts — right to know, right to delete, and opt-out of sale (Practiq does not sell data, but the right is honored by policy).",
      "For law firm customers, our terms explicitly acknowledge attorney-client privilege obligations and provide a dedicated channel for Bar Counsel questions.",
    ],
  },
  {
    id: "data-residency",
    title: "Data residency",
    lede: "Practiq's infrastructure is US-based, with residency options for firms that need them.",
    bullets: [
      "US-only infrastructure today — all compute and storage lives in AWS us-east-1 (primary) and us-west-2 (disaster recovery). No cross-border data transfer for operational purposes.",
      "EU data residency available Q4 2026 for firms with EU-based clients-of-clients. Canadian data residency on the 2027 roadmap.",
      "Firms on Firm tier can request optional data residency guarantees contractually. Backup regions and replication topology are fully documented in the security questionnaire.",
      "No data is processed by foundation model providers outside the US — Anthropic and OpenAI endpoints used by Practiq are US-region by contract.",
    ],
  },
  {
    id: "audit-logging",
    title: "Audit logging",
    lede: "Every AI decision and every human action is logged — audit-ready from day one.",
    bullets: [
      "Every AI-prepared deliverable, every approval or rejection, every pattern rule applied, and every integration data pull is logged with actor, timestamp, client scope, and payload digest.",
      "90-day retention is standard on Solo and Practice tiers. Firm tier retains unlimited audit history. Retention can be extended contractually for firms that need 7-year audit trails for regulatory purposes.",
      "Exportable via API and a one-click CSV download from the admin panel — audit-ready format that slots into a working-paper file or a compliance review.",
      "Tamper-evident — logs are append-only and cryptographically chained. Any modification after the fact is detectable and surfaces in the audit export.",
    ],
  },
  {
    id: "vendor-security",
    title: "Vendor security",
    lede: "We're transparent about every subprocessor that touches firm data. Data processing agreements are in place with each.",
    bullets: [
      "Anthropic (Claude API) — AI inference for agent orchestration and deliverable preparation. No training on your firm's data per contract; input and output data is deleted within 30 days.",
      "Supabase (Postgres + storage) — primary application database and object storage, SOC 2 Type II certified at infrastructure level. Per-tenant row-level security at the database layer.",
      "AWS (us-east-1, us-west-2) — compute, backup storage, and network. SOC 2, ISO 27001, HIPAA-eligible services used where applicable.",
      "Resend (transactional email) — sends waitlist confirmations and app notifications only. Does not touch client-of-client communications unless a firm opts into the email-out feature.",
      "Full subprocessor list, DPAs, and SOC 2 reports from each vendor available on request to any firm in the waitlist or on a paid plan.",
    ],
  },
  {
    id: "incident-response",
    title: "Incident response",
    lede: "When something goes wrong, you hear from us quickly and you hear the whole story.",
    bullets: [
      "Under 4-hour acknowledgement window for any reported security incident or suspected compromise, 24/7, 365 days a year.",
      "24-hour customer notification commitment for any confirmed security incident that touches your firm's data. Notification includes scope, timeline, remediation steps taken, and next actions.",
      "Public post-incident report within 14 days for any confirmed breach, with root cause, systemic changes, and lessons learned. Posted to the changelog and emailed to every active firm.",
      "Pre-declared runbook for common incident classes — credential compromise, integration anomaly, vendor outage — so response is consistent rather than improvised.",
    ],
  },
  {
    id: "responsible-ai",
    title: "Responsible AI",
    lede: "Your firm's context powers your firm. It never trains a foundation model.",
    bullets: [
      "No training on your data — contracts with Anthropic, OpenAI, and any other foundation model provider explicitly prohibit the use of your firm's prompts, completions, or context data for model training.",
      "Per-client context memory is strictly isolated — one firm's memory never mixes with another firm's memory, and one client's context never mixes with another client's context within a firm.",
      "Opt-out available for any AI feature. A firm can disable nightly scans, deliverable preparation, pattern learning, or any specific integration-driven AI workflow from the admin panel — without losing the rest of the product.",
      "Human-in-the-loop for every high-stakes action. Tax strategy decisions, accounting principle calls, regulatory responses, and anything that commits a firm to a legal or financial position routes to explicit human approval regardless of AI confidence.",
    ],
  },
];

export default function SecurityPage() {
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
            Security &amp; Compliance · Updated 2026-04-17
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Security and compliance you can show your partners
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Small firms handle client data that regulators take seriously. Practiq is built to meet that bar from day one.
          </p>
        </div>
      </section>

      {/* Section nav */}
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
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="bento-card scroll-mt-32 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8 transition-colors hover:border-zinc-700"
              >
                <h2 className="mb-3 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100">
                  {section.title}
                </h2>
                <p className="mb-6 text-base leading-relaxed text-zinc-300">
                  {section.lede}
                </p>
                <ul className="space-y-3 text-sm leading-relaxed text-zinc-400">
                  {section.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact + CTA */}
      <section className="border-t border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0a] p-10 text-center">
            <h2 className="mb-4 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
              Security questions?
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-zinc-400">
              Email{" "}
              <a
                href="mailto:security@practiq.dev"
                className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
              >
                security@practiq.dev
              </a>
              . Responses within 4 hours during US business time. Security questionnaires, DPAs, SOC 2 reports from our subprocessors, and penetration test attestations available on request.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="mailto:security@practiq.dev"
                className="rounded-lg border border-zinc-700 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
              >
                Email security@practiq.dev
              </a>
              <Link
                href="/#cta"
                className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                Get early access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Practitioner-vocabulary security FAQ — surfaces the questions
          partners actually ask before signing off on a SaaS for client
          data. Emits FAQPage JSON-LD via InlineFaq for AEO citations. */}
      <InlineFaq
        pageUrl={`${SITE_URL}/security`}
        items={SECURITY_FAQS}
        kicker="Procurement-grade questions"
        heading="Security questions partners ask before client data crosses the wire."
      />

      <Footer />
    </div>
  );
}
