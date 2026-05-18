/**
 * Practiq landing page — Server Component.
 *
 * Renders the entire homepage layout (hero, why-client-centric,
 * bento features, impact, dashboard preview, CTA, FAQ, footer) into
 * the initial HTML. AI crawlers (GPTBot, PerplexityBot, ClaudeBot)
 * and Google's SSR-fetch path therefore see the actual page body in
 * curl, not a 24 KB BAILOUT_TO_CLIENT_SIDE_RENDERING shell.
 *
 * Interactive pieces are isolated into small Client islands in
 * `@/components/landing/home-islands`:
 *   - <HomeNavWithModal>      — nav + legacy waitlist modal
 *   - <HomeAbExposureBeacon>  — exposes hero_copy_v1 / cta_copy_v1
 *   - <HomeStartFreeButton>   — primary "Start free" with cta_clicked
 *   - <HomeIndustryCards>     — 5 industry cards + workspace overlay
 *   - <HomeTourAllButton>     — secondary "Tour all industries"
 *
 * Variant assignment is read **on the server** from the same cookies
 * the middleware sets, so the SSR'd hero copy already reflects the
 * visitor's A/B bucket. No client-side flicker.
 */

import { cookies } from "next/headers";
import Image from "next/image";
import { ArrowRight, Users, LineChart, Cpu, Fingerprint, Layers, X, Network, BrainCircuit, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/landing/footer";
import { FoundingMemberBadge } from "@/components/landing/founding-member-badge";
import {
  HomeAbExposureBeacon,
  HomeIndustryCards,
  HomeNavWithModal,
  HomeStartFreeButton,
  HomeTourAllButton,
} from "@/components/landing/home-islands";
import {
  HERO_COPY,
  CTA_COPY,
  type HeroVariant,
  type CtaVariant,
} from "@/lib/hero-variants";
import {
  JsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  faqJsonLd,
  practiqProductJsonLd,
  personFounderJsonLd,
  PRACTIQ_CANONICAL_DEFINITION,
} from "@/lib/seo/json-ld";

const FAQ_ITEMS = [
  {
    q: "How is Practiq different from ChatGPT, Claude, or Copilot?",
    a: "Those are chat-session AI agents — memory scoped to a conversation. The moment you switch topics, you have to re-paste context or the AI forgets. Practiq is a client-centric AI workspace: every conversation, file, agent action, and preference is tied to a specific client record. Switching clients takes one click and the AI is already loaded with that client's complete history. Same LLMs underneath — fundamentally different architecture around them.",
  },
  {
    q: "What is Practiq?",
    a: "Practiq is an AI workspace for boutique professional services firms — accounting, law, HR, marketing, consulting, advisory — that manage 50 to 200 client relationships. Instead of a general-purpose chat, every client gets their own workspace with shared team memory, autonomous AI agents that run overnight, and ready-to-send deliverables. Your firm can handle more clients without growing the team.",
  },
  {
    q: "Who is Practiq built for?",
    a: "Boutique professional services firms with 2 to 20 team members managing 50 to 200 client relationships. If your team juggles clients across tools like QuickBooks, Clio, HubSpot, BambooHR, or Figma, Practiq consolidates every client's history, files, and preferences into one AI-native workspace — regardless of vertical.",
  },
  {
    q: "How does Practiq reduce context switching to zero?",
    a: "Because memory is scoped to the client, not the chat. Each client has a persistent workspace with their financial data, communication preferences, past deliverables, team notes, and every agent run ever executed on their behalf. When you open a client, the AI is already briefed. What typically takes 10–15 minutes of file searching and re-pasting becomes a one-click, one-second switch.",
  },
  {
    q: "Which firm verticals does Practiq work for?",
    a: "Any boutique professional services firm whose work is organized around client relationships. We've designed for accounting/tax/bookkeeping, law, HR advisory, marketing/creative agencies, and consulting — and we onboard firms in other verticals (financial advisory, executive coaching, real estate, architecture) on request. If your team thinks in terms of 'my clients,' Practiq fits.",
  },
];

function readHeroVariant(value: string | undefined): HeroVariant {
  const allowed: HeroVariant[] = [
    "control",
    "time_saved",
    "capacity",
    "pain_first",
    "practitioner_pain",
    "monthly_no_lockin",
    // Wave 20 staged variants — receive 0 traffic until middleware.ts
    // AB_TESTS for hero_copy_v1 is updated to include them. Listed here
    // so the runtime validator accepts the cookie value once the
    // operator flips rotation on.
    "context_loss_universal",
    "associate_not_partner",
  ];
  return (allowed as string[]).includes(value ?? "")
    ? (value as HeroVariant)
    : "control";
}

function readCtaVariant(value: string | undefined): CtaVariant {
  const allowed: CtaVariant[] = [
    "control",
    "founding_member",
    "get_early",
    "claim_spot",
  ];
  return (allowed as string[]).includes(value ?? "")
    ? (value as CtaVariant)
    : "control";
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const heroVariant = readHeroVariant(
    cookieStore.get("ab_hero_copy_v1")?.value,
  );
  const ctaVariant = readCtaVariant(cookieStore.get("ab_cta_copy_v1")?.value);
  const hero = HERO_COPY[heroVariant];
  const cta = CTA_COPY[ctaVariant];

  const jsonLdOrg = organizationJsonLd();
  const jsonLdApp = softwareApplicationJsonLd({ tier: "founding" });
  const jsonLdFaq = faqJsonLd(FAQ_ITEMS);
  // 2026-05-18 AEO audit: emit Product entity + Person founder on root so
  // AI engines (Perplexity, ChatGPT, AI Overview) see the full Practiq
  // entity graph at the canonical URL. Without Product, queries like
  // "what is Practiq" resolve to the Organization entity (Cliwant, Inc.)
  // rather than the software product itself. Person founder enables
  // "who founded Practiq" answers.
  const jsonLdProduct = practiqProductJsonLd();
  const jsonLdFounder = personFounderJsonLd();

  return (
    <div className="min-h-screen relative">
      <JsonLd data={jsonLdOrg} />
      <JsonLd data={jsonLdApp} />
      <JsonLd data={jsonLdProduct} />
      <JsonLd data={jsonLdFounder} />
      <JsonLd data={jsonLdFaq} />
      <div className="grainy-overlay" />
      <HomeNavWithModal />
      <HomeAbExposureBeacon
        heroVariant={heroVariant}
        ctaVariant={ctaVariant}
      />
      <main id="main">
        {/* ── Hero ── */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-28 pb-10 px-6 overflow-hidden bg-mesh">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="flex justify-center mb-5">
              <FoundingMemberBadge />
            </div>

            <div className="text-zinc-400 text-sm mb-6">{hero.eyebrow}</div>
            <h1 className="text-5xl md:text-[4.5rem] font-black mb-6 leading-[0.95] tracking-[-0.05em] text-zinc-100">
              {hero.headline}
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 mx-auto mb-10 leading-relaxed max-w-3xl">
              {hero.subhead}
            </p>

            <HomeIndustryCards />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <HomeStartFreeButton ctaVariant={ctaVariant} />
              {/*
                2026-05-16: Promoted /demo from tertiary underline-link to
                secondary btn-outline CTA. Traffic analysis (7d): /demo
                received only 12 unique visitors vs /workflow-audit's 85 —
                a 7× gap despite identical UI weight. /demo is positioned
                in marketing copy as the strongest single asset
                (read-only live workspace, 50 sample clients, zero
                signup), so the hierarchy now matches the messaging.
              */}
              <a
                href="/demo/workspace?landing_slug=homepage&lane=practiq"
                className="btn-outline py-4 px-8 text-base inline-flex items-center justify-center gap-2"
              >
                See a live workspace
                <span className="text-zinc-500 text-xs ml-1">50 sample clients · no signup</span>
              </a>
              <HomeTourAllButton label={hero.secondaryCta} />
              <a
                href="/workflow-audit?landing_slug=homepage&lane=practiq"
                className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-100 hover:decoration-zinc-400"
              >
                Run a workflow audit →
              </a>
            </div>

            {cta.sub && (
              <p className="text-xs text-amber-400/80 mt-3 font-medium">
                {cta.sub}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-zinc-400">
              <a href="/login" className="hover:text-zinc-200 transition-colors">
                Already have an account?{" "}
                <span className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400">
                  Sign in
                </span>
              </a>
              <span className="text-zinc-700">·</span>
              <a
                href="/contact?topic=intro-call"
                className="underline underline-offset-4 decoration-zinc-700 hover:text-zinc-200 hover:decoration-zinc-400 transition-colors"
              >
                {hero.bookCallText} →
              </a>
            </div>
          </div>
        </section>

        {/* ── Dashboard Preview ── */}
        <section id="preview" className="py-14 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-zinc-100">
                See it in action
              </h2>
              <p className="text-base text-zinc-300 max-w-lg mx-auto">
                One dashboard for every client your firm manages.
              </p>
            </div>

            <div className="rounded-2xl bg-[#1a1a1a] border border-zinc-800 overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                </div>
                <div className="flex-1 ml-4">
                  <div className="bg-zinc-900 rounded-lg px-4 py-1.5 text-xs text-zinc-400 max-w-xs">
                    practiq.dev/app
                  </div>
                </div>
              </div>
              <Image
                src="/images/dashboard-preview.png"
                alt="Practiq dashboard showing the AI command center for Meridian Accounting Group with client list, priorities, and AI assistant"
                width={1440}
                height={900}
                className="w-full h-auto"
                priority={false}
              />
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <HomeTourAllButton label="Try the live demo" />
            </div>
          </div>
        </section>

        {/*
          ── What is Practiq? — AEO canonical definition section ──
          Added 2026-05-18. Standalone "Practiq is X for Y" block in raw
          server-rendered HTML. AI engines (Perplexity, ChatGPT, AI Overview)
          weight first-explicit-definition extraction much higher than
          mid-body synthesis. Visible H2 + paragraph + JSON-LD-friendly
          prose. Single source of truth: PRACTIQ_CANONICAL_DEFINITION.
        */}
        <section
          id="what-is-practiq"
          className="py-12 px-6"
          data-aeo="canonical-definition-section"
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-100 tracking-tight">
              What is Practiq?
            </h2>
            <p
              className="text-base text-zinc-300 leading-relaxed mb-4"
              data-aeo="canonical-definition"
            >
              {PRACTIQ_CANONICAL_DEFINITION}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Practiq is built for accounting / tax / bookkeeping, law, HR
              advisory, consulting, and agency firms with 2 to 10 team
              members and 30 to 200 active clients. Pricing is per-client
              ($10/client/month founding, $15/client/month standard) with
              unlimited team seats — the opposite of per-seat practice
              management software. It complements QuickBooks, Drake,
              Lacerte, Clio, MyCase, BambooHR, Gusto, and HubSpot rather
              than replacing them.
            </p>
          </div>
        </section>

        {/* ── Why Client-Centric ── */}
        <WhyClientCentric />

        {/* ── Bento Features ── */}
        <section id="features" className="py-14 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 bento-card p-8 md:p-10 flex flex-col justify-center">
                <BrainCircuit className="w-7 h-7 text-zinc-400 mb-5" />
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-zinc-100">
                  One workspace per client — and the AI lives inside it
                </h3>
                <p className="text-base text-zinc-300 leading-relaxed max-w-lg">
                  Every conversation, file, agent action, preference, and past
                  deliverable is scoped to the client. Open a client and the AI
                  is already up to speed — no briefing, no pasted history, no
                  forgotten threads.
                </p>
              </div>

              <div className="md:col-span-4 bento-card p-8 flex flex-col justify-center">
                <Users className="w-7 h-7 mb-5 text-zinc-400" />
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-zinc-100">
                  Shared team memory
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  When the partner steps out, juniors still have full&nbsp;context.
                </p>
              </div>

              <div className="md:col-span-4 bento-card p-8 flex flex-col justify-center">
                <Network className="w-7 h-7 mb-5 text-zinc-400" />
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-zinc-100">
                  Works with your tools
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  QuickBooks, Clio, HubSpot, Figma, BambooHR — always&nbsp;in&nbsp;sync.
                </p>
              </div>

              <div className="md:col-span-8 bento-card p-8 md:p-10 flex flex-col justify-center">
                <Layers className="w-7 h-7 text-zinc-400 mb-5" />
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-zinc-100">
                  Ready-to-send deliverables
                </h3>
                <p className="text-base text-zinc-300 leading-relaxed max-w-lg">
                  Financial statements, board memos, campaign briefs — generated
                  in your firm&apos;s&nbsp;voice.
                </p>
                <div className="mt-5 flex gap-3">
                  {[".docx", ".xlsx", ".pptx"].map((ext) => (
                    <div
                      key={ext}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 text-sm"
                    >
                      {ext}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Impact ── */}
        <Impact />

        {/* ── Bottom CTA ── */}
        <section id="cta" className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-zinc-100">
              Ready to try Practiq?
            </h2>
            <p className="text-base text-zinc-300 mb-8 max-w-lg mx-auto">
              Free to start. Your whole team and every client workspace included
              from day one. No credit card.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/signup"
                className="btn-premium py-4 px-12 text-base inline-flex items-center justify-center gap-2"
              >
                Start free <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/demo"
                className="btn-outline py-4 px-10 text-base inline-flex items-center justify-center gap-2"
              >
                Live demo <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <p className="mt-4 text-sm text-zinc-400">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 transition-colors"
              >
                Sign in
              </a>
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-14 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 tracking-tight text-zinc-100 text-center">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="group bento-card">
                  <summary className="flex items-center justify-between cursor-pointer p-6 text-zinc-100 font-medium text-base list-none">
                    {item.q}
                    <span className="text-zinc-500 group-open:rotate-45 transition-transform text-xl ml-4">
                      +
                    </span>
                  </summary>
                  <div className="px-6 pb-6 pt-0 text-sm text-zinc-300 leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* ── Why Client-Centric — core architectural differentiation ── */
function WhyClientCentric() {
  const rows = [
    {
      chat: "Memory scoped to a conversation",
      practiq: "Memory scoped to the client",
    },
    {
      chat: "Context vanishes when you close the thread",
      practiq: "Context persists across every session with that client",
    },
    {
      chat: "Files and notes scattered across chats",
      practiq: "All client files, conversations, deliverables in one place",
    },
    {
      chat: "Every new session = re-brief the AI from scratch",
      practiq: "Open a client → the AI already knows where you left off",
    },
    {
      chat: "Agents forget what other agents did",
      practiq: "Every agent shares the same client-scoped memory",
    },
  ];

  return (
    <section id="why" className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full border border-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">
            The architectural shift
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-zinc-100 text-balance">
            Client-first, not chat-first.
          </h2>
          <p className="text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Every other AI agent organizes itself around conversations. That
            breaks the moment you manage more than one client. Practiq is built
            the other way.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-zinc-800">
            <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-zinc-800">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Chat-session AI agents
              </div>
              <div className="text-sm text-zinc-400">
                ChatGPT, Claude.ai, Copilot, most &quot;AI assistants&quot;
              </div>
            </div>
            <div className="p-5 md:p-6 bg-zinc-950/40">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">
                Practiq &mdash; client-centric
              </div>
              <div className="text-sm text-zinc-300">
                Built for firms managing 50&ndash;200 client relationships
              </div>
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-2 border-b border-zinc-800 last:border-b-0"
            >
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-zinc-800 flex items-start gap-3">
                <X className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-400 leading-relaxed">
                  {row.chat}
                </span>
              </div>
              <div className="p-5 md:p-6 bg-zinc-950/40 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-100 leading-relaxed">
                  {row.practiq}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6 max-w-xl mx-auto leading-relaxed">
          This isn&apos;t a UI choice &mdash; it&apos;s a different data model.
          Every conversation, file, agent run, and audit event in Practiq has a
          client_id. That&apos;s what makes context-switching cost zero.
        </p>
      </div>
    </section>
  );
}

/* ── Impact ── */
function Impact() {
  const stats = [
    {
      label: "Onboarding Time",
      value: "-90%",
      desc: "For new team members to a client",
      icon: Users,
    },
    {
      label: "Firm Capacity",
      value: "+40%",
      desc: "More clients per partner",
      icon: LineChart,
    },
    {
      label: "Output Velocity",
      value: "5x",
      desc: "Reports, memos, and briefs — drafted before you ask",
      icon: Cpu,
    },
    {
      label: "Context Errors",
      value: "-70%",
      desc: "Fewer cross-client mixups",
      icon: Fingerprint,
    },
  ];

  return (
    <section id="impact" className="py-14 px-6 bg-zinc-950/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-zinc-100">
            Impact
          </h2>
          <p className="text-base text-zinc-300 max-w-lg mx-auto">
            Your firm manages 50 clients today. Practiq makes&nbsp;80&nbsp;possible&nbsp;— same&nbsp;team.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bento-card p-6 flex flex-col items-center text-center"
            >
              <stat.icon className="w-5 h-5 text-zinc-400 mb-3" />
              <div className="text-3xl font-bold text-zinc-100 mb-1">
                {stat.value}
              </div>
              <div className="text-xs font-medium text-zinc-300 uppercase tracking-wide mb-2">
                {stat.label}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
