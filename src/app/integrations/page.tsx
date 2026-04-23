import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { INTEGRATIONS, type Integration } from "@/data/integrations/integrations";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Integrations — Practiq connects to your existing firm stack",
  description:
    "Practiq integrates with QuickBooks Online, Clio, Gusto, Rippling, HubSpot, and more. See live integrations and our 2026 roadmap for small professional services firms.",
  alternates: { canonical: `${SITE_URL}/integrations` },
};

const STATUS_ORDER: Record<Integration["status"], number> = {
  live: 0,
  beta: 1,
  roadmap: 2,
  "partner-requested": 3,
};

const STATUS_STYLE: Record<Integration["status"], string> = {
  live: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  beta: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  roadmap: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "partner-requested": "text-zinc-400 bg-zinc-800 border-zinc-700",
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Practiq Integrations",
  description:
    "Integrations that connect Practiq to the existing tools small professional services firms run — QuickBooks, Clio, Gusto, HubSpot, and more.",
  url: `${SITE_URL}/integrations`,
};

export default function IntegrationsIndexPage() {
  const sorted = [...INTEGRATIONS].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  );

  const byCategory = sorted.reduce((acc, i) => {
    if (!acc[i.categoryLabel]) acc[i.categoryLabel] = [];
    acc[i.categoryLabel].push(i);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Integrations · {INTEGRATIONS.length} platforms
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Practiq connects to the tools{" "}
            <span className="text-zinc-500">your firm already runs.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            We don&apos;t replace QuickBooks, Clio, Gusto, or HubSpot. We read
            from them and build the AI-native context layer your firm needs
            once you&apos;re past the client-count ceiling.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          {Object.entries(byCategory).map(([cat, list]) => (
            <section key={cat} className="mb-16">
              <div className="mb-6 border-b border-zinc-800 pb-4">
                <h2 className="text-2xl font-bold text-zinc-100">{cat}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map((i) => (
                  <Link
                    key={i.slug}
                    href={`/integrations/${i.slug}`}
                    className="group rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-600"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white">
                        {i.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[i.status]}`}
                      >
                        {i.status === "partner-requested" ? "requested" : i.status}
                      </span>
                    </div>
                    <p className="mb-3 text-sm font-medium text-zinc-300">
                      {i.tagline}
                    </p>
                    <p className="text-xs text-zinc-500 line-clamp-3">
                      {i.whatItDoes}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {/* Partnership CTA */}
          <section className="mt-16 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-10">
            <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              Integration you need missing from this list?
            </h2>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
              We prioritize integrations based on Founding Member requests.
              Join early access, tell us which integrations unlock Practiq for
              your firm, and we&apos;ll move your stack to the front of the
              queue.
            </p>
            <Link
              href="/?utm_source=integrations&utm_medium=cta&utm_campaign=integration-request#cta"
              className="inline-flex items-center gap-3 rounded-2xl bg-zinc-100 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-lg transition-opacity hover:opacity-90"
            >
              Request an integration →
            </Link>
          </section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
