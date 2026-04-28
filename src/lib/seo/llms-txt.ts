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
