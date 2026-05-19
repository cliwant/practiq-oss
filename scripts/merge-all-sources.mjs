#!/usr/bin/env node
/**
 * Master union+dedup script.
 *
 * Reads EVERY artifact we've ever produced + every git-history version
 * of the target-list / signals CSVs and merges them into one canonical
 * inventory file, preserving:
 *
 *   - Per-row source provenance (multi-source rows get all source_channels
 *     concatenated with ` | ` so we know every source that surfaced them)
 *   - All raw data files (this script READS them; it never deletes or
 *     overwrites the historical artifacts)
 *   - Person-named vs role-based classification (separate columns)
 *
 * Output:
 *   .cycle/research/2026-05-17-customer-discovery-kit/master-inventory.csv
 *   .cycle/research/2026-05-17-customer-discovery-kit/master-signals.csv
 *
 *   node scripts/merge-all-sources.mjs
 */
import * as fs from "node:fs/promises";
import * as fspath from "node:path";
import { spawnSync } from "node:child_process";

const KIT = ".cycle/research/2026-05-17-customer-discovery-kit";
const OUT_INVENTORY = `${KIT}/master-inventory.csv`;
const OUT_SIGNALS = `${KIT}/master-signals.csv`;
const OUT_STATS = `${KIT}/master-inventory-stats.md`;

const ROLE_PREFIXES = new Set([
  "info", "hello", "contact", "admin", "office", "team", "support",
  "noreply", "no-reply", "donotreply", "marketing", "sales",
  "service", "help", "billing", "accounts", "general", "inquiry",
  "inquiries", "feedback", "press", "media", "media-inquiries",
  "ar", "ap", "hr", "careers", "jobs", "recruiting", "abuse",
  "privacy", "legal", "webmaster", "postmaster",
  "ask", "success", "membership", "welcome", "partners",
  "customerservice", "information", "email",
]);

const NON_US_TLDS = new Set([
  "uk", "co.uk", "de", "fr", "es", "it", "nl", "be", "se", "no", "fi",
  "dk", "ie", "pt", "ch", "at", "pl", "cz", "gr", "hu", "ro", "bg",
  "lt", "lv", "ee", "is", "lu", "li", "mc", "mt", "cy", "eu",
  "cn", "jp", "kr", "in", "id", "th", "vn", "ph", "my", "sg", "hk",
  "tw", "au", "nz", "lk", "bd", "pk",
  "ae", "sa", "il", "tr", "ir", "qa", "kw",
  "ca", "mx", "br", "ar", "cl", "co", "pe", "ve",
  "za", "ng", "ke", "eg", "ma", "gh",
  "ru", "ua", "by", "kz",
]);

/**
 * A row is "person-named" iff:
 *   1. email-local is not in ROLE_PREFIXES (info@, admin@, etc.)
 *   2. contact_name has at least two alpha tokens (e.g. "Carla McCall")
 *
 * Prior versions only checked (1) and produced inflated counts —
 * "Cold-mail-eligible: 1,920" while the actual personalize-able
 * inventory was 27. See stage 1 audit (2026-05-19).
 *
 * `contactName` is optional for backwards compatibility — if omitted,
 * we conservatively return false (no rendering of "Hi ,").
 */
function isPersonNamed(email, contactName) {
  if (!email || !email.includes("@")) return false;
  const local = email.split("@")[0].toLowerCase();
  if (ROLE_PREFIXES.has(local)) return false;
  if (!contactName || typeof contactName !== "string") return false;
  const tokens = contactName.trim().split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length < 2) return false;
  return tokens.every((t) => /^[A-Za-z][A-Za-z'.\-]+$/.test(t));
}

function isUSEmail(email) {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1].toLowerCase();
  const parts = domain.split(".");
  const lastTwo = parts.slice(-2).join(".");
  const lastOne = parts.slice(-1)[0];
  return !NON_US_TLDS.has(lastTwo) && !NON_US_TLDS.has(lastOne);
}

// ─── CSV parsing ──────────────────────────────────────────────────────
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

// ─── Sources ──────────────────────────────────────────────────────────
async function listKitFiles() {
  try {
    return await fs.readdir(KIT);
  } catch { return []; }
}

function gitLog(rel) {
  const r = spawnSync("git", ["log", "--pretty=format:%H", "--", rel], { encoding: "utf-8" });
  if (r.status !== 0) return [];
  return r.stdout.trim().split("\n").filter(Boolean);
}

function gitShow(commit, rel) {
  const r = spawnSync("git", ["show", `${commit}:${rel}`], { encoding: "utf-8" });
  return r.status === 0 ? r.stdout : null;
}

