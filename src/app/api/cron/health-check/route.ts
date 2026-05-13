/**
 * /api/cron/health-check
 *
 * Tier-3 operational hardening: 5-minute heartbeat for the 5
 * production dependencies (db / resend / openrouter / storage /
 * stripe). Runs the same probes as GET /api/health, persists the
 * result to practiq.health_checks, and fires a critical Slack alert
 * (system_health_failure) on each check that flips ok → down vs. the
 * prior row.
 *
 * Schedule: vercel.json registers this at `* /5 * * * *` (every 5 min).
 *
 * Auth: Bearer CRON_SECRET header (same pattern as the other 24 cron
 * routes — cold-send, follow-up-send, workflow-audit-followup, ...).
 * Vercel cron also injects `x-vercel-cron` which we accept as a
 * fallback so a manual secret rotation doesn't break scheduled runs.
 *
 * Idempotency / dedupe:
 *   - The table is append-only — every tick gets a new row.
 *   - Slack dedupe lives in the cron handler, NOT at the Slack layer:
 *     we read the most recent prior row's checks_json, diff against
 *     the new probe result, and only fire `system_health_failure` for
 *     checks whose status transitioned ok → down. This keeps the
 *     channel quiet during a 6-hour outage while still surfacing the
 *     start of the incident immediately.
 *
 * Side note: by invoking runHealthProbes() directly we avoid a
 * second HTTP hop. The /api/health route still works for external
 * monitors; this cron just doesn't need it.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  runHealthProbes,
  type CheckResult,
  type HealthChecks,
  type OverallStatus,
} from "@/lib/health/probes";
import { safeNotify } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow a little headroom over the 3s-per-probe timeout × 5 probes
// running in parallel, plus the Supabase round-trips.
export const maxDuration = 30;

const ADMIN_HOST = "https://admin.grindworks.ai";
const CHECK_NAMES: (keyof HealthChecks)[] = [
  "db",
  "resend",
  "openrouter",
  "storage",
  "stripe",
];

function checkCronAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${expected}`) return true;
  return req.headers.get("x-vercel-cron") !== null;
}

function resolveEnvLabel(): string {
  // VERCEL_ENV is "production" | "preview" | "development" on Vercel.
  // Falls back to NODE_ENV for non-Vercel host (dev / self-hosted).
  return (
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "unknown"
  );
}

interface PriorHealthRow {
  checks_json: Record<string, CheckResult> | null;
}

export async function GET(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const runStart = Date.now();

  // 1. Run probes.
  const { body, httpStatus } = await runHealthProbes();
  const totalDurationMs = Date.now() - runStart;

  // 2. Read the prior row's checks_json so we can diff for transitions.
  let priorChecks: Record<string, CheckResult> | null = null;
  try {
    const { data, error } = await supabase
      .schema("practiq")
      .from("health_checks")
      .select("checks_json")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[cron/health-check] prior row read failed:", error);
    } else {
      priorChecks = (data as PriorHealthRow | null)?.checks_json ?? null;
    }
  } catch (err) {
    console.warn("[cron/health-check] prior row read exception:", err);
  }

  // 3. Append the new row. Best-effort — if the write fails we still
  // emit the Slack alerts for transitions so the operator knows.
  let insertErr: string | null = null;
  try {
    const { error } = await supabase
      .schema("practiq")
      .from("health_checks")
      .insert({
        status: body.status,
        checks_json: body.checks,
        http_status: httpStatus,
        duration_ms: totalDurationMs,
        commit_sha: body.commit,
      });
    if (error) {
      insertErr = error.message;
      console.warn("[cron/health-check] insert failed:", error);
    }
  } catch (err) {
    insertErr = err instanceof Error ? err.message : String(err);
    console.warn("[cron/health-check] insert exception:", err);
  }

  // 4. For each check, compare to prior and fire Slack on ok → down.
  // First tick of the table's lifetime has no prior row — in that case
  // we still alert on any current "down" so the operator doesn't miss
  // a dependency that's already broken at install time. Defensive: if
  // the prior column didn't have one of the 5 check names (rolling
  // schema), we treat that as "previously ok" so a real down still
  // pages.
  const transitions: Array<{
    name: keyof HealthChecks;
    result: CheckResult;
  }> = [];
  for (const name of CHECK_NAMES) {
    const newResult = body.checks[name];
    if (!newResult || newResult.status !== "down") continue;
    const priorStatus =
      priorChecks && typeof priorChecks === "object"
        ? (priorChecks[name]?.status ?? "ok")
        : "ok";
    if (priorStatus !== "down") {
      transitions.push({ name, result: newResult });
    }
  }

  const env = resolveEnvLabel();
  for (const t of transitions) {
    safeNotify("system_health_failure", {
      checkName: t.name,
      durationMs: t.result.duration_ms,
      errorDetail: t.result.detail ?? "(no detail)",
      overallStatus: body.status as OverallStatus,
      env,
      adminLink: `${ADMIN_HOST}/admin/health`,
      commit: body.commit,
    });
  }

  return NextResponse.json({
    ok: insertErr === null,
    overall: body.status,
    http_status: httpStatus,
    duration_ms: totalDurationMs,
    transitions: transitions.map((t) => ({
      check: t.name,
      detail: t.result.detail ?? null,
    })),
    insert_error: insertErr,
    prior_row_seen: priorChecks !== null,
  });
}
