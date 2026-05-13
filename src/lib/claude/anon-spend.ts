/**
 * Per-firm $-budget guardrail for the anonymous LLM hot paths.
 *
 * Background: Practiq has IP-level rate limiting on the public LLM
 * endpoints (workflow-audit, ai-policy-generator), but no $-budget cap.
 * A scripted abuser hitting either route from rotating IPs (cheap on
 * residential-proxy services) could rack up unlimited OpenRouter cost.
 * This module locks that down per-firm (or per-email when anonymous),
 * which is the abuse vector's actual chokepoint.
 *
 * Why a separate module from `src/lib/spend-ceiling.ts`:
 *   `spend-ceiling.ts` covers authenticated users — it reads
 *   practiq.usage_events (Prisma, user_id FK) and enforces plan-keyed
 *   ceilings. The public hot paths have no userId; identity is the
 *   lowercased email the visitor typed into the form. Keeping the two
 *   trackers in separate tables means we can migrate either flow
 *   without disturbing the other. See the migration docblock at
 *   supabase/migrations/20260513210000_anon_llm_spend.sql for the
 *   schema-design rationale.
 *
 * Three integration points:
 *   1. `assertSpendUnderCeiling(meta)` — pre-call guard. Throws
 *      `SpendCeilingExceededError` when the firm is at or above its
 *      30-day ceiling.
 *   2. `recordSpend({ meta, model, inputTokens, outputTokens })` — post-
 *      call recording. Insert a row at `cost_usd` computed via the
 *      shared pricing table.
 *   3. Both are wrapped by `ClaudeProvider.complete()` when the caller
 *      passes `meta`. Routes don't need to know about Supabase or the
 *      schema directly — they just plumb `meta` through.
 *
 * Ceilings:
 *   - Anonymous (no auth session): $5 / firm_identity / 30d.  Generous
 *     enough for a real prospect to generate 5+ workflow-audits and 5+
 *     policy drafts; tight enough to cut off a script that rotates
 *     emails (each gets its own bucket but the unit economics break).
 *   - Authenticated: $50 / 30d. Future hook — we don't currently call
 *     into this from authenticated routes, but the constant is wired
 *     up so the migration is one config change away.
 *
 * Both ceilings can be overridden via env vars
 * (LLM_SPEND_CEILING_ANON_USD / LLM_SPEND_CEILING_AUTH_USD), documented
 * in .env.example.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { costForCall } from "@/lib/claude/pricing";

/** Identity tier — drives which ceiling applies. */
export type SpendIdentityKind = "anonymous" | "authenticated";

export interface SpendMeta {
  /** Lowercased email (today) or firm_id (post-launch). */
  firmIdentity: string;
  /** Logical endpoint label, e.g. "ai-policy-generator", "workflow-audit". */
  endpoint: string;
  /** Defaults to "anonymous". Authenticated routes pass "authenticated". */
  kind?: SpendIdentityKind;
}

export interface SpendSnapshot {
  firmIdentity: string;
  spentUsd: number;
  ceilingUsd: number;
  fractionUsed: number;
  exceeded: boolean;
  /** Trailing-30d window — fixed for this guardrail. */
  windowDays: number;
}

export class SpendCeilingExceededError extends Error {
  readonly snapshot: SpendSnapshot;
  readonly endpoint: string;
  readonly kind: SpendIdentityKind;
  constructor(
    snapshot: SpendSnapshot,
    endpoint: string,
    kind: SpendIdentityKind,
  ) {
    super(
      `Spend ceiling reached: $${snapshot.spentUsd.toFixed(2)} of $${snapshot.ceilingUsd.toFixed(2)} for firm ${snapshot.firmIdentity} (${kind})`,
    );
    this.name = "SpendCeilingExceededError";
    this.snapshot = snapshot;
    this.endpoint = endpoint;
    this.kind = kind;
  }
}

/**
 * Hardcoded defaults — the env vars override.  Documented in
 * .env.example so the operator can tune without redeploying code.
 */
const DEFAULT_ANON_CEILING_USD = 5;
const DEFAULT_AUTH_CEILING_USD = 50;
const WINDOW_DAYS = 30;

