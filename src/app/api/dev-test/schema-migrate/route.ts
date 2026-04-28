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
