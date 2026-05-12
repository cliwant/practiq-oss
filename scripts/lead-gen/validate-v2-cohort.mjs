#!/usr/bin/env node
/**
 * validate-v2-cohort.mjs
 *
 * Email-validation pre-check for the v2 cold-email cohort (Day18-Day34,
 * 2026-06-03 -> 2026-06-26). Prevents the Michigan CPA Batch 1 failure
 * pattern (0% reply rate, role-based addresses, hard bounces) from recurring.
 *
 * Pipeline (short-circuits on failure):
 *   1. Syntactic validity (regex)
 *   2. Role-based / disposable blacklist (built-in)
 *   3. Domain MX lookup (dns.promises.resolveMx)
 *   4. NeverBounce or ZeroBounce API (if key present in .env.local)
 *
 * Inputs:
 *   .cycle/marketing/lead-pipeline-v2/{cpa,law,hr,marketing}-output.jsonl
 *
 * Outputs:
 *   scripts/lead-gen/v2-validation-report.csv   (one row per contact)
 *   stdout summary table
 *
 * Idempotency:
 *   Re-running with the same inputs and an unchanged cache produces the
 *   same report. API calls are cached for 7 days in
 *   scripts/lead-gen/.api-cache.json (keyed by email + provider).
 *
 * Usage:
 *   node scripts/lead-gen/validate-v2-cohort.mjs              # full run
 *   node scripts/lead-gen/validate-v2-cohort.mjs --dry-run    # skip API, local-only
 *   node scripts/lead-gen/validate-v2-cohort.mjs --vertical=cpa   # filter to one vertical
 *
 * Env:
 *   NEVERBOUNCE_API_KEY   preferred provider
 *   ZEROBOUNCE_API_KEY    fallback provider
 *   (neither set -> api_result = "unchecked" for every row)
 *
 * Honest framing: this is operator tooling. No customer-facing copy.
 */

import { promises as fs } from "node:fs";
import { resolveMx } from "node:dns/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_DIR = __dirname;
const VENTURE_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const STUDIO_ROOT = path.resolve(VENTURE_ROOT, "..", "..");

const INPUT_DIR = path.join(
  VENTURE_ROOT,
  ".cycle",
  "marketing",
  "lead-pipeline-v2",
);
const VERTICAL_FILES = {
  cpa: "cpa-output.jsonl",
  law: "law-output.jsonl",
  hr: "hr-output.jsonl",
  marketing: "marketing-output.jsonl",
};

const REPORT_PATH = path.join(SCRIPT_DIR, "v2-validation-report.csv");
const CACHE_PATH = path.join(SCRIPT_DIR, ".api-cache.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// RFC-5322 inspired pragmatic regex — strict enough to catch typos, loose
// enough to allow plus-addressing and dotted local parts.
const EMAIL_RE =
  /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$/;

const ROLE_PREFIXES = new Set([
  "info", "admin", "contact", "support", "sales", "hello", "team",
  "help", "noreply", "no-reply", "marketing", "billing", "accounting",
  "office", "press", "media", "feedback", "service", "hr", "careers",
  "jobs", "abuse", "postmaster", "webmaster", "tech", "it", "ops",
]);

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com",
  "yopmail.com", "trashmail.com", "throwawaymail.com", "sharklasers.com",
  "getairmail.com", "dispostable.com", "fakeinbox.com", "maildrop.cc",
  "mailnesia.com", "mintemail.com", "mohmal.com", "tempr.email",
]);

const HIGH_SPAM_TLDS = new Set([".tk", ".ml", ".ga", ".cf", ".gq"]);

// --------------------------------------------------------------------------
// .env.local loader (studio-root master file)
// --------------------------------------------------------------------------

async function loadEnv() {
  // Studio-root .env.local is the single source of truth.
  const envPath = path.join(STUDIO_ROOT, ".env.local");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch {
    // .env.local missing is fine — fall through to "unchecked" mode.
  }
}

// --------------------------------------------------------------------------
// CLI args
// --------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { dryRun: false, vertical: null };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--vertical=")) out.vertical = a.slice(11).toLowerCase();
    else if (a === "--help" || a === "-h") out.help = true;
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// Cache (idempotency)
// --------------------------------------------------------------------------

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

function cacheKey(email, provider) {
  return `${provider}:${email.toLowerCase()}`;
}

function cacheFresh(entry) {
  if (!entry || !entry.ts) return false;
  return Date.now() - entry.ts < CACHE_TTL_MS;
}

// --------------------------------------------------------------------------
// Local checks
// --------------------------------------------------------------------------

function checkSyntactic(email) {
  if (!email || typeof email !== "string") return false;
  if (email.length > 254) return false;
  return EMAIL_RE.test(email.trim());
}

function checkRoleBased(email) {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  // Match exact role prefix OR role prefix followed by . or - (e.g. info.team, hr-uk).
  if (ROLE_PREFIXES.has(local)) return true;
  for (const role of ROLE_PREFIXES) {
    if (local === role) return true;
    if (local.startsWith(`${role}.`) || local.startsWith(`${role}-`)) return true;
  }
  return false;
}

