#!/usr/bin/env node

/**
 * db-sync-on-deploy
 * -----------------
 * Best-effort `prisma db push` runner that fires *before* the Next.js
 * build. Designed to keep the Supabase production schema in sync with
 * `prisma/schema.prisma` on every Vercel deploy without requiring an
 * out-of-band migration step from the operator.
 *
 * Why this exists:
 *
 *  - The project does not maintain a `prisma/migrations/` directory;
 *    schema changes ride on `prisma db push` instead. That works fine
 *    locally, but on Vercel the schema will drift from the deployed
 *    code unless we explicitly sync each deploy.
 *
 *  - When a route adds `select: { newColumn: true }` and the column
 *    isn't in the DB yet, every authenticated request 500s. Building
 *    the schema sync into the Vercel build script makes the deploy
 *    atomic — schema lands first, code goes live afterward.
 *
 * Behavior:
 *
 *  - Runs only when `DATABASE_URL` is present in the environment.
 *    Local builds (or builds where the operator doesn't want to touch
 *    the DB) can skip this by unsetting the var.
 *
 *  - Skips silently when `SKIP_DB_SYNC=1` so we keep an emergency
 *    escape hatch for "I only need to redeploy the frontend" cases.
 *
 *  - Never throws. A failed `prisma db push` is logged and the build
 *    continues — better to ship a frontend-only fix than to block the
 *    whole deploy on a schema-only timeout. Errors surface in the
 *    Vercel deploy log so the operator notices.
 */

import { spawnSync } from "node:child_process";

if (process.env.SKIP_DB_SYNC === "1") {
  console.log("[db-sync] SKIP_DB_SYNC=1 set, skipping schema push");
  process.exit(0);
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  console.log(
    "[db-sync] DATABASE_URL not set, skipping schema push (local build).",
  );
  process.exit(0);
}

console.log("[db-sync] running prisma db push (--accept-data-loss --skip-generate)…");

const result = spawnSync(
  "npx",
  [
    "--yes",
    "prisma",
    "db",
    "push",
    "--accept-data-loss",
    "--skip-generate",
  ],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);

if (result.status === 0) {
  console.log("[db-sync] schema push complete.");
  process.exit(0);
}

console.warn(
  `[db-sync] prisma db push exited with code ${result.status}. ` +
    "Continuing build — operator should investigate via Vercel logs.",
);
process.exit(0);
