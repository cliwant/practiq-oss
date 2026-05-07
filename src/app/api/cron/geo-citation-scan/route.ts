/**
 * Vercel Cron — daily GEO citation scan.
 *
 * Schedule: 06:00 UTC every day (see vercel.json).
 * Runs the 12 probe queries against every available AI search engine
 * (currently: Perplexity / Brave AI / OpenRouter ChatGPT-online), records
 * each result in public.geo_citations, appends a per-day summary to
 * .cycle/research/geo-citation-log.md, and pings Slack when a new
 * Practiq citation is found.
 *
 * Auth: Vercel cron header OR x-deploy-secret for manual runs.
 *
 * Cost cap: $0.50/run (configurable). When the cap is hit the remaining
 * queries are skipped with a `cost_cap` note rather than overrunning
 * the budget.
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { runGeoScan } from "@/lib/geo/scan";
import { safeNotify } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 300;

async function appendLog(text: string): Promise<void> {
  // The cron runs in the Next.js app's working dir. Try the studio-root
  // path first, fall back to the venture-local path.
  const candidates = [
    path.resolve(process.cwd(), "..", "..", "ventures", "fractional-ai-command-center", ".cycle", "research", "geo-citation-log.md"),
    path.resolve(process.cwd(), ".cycle", "research", "geo-citation-log.md"),
  ];
  for (const c of candidates) {
    try {
      await fs.mkdir(path.dirname(c), { recursive: true });
      // Append with a leading newline so successive scans don't collide.
      await fs.appendFile(c, `\n${text}\n`);
      return;
    } catch {
      continue;
    }
  }
  // Vercel filesystem is read-only at runtime, so logging via FS will
  // fail in production. That's acceptable — the rows are in Supabase
  // and the Slack ping fires either way. The log file is for local /
  // operator-machine runs.
}

async function runCron(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passed = request.headers.get("x-deploy-secret")?.trim();
  if (!isVercelCron && !(secret && passed === secret)) {
    return NextResponse.json({ error: "cron-only" }, { status: 401 });
  }

  const startedAt = new Date();
  let summary;
  try {
    summary = await runGeoScan({ costCapUsd: 0.5 });
  } catch (err) {
    safeNotify(
      "error",
      {
        where: "cron:geo-citation-scan",
        message: err instanceof Error ? err.message : String(err),
      },
      { severity: "critical" },
    );
    console.error("[geo-citation-scan] fatal:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }

  const dateStr = startedAt.toISOString().slice(0, 10);
  const logEntry = [
    `## ${dateStr} scan`,
    `- Engines attempted: ${summary.engines_attempted.join(", ") || "(none)"}`,
    `- Engines skipped: ${summary.engines_skipped.map((s) => `${s.name} (${s.reason})`).join("; ") || "(none)"}`,
    `- Queries: ${summary.queries_run} / ${summary.queries_total}`,
    `- Practiq citations found: ${summary.citations_found}`,
    `- Cost: $${summary.cost_usd_total.toFixed(4)}${summary.cost_cap_hit ? " (cap hit)" : ""}`,
    summary.citations_found > 0
      ? `- Highlights:\n${summary.results
          .filter((r) => r.cited_practiq)
          .map((r) => `  - [${r.source}] "${r.query}" → ${r.cited_url ?? "(brand mention only)"}`)
          .join("\n")}`
      : `- Highlights: none`,
  ].join("\n");

  await appendLog(logEntry);

  if (summary.citations_found > 0) {
    safeNotify("agent_cron_summary", {
      window: `GEO scan ${dateStr}`,
      summary: `🎯 ${summary.citations_found} new Practiq citation(s) across ${summary.engines_attempted.length} engine(s). Queries: ${summary.queries_run}.`,
      details: summary.results
        .filter((r) => r.cited_practiq)
        .map((r) => `${r.source}: "${r.query}"`),
    });
  }

  return NextResponse.json({ ok: true, summary });
}

export const GET = runCron;
export const POST = runCron;
