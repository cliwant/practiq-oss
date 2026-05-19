#!/usr/bin/env node
/**
 * Convert partial-*.jsonl files to target-list/signals CSV format.
 *
 * Background: mega-sweep processes write rows incrementally to
 * partial-{date}-{vertical}.jsonl. When the process is killed (e.g. due
 * to Jina rate-limit stall), the final orchestrator steps (cross-ref,
 * dedup, CSV write) never run. This script recovers that data:
 *
 *   1. Reads each partial-*.jsonl
 *   2. Dedupes by (email || firm_name+location)
 *   3. Splits into target-list-{date}-{vertical}.csv (email-bearing) and
 *      signals-{date}-{vertical}.csv (signal-only)
 *   4. Only writes if the target-list CSV doesn't already exist (safer
 *      than overwriting a completed mega-sweep's curated output)
 *
 * Usage:
 *   node --env-file=../../.env.local scripts/partial-jsonl-to-csv.mjs
 */
import * as fs from "node:fs/promises";
import * as fspath from "node:path";
import { CSV_COLUMNS } from "./discovery-sources/_shared.mjs";

const KIT = ".cycle/research/2026-05-17-customer-discovery-kit";

function csvEscape(s) {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function rowsToCsv(rows) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of rows) lines.push(CSV_COLUMNS.map((c) => csvEscape(r[c] ?? "")).join(","));
  return lines.join("\n");
}

function rowKey(row) {
  if (row.email) return `email::${row.email.toLowerCase().trim()}`;
  const fn = (row.firm_name || "").toLowerCase().trim();
  const loc = (row.location || "").toLowerCase().trim().slice(0, 40);
  if (fn || loc) return `firm::${fn}::${loc}`;
  const cn = (row.contact_name || "").toLowerCase().trim();
  if (cn) return `contact::${cn}::${(row.source_channel || "").toLowerCase()}`;
  return null;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const files = await fs.readdir(KIT);
  const partials = files.filter((f) => /^partial-\d{4}-\d{2}-\d{2}-.*\.jsonl$/.test(f));
  console.log(`Found ${partials.length} partial JSONL files`);

  let totalRecovered = 0;
  let verticalsRecovered = 0;
  let verticalsSkipped = 0;

  for (const file of partials) {
    const match = file.match(/^partial-(\d{4}-\d{2}-\d{2})-(.+)\.jsonl$/);
    if (!match) continue;
    const [, date, vertical] = match;
    const targetCsv = `${KIT}/target-list-${date}-${vertical}.csv`;
    const signalsCsv = `${KIT}/signals-${date}-${vertical}.csv`;

    // Skip if target CSV already exists (don't clobber curated output)
    try {
      await fs.access(targetCsv);
      console.log(`  ⏭ ${vertical}: target-list already exists, skipping`);
      verticalsSkipped++;
      continue;
    } catch {}

    // Parse JSONL
    const path = fspath.join(KIT, file);
    const raw = await fs.readFile(path, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());
    const byKey = new Map();
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        // Strip meta fields
        delete obj._source;
        delete obj._ts;
        const k = rowKey(obj);
        if (!k) continue;
        if (byKey.has(k)) {
          // Merge — prefer non-empty values, union source_channel
          const existing = byKey.get(k);
          for (const f of CSV_COLUMNS) {
            if (obj[f] && (!existing[f] || existing[f].length < obj[f].length)) {
              existing[f] = obj[f];
            }
          }
          // Union source_channel
          const channels = new Set();
          for (const ch of (existing.source_channel || "").split(/\s*\|\s*/)) if (ch) channels.add(ch);
          for (const ch of (obj.source_channel || "").split(/\s*\|\s*/)) if (ch) channels.add(ch);
          existing.source_channel = [...channels].join(" | ");
        } else {
          byKey.set(k, obj);
        }
      } catch (e) {
        // Skip malformed lines (truncated JSON at EOF possible)
      }
    }

    // Split email-bearing vs signal-only
    const emailRows = [];
    const signalRows = [];
    for (const row of byKey.values()) {
      if (row.email) emailRows.push(row);
      else signalRows.push(row);
    }

    if (emailRows.length === 0 && signalRows.length === 0) {
      console.log(`  ⚠ ${vertical}: no valid rows`);
      continue;
    }

    if (emailRows.length > 0) {
      await fs.writeFile(targetCsv, rowsToCsv(emailRows));
    }
    if (signalRows.length > 0) {
      await fs.writeFile(signalsCsv, rowsToCsv(signalRows));
    }
    console.log(`  ✓ ${vertical}: emails=${emailRows.length} | signals=${signalRows.length}`);
    totalRecovered += emailRows.length + signalRows.length;
    verticalsRecovered++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Verticals recovered: ${verticalsRecovered}`);
  console.log(`  Verticals skipped:   ${verticalsSkipped}`);
  console.log(`  Total rows:          ${totalRecovered}`);
  console.log(`\nNext: node --env-file=../../.env.local scripts/merge-all-sources.mjs`);
}

main().catch((e) => {
  console.error("✗ partial-jsonl-to-csv failed:", e.message);
  console.error(e.stack);
  process.exit(1);
});
