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
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS dedup_key TEXT`,
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS usd_cost NUMERIC(10, 4)`,
  `ALTER TABLE practiq.agent_tasks ADD COLUMN IF NOT EXISTS agent_version TEXT`,
  `CREATE INDEX IF NOT EXISTS agent_tasks_user_id_dedup_key_status_idx ON practiq.agent_tasks(user_id, dedup_key, status)`,
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
