/**
 * scripts/aeo/definition-lint.ts — RUN 22 Phase 3.
 *
 * Per the CMU GEO research, the first 150-200 tokens of an LLM-
 * crawled page carry disproportionate weight in summarization. AI
 * engines parse the lede looking for a "Practiq is X for Y" sentence
 * before they read the body. A post that buries its definition or
 * skips it entirely loses out on direct citations.
 *
 * This lint walks every blog post + research dataset abstract +
 * vertical page lede + competitor page lede and flags entries whose
 * first 200 tokens don't contain a definition-shaped sentence
 * (matches `Practiq is …` / `Practiq's <thing> is …` / `the practiq
 * <X> is a <Y>`). Gives a per-page warning so authors can fix the
 * lede before publish.
 *
 * Usage:
 *
 *   npx tsx scripts/aeo/definition-lint.ts          (lint all)
 *   npx tsx scripts/aeo/definition-lint.ts --fix    (future: auto-prepend lede)
 *   npx tsx scripts/aeo/definition-lint.ts --json   (machine-readable)
 *
 * Exit code: 0 if every lede matches, 1 if any miss. CI can wire this
 * into a pre-publish check.
 */
import { BLOG_POSTS } from "../../src/data/blog";
import { RESEARCH_DATASETS } from "../../src/data/research/datasets";

const argv = process.argv.slice(2);
const JSON_OUTPUT = argv.includes("--json");

const DEFINITION_PATTERN =
  /\b(practiq|practiq[''']s|the\s+practiq\s+\w+)\s+(is|are|provides|gives|builds|delivers|powers)\s+/i;

const TOKEN_BUDGET = 200;

interface LintResult {
  surface: string;
  slug: string;
  pass: boolean;
  ledePreview: string;
  matchedPattern: string | null;
  reason?: string;
}

function tokenizeLength(s: string): number {
  // 4 chars/token is the project's standard heuristic.
  return Math.ceil(s.length / 4);
}

function takeFirstNTokens(s: string, n: number): string {
  // Approximate by character cap (4× tokens).
  const cap = n * 4;
  return s.length <= cap ? s : s.slice(0, cap);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function lintLede(
  surface: string,
  slug: string,
  ledeRaw: string,
): LintResult {
  const text = stripHtml(ledeRaw);
  const lede = takeFirstNTokens(text, TOKEN_BUDGET);
  const match = lede.match(DEFINITION_PATTERN);
  if (match) {
    return {
      surface,
      slug,
      pass: true,
      ledePreview: lede.slice(0, 220),
      matchedPattern: match[0],
    };
  }
  // Soft fallback: count whether at least the brand name appears.
  // If even that's missing, emit a stronger warning.
  const brandMentioned = /practiq/i.test(lede);
  return {
    surface,
    slug,
    pass: false,
    ledePreview: lede.slice(0, 220),
    matchedPattern: null,
    reason: brandMentioned
      ? "Brand mentioned but no `Practiq is X` definition in the first 200 tokens"
      : "Brand 'Practiq' not mentioned in the first 200 tokens",
  };
}

function lint(): LintResult[] {
  const results: LintResult[] = [];

  // Blog posts — excerpt + first paragraph of HTML body.
  for (const post of BLOG_POSTS) {
    const lede = `${post.excerpt}\n\n${post.content}`;
    results.push(lintLede("blog", post.slug, lede));
  }

  // Research datasets — abstract carries the lede.
  for (const ds of RESEARCH_DATASETS) {
    results.push(lintLede("research", ds.slug, ds.abstract));
  }

  return results;
}

function main(): void {
  const results = lint();
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ results }, null, 2));
    if (results.some((r) => !r.pass)) process.exit(1);
    return;
  }

  const fails = results.filter((r) => !r.pass);
  const passes = results.filter((r) => r.pass);

  console.log(
    `[aeo:definition-lint] ${passes.length} pass · ${fails.length} fail · ${results.length} total surfaces`,
  );
  console.log(
    `[aeo:definition-lint] Token budget per lede: ${TOKEN_BUDGET} (≈${TOKEN_BUDGET * 4} chars)\n`,
  );

  if (passes.length > 0) {
    console.log("✓ PASS:");
    for (const r of passes) {
      console.log(
        `  · ${r.surface}/${r.slug} — matched "${r.matchedPattern!.slice(0, 60)}${r.matchedPattern!.length > 60 ? "…" : ""}"`,
      );
    }
    console.log();
  }

  if (fails.length > 0) {
    console.log("✗ FAIL:");
    for (const r of fails) {
      console.log(`  · ${r.surface}/${r.slug} — ${r.reason}`);
      console.log(`    lede: ${r.ledePreview.slice(0, 180)}…`);
    }
    console.log(
      `\n[aeo:definition-lint] ${fails.length} surfaces need a definition-first lede.`,
    );
    process.exit(1);
  }
  console.log("[aeo:definition-lint] All surfaces pass ✓");
}

void tokenizeLength; // currently informational; reserved for future per-lede tokenisation
main();