function checkDisposable(email) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  for (const tld of HIGH_SPAM_TLDS) {
    if (domain.endsWith(tld)) return true;
  }
  return false;
}

// MX lookup cache (in-memory for the run — domains repeat across rows).
const mxMemo = new Map();
async function checkMx(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (mxMemo.has(domain)) return mxMemo.get(domain);
  try {
    const records = await resolveMx(domain);
    const ok = Array.isArray(records) && records.length > 0;
    mxMemo.set(domain, ok);
    return ok;
  } catch {
    mxMemo.set(domain, false);
    return false;
  }
}

// --------------------------------------------------------------------------
// API providers
// --------------------------------------------------------------------------

/**
 * Normalize a provider response to a common shape:
 *   { result: "valid"|"invalid"|"risky"|"catch-all"|"unknown", raw: <string> }
 */

async function callNeverBounce(email, apiKey) {
  const url = `https://api.neverbounce.com/v4/single/check?key=${encodeURIComponent(
    apiKey,
  )}&email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`NeverBounce HTTP ${res.status}`);
  const json = await res.json();
  // NeverBounce returns: { status, result, flags, ... }
  if (json.status && json.status !== "success") {
    throw new Error(`NeverBounce status=${json.status} ${json.message ?? ""}`);
  }
  const r = json.result;
  let result;
  switch (r) {
    case "valid":
      result = "valid";
      break;
    case "invalid":
    case "disposable":
      result = "invalid";
      break;
    case "catchall":
      result = "catch-all";
      break;
    case "unknown":
    case "accept_all":
      result = "risky";
      break;
    default:
      result = "unknown";
  }
  return { result, raw: r ?? "" };
}

async function callZeroBounce(email, apiKey) {
  const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(
    apiKey,
  )}&email=${encodeURIComponent(email)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ZeroBounce HTTP ${res.status}`);
  const json = await res.json();
  // ZeroBounce returns: { status: "valid"|"invalid"|"catch-all"|"unknown"|"spamtrap"|"abuse"|"do_not_mail", sub_status, ... }
  const s = json.status;
  let result;
  switch (s) {
    case "valid":
      result = "valid";
      break;
    case "invalid":
    case "spamtrap":
    case "abuse":
    case "do_not_mail":
      result = "invalid";
      break;
    case "catch-all":
      result = "catch-all";
      break;
    case "unknown":
      result = "risky";
      break;
    default:
      result = "unknown";
  }
  return { result, raw: s ?? "" };
}

// --------------------------------------------------------------------------
// Recommendation logic
// --------------------------------------------------------------------------

function recommend({ syntactic_valid, role_based, disposable, mx_valid, api_result }) {
  if (!syntactic_valid) return "skip";
  if (role_based) return "skip";
  if (disposable) return "skip";
  if (mx_valid === false) return "skip";
  if (api_result === "invalid") return "skip";
  if (api_result === "risky" || api_result === "catch-all" || api_result === "unknown") {
    return "flag-for-manual-review";
  }
  // api_result === "valid" OR "unchecked"
  return "send";
}

