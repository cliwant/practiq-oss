import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  JsonLd,
  organizationJsonLd,
  personFounderJsonLd,
  breadcrumbJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "About Practiq — Built for small professional services firms",
  description:
    "Practiq is an AI-Native workspace for boutique professional services firms — accounting, law, HR advisory, consulting, and agency teams managing 30-200 client relationships with 2-10 people.",
  alternates: { canonical: "https://practiq.dev/about" },
  openGraph: {
    title: "About Practiq — Built for small professional services firms",
    description:
      "We're building the operating system for small professional services firms. Because the future of practice doesn't look like the spreadsheet your firm opens every morning.",
    url: "https://practiq.dev/about",
    type: "website",
  },
};

// AboutPage references the canonical Organization @id so the entity
// graph stays connected. The Organization helper itself is the same
// object used on the homepage and other routes.
const ABOUT_PAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE_URL}/about`,
  name: "About Practiq",
  description:
    "We're building the operating system for small professional services firms. Practiq is AI-Native workspace for 2-10 person accounting, law, HR advisory, consulting, and agency firms managing 30-200 clients.",
  mainEntity: { "@id": `${SITE_URL}/#organization` },
};

const ABOUT_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "About", url: `${SITE_URL}/about` },
]);

type Vertical = {
  name: string;
  fit: string;
};

const VERTICALS: Vertical[] = [
  {
    name: "Accounting",
    fit: "2-10 person firms, 50-200 clients, QuickBooks or Xero core.",
  },
  {
    name: "Law",
    fit: "Solo to small firm, 40-60 active matters, Clio or MyCase ecosystem.",
  },
  {
    name: "HR Advisory",
    fit: "2-10 consultants, 15-20 client companies, multi-state compliance load.",
  },
  {
    name: "Consulting",
    fit: "Boutique shops, 8-15 concurrent engagements, retained delivery model.",
  },
  {
    name: "Agency",
    fit: "8-12 active accounts, retainer plus project mix, creative or growth services.",
  },
];

type Principle = {
  title: string;
  body: string;
};

const PRINCIPLES: Principle[] = [
  {
    title: "AI-native, not AI-bolted",
    body: "We rebuilt the workspace AI-first — client context memory, overnight scans, deliverable preparation, approval queue. Not ChatGPT integration bolted onto a tool that was designed a decade before LLMs existed.",
  },
  {
    title: "Built for the firm shape small firms actually have",
    body: "Two to ten people, 50 to 200 clients, a spreadsheet plus email plus QuickBooks stack. Not the enterprise mid-market where Ironclad and AuditBoard live, and not the solo freelancer where Notion is enough.",
  },
  {
    title: "Slow to sell, fast to ship",
    body: "Early access only until the product is undeniable. No VC-driven land-grab, no discount treadmill, no feature pile-on to chase one enterprise logo. The Founding Member program is the only acquisition channel until the product clears its own bar.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={personFounderJsonLd()} />
      <JsonLd data={ABOUT_PAGE_SCHEMA} />
      <JsonLd data={ABOUT_BREADCRUMB} />

      {/* Hero */}
      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            About Practiq
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            We&apos;re building the operating system for small professional services firms
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Because the future of practice doesn&apos;t look like the spreadsheet your firm opens every morning.
          </p>
        </div>
      </section>

      {/* Section 1 — The problem we're solving */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            The problem we&apos;re solving
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-zinc-300">
            <p>
              Every small professional services firm we&apos;ve talked to hits the same wall around the fiftieth client: the context-switching cost of running the business starts eating the business. Monday morning becomes three-plus hours of tab-switching, email searching, re-reading old notes, and trying to remember what the last meeting actually covered. The work hasn&apos;t started yet. The day is already half gone.
            </p>
            <p>
              At 75 clients the ceiling becomes structural. A partner billing at $250 an hour who loses three hours a day to context reconstruction is walking past roughly $170,000 in partner labor every year — not because the partner is slow, but because human short-term memory is a single-threaded system trying to service a concurrent workload.
            </p>
            <p>
              AI is accelerating consolidation pressure on the industry at the same time. Mid-market firms armed with internal AI teams are chipping away at the boutique segment&apos;s pricing floor, and the large platforms keep adding &quot;AI features&quot; that do not fit the 2-10 person firm shape. Small firms get squeezed from both directions while the tooling aimed at them stays fundamentally unchanged since 2014.
            </p>
            <p>
              Boutique firms do not need a bolted-on AI feature or a rip-and-replace practice management platform sized for a 500-person accounting firm. They need a purpose-built workspace that holds the context of every client externally, prepares the routine work overnight, and routes the genuinely important judgment calls to the partner each morning. That is what we are building.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — Who this is for */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Who this is for
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VERTICALS.map((v) => (
              <div
                key={v.name}
                className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-700"
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  {v.name}
                </p>
                <p className="text-sm leading-relaxed text-zinc-300">{v.fit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Our philosophy */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Our philosophy
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <article
                key={p.title}
                className="bento-card rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8 transition-colors hover:border-zinc-700"
              >
                <p className="mb-4 font-mono text-xs text-zinc-600">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mb-3 text-lg font-bold text-zinc-100">{p.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Where we are */}
      <section className="border-t border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Where we are
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-zinc-300">
            <p>
              Practiq is in early access. The product is under active development, and invitations are going out to firms on the waitlist in waves matched to vertical fit and firm size. The Founding Member program — the first 50 firms to commit — locks in $10 per client per month for life: 33% off the $15/client/month standard rate, permanent for as long as the subscription stays active.
            </p>
            <p>
              Today&apos;s product scope covers per-client context memory, nightly scanning and deliverable preparation for connected integrations (QuickBooks Online, Clio, Gusto launched; Xero, Rippling, and MyCase shipping next), the approval queue workflow, pattern learning, per-vertical landing pages, and the underlying audit trail infrastructure. The 2026 roadmap focuses on bidirectional sync, TaxDome and Karbon coverage, and the multi-partner permissions model.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5 — How we got here */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            How we got here
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-zinc-300">
            <p>
              Practiq is built by Grindworks, a product studio founded by SD Keum. The team watched context-switching wreck small-firm economics at close range across multiple verticals and became convinced the right answer is not another incremental feature — it is a ground-up rebuild of the boutique workspace on AI-native foundations.
            </p>
            <p>
              All infrastructure runs on US-based services. We read every waitlist signup and respond personally within four hours during US business time. The legal entity is Cliwant, Inc., headquartered in Dover, Delaware.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Run a firm that fits this shape?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-zinc-400">
            We read every waitlist signup. Founder replies personally.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/#cta"
              className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Get early access
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
            >
              See the product
            </Link>
          </div>
          <p className="mt-10 text-xs text-zinc-500">
            <strong className="text-zinc-400">Studio</strong>: Grindworks ·{" "}
            <strong className="text-zinc-400">Product</strong>: Practiq ·{" "}
            <strong className="text-zinc-400">Legal entity</strong>: Cliwant, Inc. ·{" "}
            <strong className="text-zinc-400">Founded</strong>: 2026 ·{" "}
            <strong className="text-zinc-400">Infrastructure</strong>: US-based
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