function ceilingFor(kind: SpendIdentityKind): number {
  if (kind === "authenticated") {
    const raw = process.env.LLM_SPEND_CEILING_AUTH_USD;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_AUTH_CEILING_USD;
  }
  const raw = process.env.LLM_SPEND_CEILING_ANON_USD;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_ANON_CEILING_USD;
}

/**
 * Memoised Supabase client. Calling createClient on every call would
 * not error but allocates a fetch agent + parser each time. Cached at
 * module scope (one per warm Vercel instance).
 */
let cachedClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

/** Lowercase + trim so the firm_identity is a stable lookup key. */
function normalizeIdentity(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Read the firm's 30d trailing spend and compare against ceiling.
 * Returns `null` when Supabase is unavailable — callers treat that as
 * "fail open" rather than blocking the LLM call (we shouldn't take the
 * site down because the analytics DB is down).
 */
export async function getSpendSnapshot(
  meta: SpendMeta,
): Promise<SpendSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const kind = meta.kind ?? "anonymous";
  const firmIdentity = normalizeIdentity(meta.firmIdentity);
  const ceilingUsd = ceilingFor(kind);
  const since = new Date(
    Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // supabase-js doesn't expose .sum(), so we pull the cost_usd column
  // for matching rows and sum in-process. At the ceiling level we're
  // talking about a handful of rows per firm per 30d (5-50 calls), so
  // the network cost is irrelevant.
  const { data, error } = await supabase
    .schema("practiq")
    .from("anon_llm_spend")
    .select("cost_usd")
    .eq("firm_identity", firmIdentity)
    .gte("created_at", since);
  if (error) {
    console.warn(
      `[anon-spend] snapshot query failed for ${firmIdentity}: ${error.message}`,
    );
    return null;
  }
  const rows = (data ?? []) as Array<{ cost_usd: number | string }>;
  let spentUsd = 0;
  for (const r of rows) {
    const v = typeof r.cost_usd === "number" ? r.cost_usd : Number(r.cost_usd);
    if (Number.isFinite(v)) spentUsd += v;
  }
  return {
    firmIdentity,
    spentUsd: Math.round(spentUsd * 10_000) / 10_000,
    ceilingUsd,
    fractionUsed: ceilingUsd > 0 ? Math.min(1, spentUsd / ceilingUsd) : 0,
    exceeded: spentUsd >= ceilingUsd,
    windowDays: WINDOW_DAYS,
  };
}

/**
 * Pre-call guard. Throws `SpendCeilingExceededError` when the firm has
 * exhausted its 30d budget. Safe to call from any code path before
 * provider.complete() — when Supabase is unavailable, returns silently
 * (fail-open).
 *
 * Escape hatch: when LLM_SPEND_CEILING_DISABLED=1 we skip the check
 * entirely. Matches the existing convention on
 * `spend-ceiling.ts:assertSpendUnderCeiling` (SPEND_CEILING_DISABLED).
 */
export async function assertSpendUnderCeiling(meta: SpendMeta): Promise<void> {
  if (process.env.LLM_SPEND_CEILING_DISABLED === "1") return;
  const snap = await getSpendSnapshot(meta);
  if (!snap) return;
  if (snap.exceeded) {
    throw new SpendCeilingExceededError(
      snap,
      meta.endpoint,
      meta.kind ?? "anonymous",
    );
  }
}

/**
 * Post-call recording. Compute cost_usd from the pricing table and
 * insert a row.  Never throws — recording is best-effort. If the row
 * fails to land we'd rather under-account than block the user response.
 * Logs the error so the operator can backfill or investigate.
 */
export async function recordSpend(args: {
  meta: SpendMeta;
  model: string | null | undefined;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const firmIdentity = normalizeIdentity(args.meta.firmIdentity);
  const costUsd = costForCall(args.model, args.inputTokens, args.outputTokens);
  const { error } = await supabase
    .schema("practiq")
    .from("anon_llm_spend")
    .insert({
      firm_identity: firmIdentity,
      endpoint: args.meta.endpoint,
      model: args.model ?? null,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      cost_usd: costUsd,
    });
  if (error) {
    console.warn(
      `[anon-spend] insert failed for ${firmIdentity} (${args.meta.endpoint}): ${error.message}`,
    );
  }
}