// --------------------------------------------------------------------------
// CSV helpers
// --------------------------------------------------------------------------

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(fields) {
  return fields.map(csvEscape).join(",");
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function readJsonl(p) {
  const raw = await fs.readFile(p, "utf8");
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch (e) {
      console.error(`Failed to parse JSONL line in ${p}: ${e.message}`);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      "Usage: node scripts/lead-gen/validate-v2-cohort.mjs [--dry-run] [--vertical=cpa|law|hr|marketing]",
    );
    return;
  }

  await loadEnv();

  const neverbounceKey = process.env.NEVERBOUNCE_API_KEY?.trim();
  const zerobounceKey = process.env.ZEROBOUNCE_API_KEY?.trim();

  let provider = "none";
  if (!args.dryRun) {
    if (neverbounceKey) provider = "neverbounce";
    else if (zerobounceKey) provider = "zerobounce";
  }

  const cache = await loadCache();

  // Collect contacts.
  const verticalsToLoad = args.vertical
    ? { [args.vertical]: VERTICAL_FILES[args.vertical] }
    : VERTICAL_FILES;
  if (args.vertical && !VERTICAL_FILES[args.vertical]) {
    console.error(
      `Unknown vertical: ${args.vertical}. Known: ${Object.keys(VERTICAL_FILES).join(", ")}`,
    );
    process.exit(2);
  }

  const contacts = [];
  for (const [vertical, file] of Object.entries(verticalsToLoad)) {
    const p = path.join(INPUT_DIR, file);
    const rows = await readJsonl(p);
    for (const row of rows) contacts.push({ vertical, row });
  }

  console.log(`Loaded ${contacts.length} contacts from ${Object.keys(verticalsToLoad).length} vertical file(s).`);
  console.log(
    `Provider: ${provider}${args.dryRun ? " (--dry-run forced no-api)" : ""}`,
  );

  // Process each contact.
  const reportRows = [];
  const summary = {
    total: 0,
    pass_all: 0,
    role_based: 0,
    disposable: 0,
    syntactic_fail: 0,
    mx_fail: 0,
    api_risky: 0,
    api_invalid: 0,
    unchecked_passed_local: 0,
  };

  for (const { vertical, row } of contacts) {
    summary.total += 1;
    const email = (row.contact_email ?? "").trim();
    const contact_name = row.contact_name ?? "";
    const firm_name = row.firm_name ?? "";

    const syntactic_valid = checkSyntactic(email);
    const role_based = syntactic_valid && checkRoleBased(email);
    const disposable = syntactic_valid && checkDisposable(email);

    let mx_valid = null;
    let api_result = "unchecked";
    let api_provider = "none";

    if (!syntactic_valid) {
      summary.syntactic_fail += 1;
    } else if (role_based) {
      summary.role_based += 1;
    } else if (disposable) {
      summary.disposable += 1;
    } else {
      mx_valid = await checkMx(email);
      if (!mx_valid) {
        summary.mx_fail += 1;
      } else if (provider !== "none") {
        api_provider = provider;
        // Cache lookup.
        const key = cacheKey(email, provider);
        const cached = cache[key];
        let apiCall;
        if (cacheFresh(cached)) {
          apiCall = { result: cached.result, raw: cached.raw, cached: true };
        } else {
          try {
            const res =
              provider === "neverbounce"
                ? await callNeverBounce(email, neverbounceKey)
                : await callZeroBounce(email, zerobounceKey);
            apiCall = { ...res, cached: false };
            cache[key] = { result: res.result, raw: res.raw, ts: Date.now() };
          } catch (e) {
            apiCall = { result: "unknown", raw: `error:${e.message}`, cached: false };
          }
        }
        api_result = apiCall.result;
        if (api_result === "invalid") summary.api_invalid += 1;
        else if (api_result === "risky" || api_result === "catch-all" || api_result === "unknown")
          summary.api_risky += 1;
      } else {
        // No API key — local checks passed.
        summary.unchecked_passed_local += 1;
      }
    }

    const recommendation = recommend({
      syntactic_valid,
      role_based,
      disposable,
      mx_valid,
      api_result,
    });

    if (recommendation === "send") summary.pass_all += 1;

    reportRows.push({
      vertical,
      contact_name,
      email,
      firm_name,
      syntactic_valid,
      role_based,
      disposable,
      mx_valid: mx_valid === null ? "" : mx_valid,
      api_result,
      api_provider,
      recommendation,
    });
  }

  // Persist API cache for next run.
  if (provider !== "none") await saveCache(cache);

  // Write CSV.
  const header = [
    "vertical",
    "contact_name",
    "email",
    "firm_name",
    "syntactic_valid",
    "role_based",
    "disposable",
    "mx_valid",
    "api_result",
    "api_provider",
    "recommendation",
  ];
  const lines = [csvRow(header)];
  for (const r of reportRows) {
    lines.push(
      csvRow([
        r.vertical,
        r.contact_name,
        r.email,
        r.firm_name,
        r.syntactic_valid,
        r.role_based,
        r.disposable,
        r.mx_valid,
        r.api_result,
        r.api_provider,
        r.recommendation,
      ]),
    );
  }
  await fs.writeFile(REPORT_PATH, lines.join("\n") + "\n", "utf8");

  // Stdout summary.
  const pad = (n) => String(n).padStart(3, " ");
  console.log("");
  console.log("================ Validation summary ================");
  console.log(`Total contacts:        ${pad(summary.total)}`);
  console.log(`Pass all checks:       ${pad(summary.pass_all)}   (safe to send)`);
  console.log(`Syntactic fail:        ${pad(summary.syntactic_fail)}   (skip)`);
  console.log(`Role-based:            ${pad(summary.role_based)}   (skip)`);
  console.log(`Disposable:            ${pad(summary.disposable)}   (skip)`);
  console.log(`MX fail:               ${pad(summary.mx_fail)}   (skip)`);
  if (provider !== "none") {
    console.log(`API risky/catch-all:   ${pad(summary.api_risky)}   (manual review)`);
    console.log(`API invalid:           ${pad(summary.api_invalid)}   (skip)`);
  } else {
    console.log(`Unchecked (local-pass):${pad(summary.unchecked_passed_local)}   (manual review or rerun with API key)`);
  }
  console.log("====================================================");
  console.log(`Report written: ${path.relative(VENTURE_ROOT, REPORT_PATH)}`);

  if (provider === "none" && !args.dryRun) {
    console.log("");
    console.log(
      "WARNING: No email-validation API key set. Run with NEVERBOUNCE_API_KEY",
    );
    console.log(
      "or ZEROBOUNCE_API_KEY in studio-root .env.local to get deliverability checks.",
    );
    console.log(
      "For now, only syntactic + role-based + disposable + MX checks were performed.",
    );
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