// ─── Merge logic ──────────────────────────────────────────────────────
// Key by lowercased email when present, else firm_name+location.
function rowKey(row) {
  if (row.email) return `email::${row.email.toLowerCase().trim()}`;
  const fn = (row.firm_name || "").toLowerCase().trim();
  const loc = (row.location || "").toLowerCase().trim().slice(0, 40);
  if (fn || loc) return `firm::${fn}::${loc}`;
  const cn = (row.contact_name || "").toLowerCase().trim();
  if (cn) return `contact::${cn}::${(row.source_channel || "").toLowerCase()}`;
  return null;
}

function mergeRows(a, b) {
  // Prefer non-empty values from either; concat source_channel
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] && (!out[k] || out[k].length < b[k].length)) {
      out[k] = b[k];
    }
  }
  // Source channel: union (preserve provenance)
  const channels = new Set();
  for (const ch of (a.source_channel || "").split(/\s*\|\s*/)) if (ch) channels.add(ch);
  for (const ch of (b.source_channel || "").split(/\s*\|\s*/)) if (ch) channels.add(ch);
  out.source_channel = [...channels].join(" | ");
  return out;
}

async function main() {
  console.log("\n📦 Master union+dedup\n");

  const byKey = new Map();
  let totalIn = 0;
  let headerCols = null;

  // 1. Current working-tree CSVs
  const files = await listKitFiles();
  const csvFiles = files.filter((f) => /^(target-list|signals)-.*\.csv$/.test(f));
  console.log(`Reading ${csvFiles.length} current CSV files...`);
  for (const f of csvFiles) {
    try {
      const txt = await fs.readFile(fspath.join(KIT, f), "utf-8");
      const { headers, rows } = parseCsv(txt);
      if (!headerCols && headers.length) headerCols = headers;
      totalIn += rows.length;
      for (const r of rows) {
        const k = rowKey(r);
        if (!k) continue;
        if (byKey.has(k)) byKey.set(k, mergeRows(byKey.get(k), r));
        else byKey.set(k, r);
      }
    } catch {}
  }

  // 2. Historical versions from git — dynamic discovery
  //
  // Prior version hard-coded two files (target-list-2026-05-18-accounting.csv,
  // signals-2026-05-18-accounting.csv) and missed every other date/vertical.
  // When the operator ran a mega-sweep on a new vertical (e.g. law, healthcare,
  // speaker_bureau) the prior-day's signal data would silently disappear from
  // the master inventory because the new sweep overwrote that day's CSV in the
  // working tree and the git history of that file was never consulted.
  //
  // This block discovers every committed target-list-*.csv and signals-*.csv
  // under KIT via `git log --all --name-only`, then replays each commit's
  // version through the same dedup/merge pipeline.
  const histRes = spawnSync("git", [
    "log", "--all", "--name-only", "--pretty=format:", "--",
    `${KIT}/target-list-*.csv`, `${KIT}/signals-*.csv`,
  ], { encoding: "utf-8" });
  const historicalFiles = new Set();
  if (histRes.status === 0) {
    for (const f of histRes.stdout.split(/\r?\n/).filter(Boolean)) {
      if (/(target-list|signals)-.*\.csv$/.test(f)) historicalFiles.add(f);
    }
  }
  console.log(`\nReading git history for ${historicalFiles.size} discovered file paths...`);
  for (const rel of historicalFiles) {
    const commits = gitLog(rel);
    if (commits.length === 0) continue;
    console.log(`  ${fspath.basename(rel)}: ${commits.length} historical commits`);
    for (const c of commits) {
      const txt = gitShow(c, rel);
      if (!txt) continue;
      const { headers, rows } = parseCsv(txt);
      if (!headerCols && headers.length) headerCols = headers;
      totalIn += rows.length;
      for (const r of rows) {
        const k = rowKey(r);
        if (!k) continue;
        if (byKey.has(k)) byKey.set(k, mergeRows(byKey.get(k), r));
        else byKey.set(k, r);
      }
    }
  }

  // 3. Outreach drafts + sent + role-review JSON
  for (const dir of ["outreach-drafts", "outreach-sent", "outreach-role-review"]) {
    const path = fspath.join(KIT, dir);
    try {
      const jsonFiles = (await fs.readdir(path)).filter((f) => f.endsWith(".json"));
      console.log(`  ${dir}: ${jsonFiles.length} draft files`);
      for (const f of jsonFiles) {
        try {
          const raw = await fs.readFile(fspath.join(path, f), "utf-8");
          const d = JSON.parse(raw);
          if (!d.email_address) continue;
          const row = {
            firm_name: d.firm_name || "",
            contact_name: d.contact_name || "",
            role: d.role || "",
            email: d.email_address.toLowerCase(),
            vertical: d.vertical || "",
            location: d.location || "",
            firm_url: d.firm_url || "",
            personalization_note: d.personalization_note || d.notes || "",
            source_channel: `drafted_${dir.replace("outreach-", "")}`,
          };
          totalIn++;
          const k = rowKey(row);
          if (k) {
            if (byKey.has(k)) byKey.set(k, mergeRows(byKey.get(k), row));
            else byKey.set(k, row);
          }
        } catch {}
      }
    } catch {}
  }

  console.log(`\nMerged ${totalIn} input rows → ${byKey.size} unique rows\n`);

  // 4. Classify + split
  if (!headerCols || headerCols.length === 0) {
    headerCols = [
      "firm_name", "contact_name", "role", "vertical", "location",
      "team_size", "client_count_estimate", "email", "linkedin_url",
      "linkedin_snippet", "firm_url", "firm_snippet", "source_channel",
      "personalization_note", "outreach_status", "outreach_date",
      "reply_status", "reply_date", "interview_date", "pilot_status",
      "pilot_outcome",
    ];
  }
  // Ensure our extra columns are appended
  for (const extra of ["is_us_email", "is_person_named", "n_sources"]) {
    if (!headerCols.includes(extra)) headerCols.push(extra);
  }

  const inventoryRows = [];
  const signalRows = [];
  let personUS = 0, personNonUS = 0, roleUS = 0, roleNonUS = 0, signal = 0;

  for (const row of byKey.values()) {
    const hasEmail = !!row.email;
    if (hasEmail) {
      row.is_us_email = isUSEmail(row.email) ? "true" : "false";
      row.is_person_named = isPersonNamed(row.email, row.contact_name) ? "true" : "false";
      row.n_sources = String((row.source_channel || "").split("|").length);
      inventoryRows.push(row);
      if (row.is_us_email === "true" && row.is_person_named === "true") personUS++;
      else if (row.is_us_email === "true") roleUS++;
      else if (row.is_person_named === "true") personNonUS++;
      else roleNonUS++;
    } else {
      row.is_us_email = "";
      row.is_person_named = "";
      row.n_sources = String((row.source_channel || "").split("|").length);
      signalRows.push(row);
      signal++;
    }
  }

  // 5. Write outputs
  function writeCsv(rows, path) {
    const lines = [headerCols.join(",")];
    for (const r of rows) lines.push(headerCols.map((h) => csvEscape(r[h] ?? "")).join(","));
    return fs.writeFile(path, lines.join("\n"));
  }
  await writeCsv(inventoryRows, OUT_INVENTORY);
  await writeCsv(signalRows, OUT_SIGNALS);

  // 6. Stats file
  const stats = [
    `# Master Inventory Stats`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Totals`,
    `- Input rows processed: **${totalIn}**`,
    `- Unique after dedup:   **${byKey.size}**`,
    `- Email-bearing:        **${inventoryRows.length}** → \`master-inventory.csv\``,
    `- Signal-only:          **${signalRows.length}** → \`master-signals.csv\``,
    ``,
    `## Email-bearing breakdown`,
    `- US + person-named (cold-mail eligible):   **${personUS}** 🎯`,
    `- US + role-based (manual outreach):         **${roleUS}**`,
    `- Non-US + person-named:                     **${personNonUS}**`,
    `- Non-US + role-based:                       **${roleNonUS}**`,
    ``,
    `## Source coverage`,
  ];
  const sourceCounts = {};
  for (const r of [...inventoryRows, ...signalRows]) {
    for (const ch of (r.source_channel || "").split(/\s*\|\s*/)) {
      if (!ch) continue;
      const key = ch.split(":")[0].split("+")[0];
      sourceCounts[key] = (sourceCounts[key] || 0) + 1;
    }
  }
  const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  for (const [src, n] of sortedSources.slice(0, 50)) {
    stats.push(`- ${src.padEnd(30)} ${n}`);
  }
  if (sortedSources.length > 50) stats.push(`- ... (${sortedSources.length - 50} more sources)`);
  await fs.writeFile(OUT_STATS, stats.join("\n"));

  console.log(`✓ master-inventory.csv:  ${inventoryRows.length} email-bearing`);
  console.log(`✓ master-signals.csv:    ${signalRows.length} signal-only`);
  console.log(`✓ master-inventory-stats.md`);
  console.log(``);
  console.log(`🎯 Cold-mail eligible (US person-named): ${personUS}`);
  console.log(`   At week-4 cap=20/day, that's ${Math.ceil(personUS / 20)} send-days of inventory.`);
}

main().catch((e) => {
  console.error("✗ merge failed:", e.message);
  console.error(e.stack);
  process.exit(1);
});
