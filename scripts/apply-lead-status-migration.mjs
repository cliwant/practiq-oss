#!/usr/bin/env node

/**
 * Apply the practiq.lead_status migration via the Supabase Management
 * API. Mirrors apply-team-tier-migration.mjs — see CLAUDE.md "Schema
 * rescue path" for the rationale.
 *
 * Usage:
 *   node scripts/apply-lead-status-migration.mjs
 *
 * The script is idempotent; the SQL uses IF NOT EXISTS throughout.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", "..", "..", ".env.local");

const envRaw = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envRaw
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      let v = l.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, idx).trim(), v];
    }),
);

const accessToken = env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (!accessToken) {
  console.error("SUPABASE_ACCESS_TOKEN missing from .env.local");
  process.exit(1);
}
if (!supabaseUrl) {
  console.error("NEXT_PUBLIC_SUPABASE_URL missing from .env.local");
  process.exit(1);
}

const refMatch = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) {
  console.error(`Cannot parse project ref from ${supabaseUrl}`);
  process.exit(1);
}
const projectRef = refMatch[1];

const sqlPath = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260513000000_lead_status.sql",
);
const SQL = readFileSync(sqlPath, "utf8");

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
console.log(`POST ${endpoint}`);

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: SQL }),
});

const text = await res.text();
console.log(`Status: ${res.status}`);
console.log(text.slice(0, 4000));

if (!res.ok) {
  process.exit(1);
}
