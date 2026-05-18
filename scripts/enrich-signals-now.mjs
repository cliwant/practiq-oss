#!/usr/bin/env node
/**
 * Standalone web-enrichment driver.
 *
 * Reads master-signals.csv (or any signal-CSV), filters US rows with
 * firm_url, runs enrichBatch in parallel, and writes the converted
 * email-bearing rows back into a date-stamped target-list CSV.
 *
 * Designed for "I have 2519 signals sitting idle — let me convert as
 * many to emails as possible without re-scraping". Each signal is one
 * web fetch of the firm's contact/team/about pages plus regex extract.
 *
 *   node --env-file=../../.env.local scripts/enrich-signals-now.mjs
 *   node --env-file=../../.env.local scripts/enrich-signals-now.mjs --max=500
 *
 * Output: appends to target-list-{YYYY-MM-DD}-accounting.csv (which the
 * existing merge-all-sources.mjs picks up automatically).
 */
import * as fs from "node:fs/promises";
import * as fspath from "node:path";
import { enrichBatch, isLikelyUSLocation, isLikelyUSEmail } from "./discovery-sources/web-enrich.mjs";
import { CSV_COLUMNS } from "./discovery-sources/_shared.mjs";

const KIT = ".cycle/research/2026-05-17-customer-discovery-kit";
const SIGNALS = `${KIT}/master-signals.csv`;
const TODAY = new Date().toISOString().slice(0, 10);
const TARGET = `${KIT}/target-list-${TODAY}-accounting.csv`;

function parseCsvLine(line) {
  const cells = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === "," && !q) {
      cells.push(cur); cur = "";
    } else cur += c;
  }
  cells.push(cur);
  return cells;
}

function csvEscape(s) {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function parseCsv(text) {
  if (!text) return { headers: [], rows: [] };
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const cells = parseCsvLine(l);
    const obj = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = cells[i] ?? "";
    return obj;
  });
  return { headers, rows };
}

async function main() {
  const args = process.argv.slice(2);
  const maxArg = args.find((a) => a.startsWith("--max="));
  const max = maxArg ? parseInt(maxArg.slice("--max=".length), 10) : 800;
  const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
  const concurrency = concurrencyArg ? parseInt(concurrencyArg.slice("--concurrency=".length), 10) : 8;

  console.log(`📨 Web-enrich on master-signals.csv (max=${max}, concurrency=${concurrency})`);

  const text = await fs.readFile(SIGNALS, "utf-8");
  const { headers, rows } = parseCsv(text);
  console.log(`Read ${rows.length} signal rows`);

  // Filter: US-likely, has firm_url, no email yet
  const candidates = rows
    .filter((r) => r.firm_url && !r.email)
    .filter((r) => !r.location || isLikelyUSLocation(r.location))
    .slice(0, max);
  console.log(`Filtered to ${candidates.length} US firm-url-bearing candidates`);

  if (candidates.length === 0) {
    console.log("Nothing to enrich. Exiting.");
    return;
  }

  // Normalize shape for enrichBatch — it expects {firm_url, firm_name, contact_name, source_channel, ...}
  const signalRows = candidates.map((r) => ({
    ...r,
    // Provide any fields enrichBatch reads
  }));

  let start = Date.now();
  const { enriched, failures } = await enrichBatch(signalRows, concurrency);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✓ Enriched ${enriched.length} (${failures} failures) in ${elapsed}s`);

  if (enriched.length === 0) {
    console.log("No emails extracted. Exiting (no CSV update).");
    return;
  }

  // Append enriched rows to today's target-list CSV (or create if missing)
  let existingRows = [];
  let csvHeaders = CSV_COLUMNS;
  try {
    const existing = await fs.readFile(TARGET, "utf-8");
    const parsed = parseCsv(existing);
    csvHeaders = parsed.headers;
    existingRows = parsed.rows;
    console.log(`Existing target-list: ${existingRows.length} rows`);
  } catch {
    console.log(`New target-list will be created at ${TARGET}`);
  }

  // Dedup by email
  const byEmail = new Map();
  for (const r of existingRows) {
    if (r.email) byEmail.set(r.email.toLowerCase(), r);
  }
  let newCount = 0;
  for (const r of enriched) {
    if (!r.email) continue;
    if (!isLikelyUSEmail(r.email)) continue;
    const k = r.email.toLowerCase();
    if (byEmail.has(k)) continue;
    byEmail.set(k, r);
    newCount++;
  }
  console.log(`✓ ${newCount} new unique US emails to append`);

  // Write
  const lines = [csvHeaders.join(",")];
  for (const r of byEmail.values()) {
    lines.push(csvHeaders.map((h) => csvEscape(r[h] ?? "")).join(","));
  }
  await fs.writeFile(TARGET, lines.join("\n"));
  console.log(`✓ Wrote ${byEmail.size} total rows to ${fspath.basename(TARGET)}`);
}

main().catch((e) => {
  console.error("✗ enrich failed:", e.message);
  console.error(e.stack);
  process.exit(1);
});
