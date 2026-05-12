import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Free tools for professional services firms — Practiq",
  description:
    "Free tools for accounting, legal, HR, and consulting firms: AI policy generator, workflow audit, ROI calculator, and AI readiness quiz. No account required.",
  alternates: { canonical: "https://practiq.dev/tools" },
};

interface Tool {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  duration: string;
}

const TOOLS: Tool[] = [
  {
    href: "/tools/ai-policy-generator",
    eyebrow: "New",
    title: "AI policy generator",
    description:
      "Draft a vertical-specific AI usage policy for your firm. ABA Opinion 512 for law firms, AICPA + Circular 230 for CPAs, EEOC + state law for HR advisory, FTC guidance for marketing. Downloadable PDF.",
    duration: "2 min · PDF",
  },
  {
    href: "/workflow-audit",
    eyebrow: "Most popular",
    title: "Workflow audit",
    description:
      "Self-serve 8-step audit of where your firm's AI workflow leaks review trail, source provenance, or supervision. Personalized report with the primary gap and a concrete next step.",
    duration: "5 min · PDF report",
  },
  {
    href: "/roi-calculator",
    eyebrow: "Calculator",
    title: "ROI calculator",
    description:
      "Estimate the time and revenue impact of an AI-Native workspace on your firm's specific client count, billable rate, and context-switching pattern.",
    duration: "1 min · Live calculator",
  },
  {
    href: "/readiness-quiz",
    eyebrow: "Assessment",
    title: "AI readiness quiz",
    description:
      "Score your firm on acute need, workflow maturity, and tooling fit across 10 questions. Personalized readiness band + vertical-specific benchmark comparison.",
    duration: "2 min · Email report",
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />

      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Free tools
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Free tools for professional services firms
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Built for accounting, law, HR advisory, marketing, and
            consulting firms. No account required. Each tool produces a
            concrete artifact you can use — a policy PDF, an audit
            report, a benchmark.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-7 transition-colors hover:border-zinc-600"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  {tool.eyebrow}
                </p>
                <p className="text-[11px] text-zinc-500">{tool.duration}</p>
              </div>
              <h2 className="mb-3 text-xl font-bold tracking-[-0.02em] text-zinc-100 group-hover:text-white">
                {tool.title}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                {tool.description}
              </p>
              <p className="mt-5 text-sm font-semibold text-zinc-300 group-hover:text-zinc-100">
                Open →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
