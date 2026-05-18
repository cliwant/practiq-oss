/**
 * Local AEO citation scan — runs the 12 GEO_PROBE_QUERIES through every
 * available engine (driven by env vars) and produces a per-prompt result
 * dump WITHOUT writing to Supabase.
 *
 * Used to:
 *  1. Reproduce the 1/12 baseline operators see in production.
 *  2. Run the same scan against a deployed branch to verify schema/content
 *     changes lifted citation rate.
 *
 * Usage:
 *   dotenv -e ../../.env.local -- tsx scripts/aeo/citation-scan-local.ts
 *
 * Output: writes a structured JSON to .cycle/research/aeo-scan-{date}.json
 * plus a human-readable summary to stdout.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { runGeoScan } from "../../src/lib/geo/scan";
import { GEO_PROBE_QUERIES } from "../../src/lib/geo/probe-queries";

async function main() {
  console.log(`[aeo-scan] starting ${GEO_PROBE_QUERIES.length}-prompt scan…`);
  console.log(
    `[aeo-scan] engines configured via env: ` +
      `OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY ? "yes" : "no"}, ` +
      `PERPLEXITY_API_KEY=${process.env.PERPLEXITY_API_KEY ? "yes" : "no"}, ` +
      `BRAVE_SEARCH_API_KEY=${process.env.BRAVE_SEARCH_API_KEY ? "yes" : "no"}`,
  );

  const summary = await runGeoScan({ costCapUsd: 1.5 });

  console.log(`\n[aeo-scan] complete`);
  console.log(
    `  engines attempted: ${summary.engines_attempted.join(", ") || "(none)"}`,
  );
  console.log(
    `  engines skipped:   ${summary.engines_skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}`,
  );
  console.log(`  queries run:       ${summary.queries_run} / ${summary.queries_total}`);
  console.log(`  citations found:   ${summary.citations_found}`);
  console.log(`  cost:              $${summary.cost_usd_total.toFixed(4)}`);

  console.log(`\nPer-query results:`);
  for (let i = 0; i < summary.results.length; i++) {
    const r = summary.results[i];
    const tag = r.cited_practiq ? "PASS" : "FAIL";
    const url = r.cited_url ?? "(brand-only)";
    const compStr =
      r.competitors_cited.length > 0
        ? ` | competitors: ${r.competitors_cited.join(", ")}`
        : "";
    console.log(
      `  [${tag}] (${r.source}) "${r.query}" → ${r.cited_practiq ? url : "no citation"}${compStr}`,
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const outPath = path.resolve(
    process.cwd(),
    ".cycle",
    "research",
    `aeo-scan-${dateStr}.json`,
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(summary, null, 2));
  console.log(`\n[aeo-scan] wrote ${outPath}`);
}

main().catch((err) => {
  console.error(`[aeo-scan] fatal: ${err}`);
  process.exit(1);
});
