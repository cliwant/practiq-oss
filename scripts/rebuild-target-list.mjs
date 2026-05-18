#!/usr/bin/env node
/**
 * Rebuild the canonical target-list-*.csv by unioning ALL historical
 * versions found in git history, deduping by email, and writing one
 * combined CSV.
 *
 * Why: each discovery:source run with the same date+vertical overwrites
 * the file. Without this rescue, batches 1 (157 emails) and 2 (112) are
 * lost when batch 3 starts at the same date. This script recovers the
 * full union across all prior commits + current working tree + any
 * outreach-drafts / outreach-sent emails.
 *
 *   node --env-file=../../.env.local scripts/rebuild-target-list.mjs
 *
 * Outputs the rebuilt CSV in place. Older committed versions remain
 * accessible via git for audit.
 */
import * as fs from "node:fs/promises";
import * as fspath from "node:path";
import { spawnSync } from "node:child_process";

const KIT = ".cycle/research/2026-05-17-customer-discovery-kit";
const TODAY = new Date().toISOString().slice(0, 10);
const TARGET = `${KIT}/target-list-${TODAY}-accounting.csv`;
const DRAFTS = `${KIT}/outreach-drafts`;
const SENT = `${KIT}/outreach-sent`;
const ROLE_REVIEW = `${KIT}/outreach-role-review`;

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
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

function getGitCommitsForFile(rel) {
  const r = spawnSync("git", ["log", "--pretty=format:%H", "--", rel], { encoding: "utf-8" });
  if (r.status !== 0) return [];
  return r.stdout.trim().split("\n").filter(Boolean);
}

function gitShowFile(commit, rel) {
  const r = spawnSync("git", ["show", `${commit}:${rel}`], { encoding: "utf-8" });
  if (r.status !== 0) return null;
  return r.stdout;
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

async function readDraftEmails(dir) {
  const out = [];
  try {
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(fspath.join(dir, f), "utf-8");
      const d = JSON.parse(raw);
      if (d.email_address) out.push({
        email: d.email_address.toLowerCase(),
        firm_name: d.firm_name ?? "",
        contact_name: d.contact_name ?? "",
        source: `recovered_${fspath.basename(dir)}`,
      });
    }
  } catch {}
  return out;
}

async function main() {
  // 1. Collect every historical version of any target-list CSV
  const allCsvCandidates = new Set();
  try {
    const kitFiles = await fs.readdir(KIT);
    for (const f of kitFiles) {
      if (/^target-list-.*-accounting\.csv$/.test(f)) {
        allCsvCandidates.add(`${KIT}/${f}`);
      }
    }
  } catch {}

  // Git log of the canonical filename even if file currently absent
  const commits = getGitCommitsForFile(TARGET);
  console.log(`📚 Found ${commits.length} historical commits for ${fspath.basename(TARGET)}`);

  const byEmail = new Map();
  let headerCols = null;

  // 2. Pull every historical version
  for (const csvPath of allCsvCandidates) {
    try {
      const txt = await fs.readFile(csvPath, "utf-8");
      const { headers, rows } = parseCsv(txt);
      if (!headerCols && headers.length) headerCols = headers;
      for (const r of rows) {
        if (r.email && !byEmail.has(r.email.toLowerCase())) {
          byEmail.set(r.email.toLowerCase(), r);
        }
      }
    } catch {}
  }
  for (const c of commits) {
    const txt = gitShowFile(c, TARGET);
    if (!txt) continue;
    const { headers, rows } = parseCsv(txt);
    if (!headerCols && headers.length) headerCols = headers;
    for (const r of rows) {
      if (r.email && !byEmail.has(r.email.toLowerCase())) {
        byEmail.set(r.email.toLowerCase(), r);
      }
    }
  }

  // 3. Also harvest emails from existing drafts + sent + role-review
  for (const dir of [DRAFTS, SENT, ROLE_REVIEW]) {
    const found = await readDraftEmails(dir);
    for (const f of found) {
      if (!byEmail.has(f.email)) {
        // create a minimal row stub
        const stub = {};
        if (headerCols) for (const h of headerCols) stub[h] = "";
        stub.email = f.email;
        stub.firm_name = f.firm_name;
        stub.contact_name = f.contact_name;
        stub.source_channel = f.source;
        stub.vertical = "accounting";
        byEmail.set(f.email, stub);
      }
    }
  }

  if (!headerCols) {
    console.error("✗ No CSV header found — cannot rebuild");
    process.exit(1);
  }

  // 4. Write combined CSV
  const lines = [headerCols.join(",")];
  for (const row of byEmail.values()) {
    lines.push(headerCols.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  await fs.writeFile(TARGET, lines.join("\n"));
  console.log(`✓ Wrote ${byEmail.size} unique emails to ${fspath.basename(TARGET)}`);

  // 5. Print a summary
  const ROLE = new Set([
    "info","hello","contact","admin","office","team","support",
    "noreply","no-reply","donotreply","marketing","sales","service",
    "help","billing","accounts","general","inquiry","inquiries",
    "feedback","press","media","ar","ap","hr","careers","jobs",
    "recruiting","abuse","privacy","legal","webmaster","postmaster",
    "ask","success","membership","welcome","partners","customerservice",
    "information","email",
  ]);
  let person = 0, role = 0;
  for (const e of byEmail.keys()) {
    if (ROLE.has(e.split("@")[0])) role++;
    else person++;
  }
  console.log(`  Person-named: ${person}  Role-based: ${role}  TOTAL: ${byEmail.size}`);
}

main().catch((e) => {
  console.error("✗ rebuild failed:", e.message);
  process.exit(1);
});
