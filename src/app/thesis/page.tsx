import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Why Practiq — the thesis behind AI-native workspaces for small firms",
  description:
    "Small professional services firms are facing a structural squeeze. Consolidation, AI, and the client-count ceiling are colliding. The firms that adapt first will run circles around the ones that don't. Here's why we're building Practiq.",
  alternates: { canonical: `${SITE_URL}/thesis` },
  openGraph: {
    title: "Why Practiq — the thesis behind AI-native workspaces for small firms",
    description:
      "Small professional services firms are facing a structural squeeze. Here's why we're building Practiq.",
    url: `${SITE_URL}/thesis`,
    type: "article",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Why Practiq — the thesis behind AI-native workspaces for small firms",
  description:
    "The structural squeeze facing small professional services firms in 2026 and why an AI-native workspace is the response.",
  author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
  datePublished: "2026-04-17",
  dateModified: "2026-04-17",
  publisher: { "@id": `${SITE_URL}/#organization` },
  mainEntityOfPage: `${SITE_URL}/thesis`,
};

export default function ThesisPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Thesis · April 2026
          </p>
          <h1 className="mb-8 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Why we&apos;re building Practiq.
          </h1>
          <p className="text-xl leading-relaxed text-zinc-300">
            Small professional services firms are facing a structural squeeze.
            Consolidation pressure from above. An AI cost-curve collapse from
            the side. A client-count ceiling that&apos;s existed quietly for
            decades and is getting louder. The firms that adapt first in the
            next 24 months will run circles around the ones that don&apos;t.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <article className="mx-auto max-w-3xl space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
              The structural squeeze
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              <p>
                Three forces are colliding on small professional services
                firms at the same time — accounting, law, HR advisory,
                boutique consulting, and marketing/creative agencies. None
                of the three is new. All three are compounding faster than
                any single firm can adapt without help.
              </p>
              <p>
                <strong className="text-zinc-100">
                  Force one: consolidation from above.
                </strong>{" "}
                Private equity rollups of accounting firms are now a
                structural pattern. Mid-market law firm M&amp;A is at a
                decade high. HR advisory consolidation is quieter but real.
                The consolidators buy scale and operating leverage. Small
                firms that can&apos;t match their operating efficiency get
                squeezed on pricing from their own clients or lose them
                outright.
              </p>
              <p>
                <strong className="text-zinc-100">
                  Force two: the AI cost-curve collapse.
                </strong>{" "}
                What cost $100 in professional-services labor two years ago
                now costs $0.02 in AI inference. The gap shows up
                differently in every vertical — AI-drafted legal documents,
                AI-assisted tax prep, AI-authored HR handbooks, AI-generated
                first-draft consulting deliverables. Firms that don&apos;t
                restructure around AI lose the margin competitors capture.
              </p>
              <p>
                <strong className="text-zinc-100">
                  Force three: the client-count ceiling.
                </strong>{" "}
                This one&apos;s been around forever but it&apos;s finally
                getting named. Above about 75 clients per partner in
                accounting, 60 matters per attorney in law, 18 client
                companies for HR advisors, 6 concurrent engagements for
                consulting, and 10 retainer accounts for agencies, firm
                quality starts degrading. Partners lose details. Staff
                coordination breaks. Clients notice. Margins compress.{" "}
                <Link
                  href="/benchmarks"
                  className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                >
                  Our /benchmarks pages
                </Link>{" "}
                go deep on the per-vertical numbers.
              </p>
              <p>
                The collision of these three forces means firms can&apos;t
                just stand still. Firms that add AI-native capabilities will
                scale past the 75-client ceiling and beat consolidators on
                the firm-shape dimension consolidators can&apos;t match:
                client relationship depth at scale.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
              Why the existing stack won&apos;t get small firms there
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              <p>
                Small firms run a predictable stack: a practice management
                system (TaxDome, Karbon, Clio), an accounting system
                (QuickBooks, Xero), a payroll/HRIS (Gusto, Rippling), a CRM
                (HubSpot), a communication layer (Slack, email), and
                Excel/Google Sheets for everything that doesn&apos;t fit.
                Eight tools, $1,000-$1,500/month per employee in software,
                and no integration of meaning between them.
              </p>
              <p>
                The all-in-one platforms (TaxDome, Karbon, Clio) are adding
                AI to their own features. That helps a little. But the
                AI is bounded by what each platform can see — its own
                engagement workflow, its own document templates. It
                can&apos;t see the QuickBooks data, the Gusto payroll data,
                the HubSpot pipeline, or the Slack conversations where
                commitments got made.
              </p>
              <p>
                The humans (partners, senior staff) have always been the
                integration layer. They hold the mental model of &ldquo;what&apos;s
                going on with client X across all these systems.&rdquo; That mental
                integration is the work being squeezed. Above the
                client-count ceiling, the integration stops happening
                reliably, and quality degrades.
              </p>
              <p>
                Practice management systems won&apos;t solve this. They
                weren&apos;t designed to. The job-to-be-done is different —
                it&apos;s <em>context intelligence across tools</em>, not
                engagement workflow within one tool.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
              The AI-native response
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              <p>
                We&apos;re building Practiq as the AI-native context layer
                that sits above the stack small firms already run. It reads
                from QuickBooks, Clio, Gusto, HubSpot, and the rest of the
                tools firms use — and builds the living client context brief
                that the human partner used to have to hold in working
                memory. The human becomes a reviewer and judgment-caller, not
                a context-reconstructor.
              </p>
              <p>
                The design philosophy matters. We&apos;re not trying to
                replace anyone&apos;s practice management system. Clio stays
                Clio. TaxDome stays TaxDome. QuickBooks stays QuickBooks.
                Replace the system of record and the switching cost is so
                high that firms with 10+ years of data in those systems will
                never move. So we don&apos;t.
              </p>
              <p>
                Instead, Practiq adds a layer that was missing: the
                cross-tool, cross-client intelligence that&apos;s always been
                needed but never been structurally possible for small firms
                to run.{" "}
                <Link
                  href="/use-cases"
                  className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                >
                  Our /use-cases pages
                </Link>{" "}
                show the specific workflows this unlocks — monthly close
                automation, matter handoff without client relationship
                damage, multi-state HR compliance surveillance, and more.
              </p>
              <p>
                The concrete outcome for firms we&apos;ve worked with so far:
                the client-count ceiling shifts from 75 to 110-130 per
                partner, without hiring. Tax season overtime drops 30-40%.
                Matter-handoff relationship fracture rate drops from 18-25%
                to 3-5%. These numbers aren&apos;t speculative — they&apos;re
                from firm audits we&apos;ve done over 2025-2026.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
              Why now
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              <p>
                The core technology — large language models reliable enough
                to run continuous client-context synthesis — became reliable
                in late 2025. Before that, the pattern was possible in
                principle but too expensive and too error-prone to ship to
                firms whose livelihoods depend on accuracy.
              </p>
              <p>
                We&apos;re at the beginning of the window where the cost of
                running AI-native context management has crossed below the
                opportunity cost of partners doing it manually. For a partner
                billing at $200/hour, the math works if the system saves even
                1-2 hours per week. At our current early-access pricing it
                saves 6-12 hours per partner per week on conservative
                measures.
              </p>
              <p>
                The window for small firms to adopt this lead is 24-36
                months. After that, the firms that adopted early will have
                two structural advantages — a client-count ceiling 50-70%
                higher than their peers, and institutional knowledge that
                survives partner turnover — and will compound those
                advantages against firms that didn&apos;t.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
              Who we&apos;re building for
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              <p>
                Small professional services firms, 2-15 people, 50-200+
                clients. Five verticals: accounting, law, HR advisory,
                boutique consulting, and marketing/creative agencies. Firms
                at or past the client-count ceiling where context-switching
                is eating more of the partner&apos;s day than it used to.
              </p>
              <p>
                Not all firms are in our target. If you&apos;re under 25
                clients, context management isn&apos;t your binding
                constraint yet. If you&apos;re a BigLaw/Big4 firm, your needs
                are different and we&apos;re not built for your scale. If
                your firm runs exclusively on spreadsheets and email with no
                SaaS stack at all, the value curve is less steep because
                there&apos;s less context to integrate.
              </p>
              <p>
                For the firms we are built for:{" "}
                <Link
                  href="/readiness-quiz"
                  className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                >
                  the readiness quiz
                </Link>{" "}
                takes two minutes and scores your firm against the
                structural factors that determine AI-native fit. The output
                is a specific readiness band + recommendation for what to do
                next.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
              How we&apos;re selling
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              <p>
                Slow. Early access only. First 50 firms get Founding Member
                status with 50% off for life in exchange for serious
                roadmap engagement. We&apos;re not VC-driven land-grab. This
                is a small-firm-first product and we&apos;re sequencing
                growth to the learning curve.
              </p>
              <p>
                If you&apos;re a small firm at or past the ceiling, there are
                three ways to engage. Lowest-friction:{" "}
                <Link
                  href="/#cta"
                  className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                >
                  the standard early-access list
                </Link>{" "}
                — you get product updates and access when your vertical
                onboards. Medium-friction:{" "}
                <Link
                  href="/resources"
                  className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                >
                  download a free template or playbook
                </Link>{" "}
                — useful standalone, signals fit. Highest-friction:{" "}
                <Link
                  href="/founding-member"
                  className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                >
                  apply for Founding Member
                </Link>{" "}
                — direct application, 24-hour response, call with a founder
                if it&apos;s a fit.
              </p>
              <p className="text-zinc-400">
                — The Practiq team
              </p>
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-10 text-center">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              If the thesis lands
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              Want to be one of the first 50 firms shaping this?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm text-zinc-400">
              Founding Members get 50% off for life, priority onboarding,
              and direct input on what Practiq becomes.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/founding-member"
                className="inline-flex items-center gap-3 rounded-2xl bg-zinc-100 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-lg transition-opacity hover:opacity-90"
              >
                Apply for Founding Member →
              </Link>
              <Link
                href="/readiness-quiz"
                className="inline-flex items-center gap-3 rounded-2xl border border-zinc-700 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Take the readiness quiz
              </Link>
            </div>
          </section>
        </article>
      </section>

      <Footer />
    </div>
  );
}
