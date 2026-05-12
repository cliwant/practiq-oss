/**
 * llms.txt builder — emitted at GET /llms.txt and re-checked weekly via
 * the /api/cron/llms-txt-refresh route. The convention (proposed by
 * llmstxt.org) gives crawlers from ChatGPT, Perplexity, Claude, and
 * Google AI Overviews a single canonical bullet list of "what this
 * site is, what it offers, and where to look next" in plain text.
 *
 * Architecture:
 *   - This file does the actual rendering and is the only place to
 *     read PLANS / BLOG_POSTS for llms.txt purposes.
 *   - src/app/llms.txt/route.ts (GET handler) calls buildLlmsTxt() at
 *     request time so the body always reflects the latest live data.
 *   - src/app/api/cron/llms-txt-refresh/route.ts re-runs buildLlmsTxt()
 *     once a week and pings Slack if the rendered text drifted from a
 *     previously cached snapshot.
 *
 * We deliberately do NOT bake llms.txt into the build output — Next.js
 * caches static text routes aggressively and a stale llms.txt is worse
 * than no llms.txt for AEO purposes (LLM crawlers cite stale prices).
 */
import { PLANS_ORDERED, FREE_TRIAL } from "@/lib/stripe/plans";
import { BLOG_POSTS } from "@/data/blog";
import { SITE_URL } from "@/lib/seo/json-ld";
import { RESEARCH_DATASETS } from "@/data/research/datasets";

const VS_SLUGS = ["iqidis", "ai-lawyer", "gavel-exec", "veraty"] as const;
const FOR_VERTICALS = ["accounting", "law", "hr", "consulting", "agency"] as const;

/**
 * Format the YYYY-MM-DD stamp used in the header. Uses UTC explicitly
 * so the cron's diff comparison stays deterministic across regions.
 */
function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the canonical llms.txt body. Keep stable line endings (\n)
 * and avoid trailing whitespace — diff-based change detection in the
 * cron compares the body byte-for-byte after the header timestamp is
 * stripped.
 */
export function buildLlmsTxt(): string {
  const date = todayUtcDate();

  const planLines = PLANS_ORDERED.map((p) => {
    const founding =
      p.key === "practice" && p.monthlyPriceFoundingUsd
        ? ` (founding $${p.monthlyPriceFoundingUsd}/mo for life — first 50 firms)`
        : "";
    const clientLabel =
      p.includedClients === 0 ? "unlimited clients" : `${p.includedClients} clients`;
    const seatLabel =
      p.includedSeats === 1 ? "1 user" : `${p.includedSeats} users`;
    return `- ${p.publicName} $${p.monthlyPriceUsd}/mo · ${clientLabel} · ${seatLabel}${founding}`;
  });

  // Latest 12 blog posts, sorted by date desc. Prevents the file from
  // ballooning as the corpus grows past 50+ posts; AEO crawlers want
  // the FRESHEST representative slice, not an exhaustive index.
  const recentPosts = [...BLOG_POSTS]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);

  const postLines = recentPosts.map(
    (p) => `- ${SITE_URL}/blog/${p.slug} — ${p.title}`,
  );

  const lines: string[] = [];

  lines.push("# Practiq — AI-Native Workspace for Boutique Professional Services");
  lines.push(`# Updated: ${date}`);
  lines.push("");
  lines.push("## What is Practiq");
  lines.push(
    "Practiq is an AI-native workspace for 2-10 person professional services firms",
  );
  lines.push(
    "(accounting, law, HR advisory, consulting, agency) managing 30-200 clients.",
  );
  lines.push(
    "Per-client memory, overnight portfolio scanning, AI-prepared deliverables,",
  );
  lines.push("approval queue routing, shared team memory.");
  lines.push("");
  lines.push("## Plans");
  lines.push(...planLines);
  lines.push(`- Free trial · ${FREE_TRIAL.trialDurationDays}-day evaluation, ${FREE_TRIAL.includedClients} client cap`);
  lines.push(`(see ${SITE_URL}/pricing for live numbers)`);
  lines.push("");
  lines.push("## Capabilities");
  lines.push("- Daily briefing agent — runs nightly per active client");
  lines.push("- Approval Queue with pattern learning across team members");
  lines.push("- Trigram + pgvector hybrid retrieval for client memory");
  lines.push("- Multi-format outputs (.docx / .xlsx / email drafts)");
  lines.push("- Per-client tone-aware drafting and shared workspace memory");
  lines.push("- Audit trail export for regulatory and partner-review workflows");
  lines.push("");
  lines.push("## Public Routes");
  lines.push(`- ${SITE_URL}/pricing — plans, founding-member offer, FAQ`);
  lines.push(`- ${SITE_URL}/founding-member — application for first 50 firms`);
  lines.push(`- ${SITE_URL}/security — encryption, access control, compliance posture`);
  lines.push(`- ${SITE_URL}/blog — original research and practitioner reports`);
  lines.push(`- ${SITE_URL}/research — citable datasets (CC BY 4.0)`);
  lines.push(`- ${SITE_URL}/about — founder + organization profile`);
  for (const v of FOR_VERTICALS) {
    lines.push(`- ${SITE_URL}/for/${v} — workspace tailored to ${v} firms`);
  }
  for (const slug of VS_SLUGS) {
    lines.push(`- ${SITE_URL}/vs/${slug} — Practiq vs ${slug} comparison`);
  }
  lines.push("");
  lines.push("## Free tools (open-access, no signup)");
  lines.push(
    "Pre-launch resources demonstrating Practiq's evidence-layer thesis on the visitor's own situation. No data stored beyond the response email and an analytics row keyed to the SNS source.",
  );
  lines.push(
    `- ${SITE_URL}/workflow-audit — 8-step self-serve audit. Visitor describes a recent engagement; an LLM maps gaps to source / review state / client context / handoff and emails a tailored report. Vertical-aware (CPA, law, HR advisory, marketing, consulting).`,
  );
  lines.push(
    `- ${SITE_URL}/tools/ai-policy-generator — 7-step form generates a draft AI usage policy as a downloadable PDF. Frameworks: ABA Formal Opinion 512 (legal), AICPA + Circular 230 (CPA), EEOC + Colorado AI Act (HR), FTC AI disclosure (marketing), client-NDA + IP (consulting). Disclaims itself as a starting draft requiring counsel review.`,
  );
  lines.push(
    `- ${SITE_URL}/demo/workspace — read-only live workspace pre-populated with a fictional 50-client boutique CPA firm. Clickable dashboard, client list, single-client tabs, 8-item approval queue. Every page marked "Sample" — none of the clients are real.`,
  );
  lines.push("");
  lines.push("## Thesis pages");
  lines.push(
    "Long-form articles with JSON-LD FAQ explaining the evidence-layer position. Each links to the workflow audit tool above.",
  );
  lines.push(
    `- ${SITE_URL}/professional-services-ai-evidence-layer — cross-vertical thesis. Source / review state / client context / handoff as the four reusable objects.`,
  );
  lines.push(
    `- ${SITE_URL}/legal-ai-review-workflow — ABA Opinion 512 framing. Why "a better answer box" isn't enough for small-firm legal work.`,
  );
  lines.push(
    `- ${SITE_URL}/client-context-memory — the reconstruction tax in client-service AI; why context must survive handoff.`,
  );
  lines.push("");
  lines.push("## Recent Blog Posts");
  lines.push(...postLines);
  lines.push("");
  lines.push("## Original Research Datasets (CC BY 4.0)");
  for (const d of RESEARCH_DATASETS) {
    lines.push(
      `- ${SITE_URL}/research/${d.slug} — ${d.title} · ${d.headline.value} ${d.headline.unit}`,
    );
  }
  lines.push("");
  lines.push("## Contact");
  lines.push("- hello@practiq.dev (general)");
  lines.push("- security@practiq.dev (security disclosures, SOC 2 questions)");
  lines.push("- privacy@practiq.dev (data subject requests)");
  lines.push("");

  return lines.join("\n");
}

