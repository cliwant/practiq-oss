/**
 * POST /api/dev-test/schema-migrate — RUN 14 (P2-01 hardening).
 *
 * Production-side helper that runs raw `ALTER TABLE` statements to add
 * the four new columns introduced for agent task idempotency, retry,
 * cost transparency, and version tagging:
 *
 *   - dedup_key      TEXT NULL
 *   - attempt        INT NOT NULL DEFAULT 0
 *   - usd_cost       NUMERIC(10, 4) NULL
 *   - agent_version  TEXT NULL
 *
 * And one composite index:
 *
 *   - (user_id, dedup_key, status)  for fast pre-flight dedup queries
 *
 * Why this exists as an endpoint and not just `npx prisma db push`:
 * ARM64 Windows + Supabase SASL fights pg-pool's password authentication
 * during script-side connections — see the dogfood-bootstrap route's
 * preamble for the same pattern. Running ALTER TABLEs from the dev box
 * fails with "SASL: client password must be a string" before the schema
 * push can complete; running them inside Vercel's Linux x64 lambda
 * sidesteps the issue.
 *
 * Idempotent: every statement is `ADD COLUMN IF NOT EXISTS` /
 * `CREATE INDEX IF NOT EXISTS`. Re-running is safe and a no-op once the
 * migration has applied.
 *
 * Auth: BOOTSTRAP_SECRET via X-Bootstrap-Secret header.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface StatementResult {
  sql: string;
  ok: boolean;
  error?: string;
}

const STATEMENTS: string[] = [
  // RUN 14 fields
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS dedup_key TEXT`,
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS usd_cost NUMERIC(10, 4)`,
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS agent_version TEXT`,
  `CREATE INDEX IF NOT EXISTS agent_tasks_user_id_dedup_key_status_idx ON practiq.agent_tasks(user_id, dedup_key, status)`,
  // RUN 24 audit fix #5: pg_trgm + vector extensions. Chat's
  // hybrid-search + tool-handlers.searchKnowledgeBase use the `%`
  // operator and `similarity()` function from pg_trgm; embeddings
  // backfill writes to a `vector(1024)` column from pgvector.
  // Without these the chat search tool fails silently in production.
  // CREATE EXTENSION IF NOT EXISTS is idempotent and Supabase grants
  // the necessary privileges to the default service role.
  `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public`,
  `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public`,
  // GIN trigram indexes on the searched columns so the % operator
  // can use the index instead of seq-scanning every row.
  `CREATE INDEX IF NOT EXISTS client_contexts_title_trgm_idx ON practiq.client_contexts USING gin (title gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS client_contexts_content_trgm_idx ON practiq.client_contexts USING gin (content gin_trgm_ops)`,
  // ─── Stage 3a: per-client billing migration (2026-05-15) ──────────
  // Subscription gains tier/clientCount/foundingLockedAt so the new
  // per-client pricing model can write through the webhook without
  // changing the column it consumes from. See
  // .cycle/plans/stage-3-per-client-billing.md for the migration plan.
  `ALTER TABLE practiq.subscriptions ADD COLUMN IF NOT EXISTS tier TEXT`,
  `ALTER TABLE practiq.subscriptions ADD COLUMN IF NOT EXISTS client_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE practiq.subscriptions ADD COLUMN IF NOT EXISTS founding_locked_at TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS subscriptions_tier_status_idx ON practiq.subscriptions(tier, status)`,
  // Firm-wide credit pool. tokensRemaining is BIGINT so 50+ stacked
  // packs don't overflow. UNIQUE on stripe_payment_intent_id makes
  // webhook replay a no-op via upsert(where: ..., update: {}).
  `CREATE TABLE IF NOT EXISTS practiq.credits (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     tokens_remaining BIGINT NOT NULL,
     tokens_granted BIGINT NOT NULL,
     purchased_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
     stripe_payment_intent_id TEXT UNIQUE,
     stripe_price_id TEXT,
     stripe_checkout_session_id TEXT,
     created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS credits_user_id_purchased_at_idx ON practiq.credits(user_id, purchased_at)`,
  `CREATE INDEX IF NOT EXISTS credits_user_id_tokens_remaining_idx ON practiq.credits(user_id, tokens_remaining)`,
  // Subscription-quantity audit ledger. Written BEFORE the Stripe
  // subscriptionItems.update call so the local row is the ground
  // truth even if Stripe is unreachable. proration_amount_usd is
  // backfilled from the invoice.upcoming webhook.
  `CREATE TABLE IF NOT EXISTS practiq.client_billing_events (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     client_id TEXT,
     action TEXT NOT NULL,
     subscription_item_quantity INTEGER NOT NULL,
     proration_amount_usd NUMERIC(10, 4),
     stripe_subscription_item_id TEXT,
     occurred_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS client_billing_events_user_id_occurred_at_idx ON practiq.client_billing_events(user_id, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS client_billing_events_client_id_idx ON practiq.client_billing_events(client_id)`,
  // Credit-consumption idempotency ledger. source_key UNIQUE means a
  // retried LLM call (same ConversationMessage.id, AgentTask.id, etc.)
  // can never double-deduct credits. consumed_from carries an audit
  // trail of which Credit rows funded each consumption.
  `CREATE TABLE IF NOT EXISTS practiq.credit_ledger (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     source_key TEXT UNIQUE NOT NULL,
     source_kind TEXT NOT NULL,
     tokens INTEGER NOT NULL,
     consumed_from JSONB NOT NULL DEFAULT '[]',
     created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS credit_ledger_user_id_created_at_idx ON practiq.credit_ledger(user_id, created_at)`,
];

export async function POST(request: NextRequest) {
  const expected = (process.env.BOOTSTRAP_SECRET ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      { error: "BOOTSTRAP_SECRET not configured on the server" },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-bootstrap-secret") ?? "";
  if (provided.length === 0 || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: StatementResult[] = [];
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push({ sql, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ sql, ok: false, error: msg });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    {
      ok: allOk,
      results,
      hint: allOk
        ? "All ALTERs idempotent — re-running is safe."
        : "One or more statements failed. Read individual errors; non-existent extensions vs. permission issues need different fixes.",
    },
    { status: allOk ? 200 : 500 },
  );
}
