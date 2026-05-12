import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/json-ld";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { WorkflowAuditPage } from "@/components/workflow-audit/workflow-audit-page";

const TITLE = "AI Workflow Audit — Practiq";
const DESCRIPTION =
  "A 5-minute self-serve audit. Answer 8 questions about a recent engagement; receive a personalized diagnosis of where your AI workflow is dropping source, review state, client context, or handoff.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/workflow-audit` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/workflow-audit`,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Practiq",
    // Reuse the site-wide OG image so SNS shares don't fall back to a
    // mystery preview. Next.js doesn't cascade root-layout openGraph
    // images into per-route openGraph overrides.
    images: [
      {
        url: `${SITE_URL}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/images/og-image.png`],
  },
  robots: { index: true, follow: true },
};

/**
 * Page shell is a Server Component so the hero copy and surrounding
 * structural markup render into the initial HTML (visible to curl,
 * Google's SSR fetch, and AI crawlers). The interactive form +
 * generated report live inside a Client Component island below.
 *
 * 2026-05-13 refactor: previous implementation was a single Client
 * Component, which produced a 24 KB shell with
 * BAILOUT_TO_CLIENT_SIDE_RENDERING and no body content in static HTML.
 */
export default function Page() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main id="main" className="pt-32 pb-16 px-6">
        {/* Hero — server-rendered so the H1 + value prop are visible
            in static HTML even before the client form hydrates. */}
        <section className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-5">
            AI workflow audit · 5 minutes
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-[-0.03em] leading-[1.05] mb-5 text-balance">
            Where is your AI workflow dropping evidence?
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Eight short questions about a recent engagement. You get back a
            personalized diagnosis mapped to the four objects every reviewer
            needs preserved: source, review state, client context, handoff.
          </p>
        </section>

        {/* Interactive form — Client island */}
        <WorkflowAuditPage />

        <p className="mt-6 text-center text-xs text-zinc-500 max-w-2xl mx-auto">
          Pre-launch. We read every audit by hand and reply personally.
        </p>
      </main>
      <Footer />
    </div>
  );
}