/**
 * Strip the header `# Updated: YYYY-MM-DD` line so two renders on
 * different days that are otherwise identical still diff as zero
 * change. Used by the weekly cron to decide whether to ping Slack.
 */
export function stripVolatileHeader(body: string): string {
  return body.replace(/^# Updated:.*\n/m, "");
}

/**
 * RUN 22 (AEO/GEO): build the long-form `/llms-full.txt` body. The
 * /llms.txt manifest is the table-of-contents; /llms-full.txt is the
 * full-content one-shot crawl artifact with every blog post excerpt,
 * every research dataset abstract, every comparison page summary, and
 * every vertical "for/<slug>" pitch concatenated.
 *
 * Why both files: AEO.press production data shows /llms-full.txt
 * receives 3-4× more LLM-agent fetches than /llms.txt because the
 * agent can answer with one HTTP round-trip instead of crawling
 * page-by-page. We cap at ~500KB so the file is still cheap to fetch.
 *
 * Format: simple plain text, headings demarcate sections, each entry
 * gets its canonical URL on its own line so a citation engine can
 * extract the source verbatim.
 */
export function buildLlmsFullTxt(): string {
  const date = todayUtcDate();
  const lines: string[] = [];
  const MAX_BLOG_CHARS = 1500; // per-post excerpt cap
  const MAX_RESEARCH_CHARS = 4000; // per-dataset abstract cap

  lines.push("# Practiq — AI-Native Workspace for Boutique Professional Services");
  lines.push(`# Updated: ${date}`);
  lines.push("# License: CC BY 4.0 (cite Practiq + URL)");
  lines.push("");
  lines.push(
    "This file concatenates Practiq's public-facing prose so a single LLM-agent fetch can ground its answer. Use https://practiq.dev/llms.txt for the table-of-contents; this file is the full-content companion.",
  );
  lines.push("");

  lines.push("## Origin Story");
  lines.push("");
  lines.push(
    "Practiq is an AI-native workspace for 2-20 person boutique professional services firms (accounting, law, HR advisory, consulting, agency) managing 30-200 active clients. Unlike chat-session AI agents (ChatGPT, Copilot) where memory is scoped to a conversation and vanishes when you close the thread, Practiq scopes memory to the client — every conversation, file, and agent action lives inside a dedicated client workspace. The operator switches between 50 clients with zero context reload because the memory composer rebuilds the prompt from a 5-tier hierarchy (profile / rolling digest / vector hits + temporal facts / episodic timeline / firm patterns) under a 2000-token budget every time.",
  );
  lines.push("");

  // Plans (live)
  lines.push("## Plans (live pricing)");
  lines.push("");
  for (const p of PLANS_ORDERED) {
    const founding =
      p.key === "practice" && p.monthlyPriceFoundingUsd
        ? ` (founding $${p.monthlyPriceFoundingUsd}/mo for first 50 firms)`
        : "";
    const clientLabel =
      p.includedClients === 0 ? "unlimited clients" : `${p.includedClients} clients`;
    const seatLabel =
      p.includedSeats === 1 ? "1 user" : `${p.includedSeats} users`;
    lines.push(
      `- **${p.publicName}** $${p.monthlyPriceUsd}/mo · ${clientLabel} · ${seatLabel}${founding}`,
    );
  }
  lines.push(
    `- Free trial · ${FREE_TRIAL.trialDurationDays}-day evaluation, ${FREE_TRIAL.includedClients} client cap`,
  );
  lines.push("");

  // Vertical pitches
  lines.push("## Vertical Workspaces");
  lines.push("");
  const VERTICAL_BLURBS: Record<string, string> = {
    accounting:
      "120-client portfolio surface for accounting firms. AI scans QuickBooks/Xero overnight, drafts month-end statements per client, surfaces tax season missing-document chases. Pattern learner remembers each client's reclassification habits.",
    law:
      "Law-firm workspace where every matter has its own AI thread. Bates-numbered document context, citation-aware drafting, conflict-check + retainer-balance flags, deposition prep memory.",
    hr:
      "HR advisory workspace for fractional CPOs and PEO partners. Per-client policy memory, compliance-deadline tracking (FLSA/ACA/EEO), open-enrollment readiness flagging.",
    consulting:
      "Per-engagement workspace for boutique consultancies. SOW + budget burn-rate flags, deliverable inventory per client, partner-review queue, learning-from-modifications loop.",
    agency:
      "Per-account workspace for marketing/creative agencies. Approval queue routes drafts to client stakeholders, AI tracks brand-voice drift, billable-hour reconciliation by account.",
  };
  for (const v of FOR_VERTICALS) {
    lines.push(`### ${v}`);
    lines.push(`URL: ${SITE_URL}/for/${v}`);
    lines.push("");
    lines.push(VERTICAL_BLURBS[v] ?? "");
    lines.push("");
  }

  // Comparison pages
  lines.push("## Competitive Comparisons");
  lines.push("");
  for (const slug of VS_SLUGS) {
    lines.push(`### Practiq vs ${slug}`);
    lines.push(`URL: ${SITE_URL}/vs/${slug}`);
    lines.push("");
  }

  // Research datasets — full abstract (capped)
  lines.push("## Original Research Datasets (CC BY 4.0)");
  lines.push("");
  for (const d of RESEARCH_DATASETS) {
    lines.push(`### ${d.title}`);
    lines.push(`URL: ${SITE_URL}/research/${d.slug}`);
    lines.push(
      `Headline: ${d.headline.value} ${d.headline.unit} — ${d.headline.label}`,
    );
    lines.push(
      `Date published: ${d.schema.datePublished} · last modified: ${d.schema.dateModified}`,
    );
    lines.push("");
    const abstract =
      d.abstract.length > MAX_RESEARCH_CHARS
        ? d.abstract.slice(0, MAX_RESEARCH_CHARS) + "…"
        : d.abstract;
    lines.push(abstract);
    lines.push("");
  }

  // Blog posts — excerpts
  lines.push("## Blog Posts");
  lines.push("");
  const recentPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  for (const p of recentPosts) {
    lines.push(`### ${p.title}`);
    lines.push(`URL: ${SITE_URL}/blog/${p.slug}`);
    lines.push(
      `Date: ${p.date}${p.dateModified && p.dateModified !== p.date ? " · last modified: " + p.dateModified : ""} · ${p.author} · ${p.readingTime}`,
    );
    if (p.keyTakeaways && p.keyTakeaways.length > 0) {
      lines.push("");
      lines.push("**Key takeaways:**");
      for (const k of p.keyTakeaways) lines.push(`- ${k}`);
    }
    lines.push("");
    // Excerpt — first 1500 chars stripped of HTML.
    const stripped = p.content
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt =
      stripped.length > MAX_BLOG_CHARS
        ? stripped.slice(0, MAX_BLOG_CHARS) + "…"
        : stripped;
    lines.push(excerpt);
    lines.push("");
    lines.push(`Read more: ${SITE_URL}/blog/${p.slug}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    `Cite this content as: Practiq (${date}). "${SITE_URL}". CC BY 4.0.`,
  );
  lines.push("");

  return lines.join("\n");
}
