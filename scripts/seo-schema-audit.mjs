#!/usr/bin/env node
/**
 * Schema audit — fetch each high-priority page, extract every
 * <script type="application/ld+json">, and validate the JSON.
 *
 * Validation passes if:
 *   - JSON parses without error
 *   - Top-level @context is "https://schema.org" or contains it
 *   - Top-level @type or @graph is present
 *
 * Run:
 *   BASE_URL=https://practiq.dev node scripts/seo-schema-audit.mjs
 *   BASE_URL=http://localhost:3000 node scripts/seo-schema-audit.mjs
 */

const BASE = process.env.BASE_URL || "https://practiq.dev";

const ROUTES = [
  "/",
  "/pricing",
  "/faq",
  "/blog",
  "/compare",
  "/for/accounting",
  "/for/law",
  "/for/consulting",
  "/for/hr",
  "/for/agency",
  "/founding-member",
  "/resources",
];

const SCRIPT_RE =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function validate(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, reason: `parse error: ${e.message}` };
  }
  const ctx = parsed["@context"];
  const ctxOk =
    typeof ctx === "string"
      ? ctx.includes("schema.org")
      : Array.isArray(ctx)
        ? ctx.some((c) => typeof c === "string" && c.includes("schema.org"))
        : ctx && typeof ctx === "object";
  if (!ctxOk) return { ok: false, reason: "missing/invalid @context" };
  const hasType = "@type" in parsed || "@graph" in parsed;
  if (!hasType) return { ok: false, reason: "missing @type and @graph" };
  return { ok: true, type: parsed["@type"] || "@graph" };
}

const results = [];
let totalBlocks = 0;
let totalOk = 0;

for (const route of ROUTES) {
  const url = `${BASE}${route}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      results.push({ route, status: res.status, blocks: [] });
      continue;
    }
    const html = await res.text();
    const blocks = [];
    let m;
    while ((m = SCRIPT_RE.exec(html)) !== null) {
      totalBlocks++;
      const v = validate(m[1].trim());
      if (v.ok) totalOk++;
      blocks.push(v);
    }
    results.push({ route, status: 200, blocks });
  } catch (err) {
    results.push({ route, error: err?.message || String(err), blocks: [] });
  }
}

console.log(`\nSchema audit @ ${BASE}`);
console.log("=".repeat(60));
for (const r of results) {
  const head = r.error
    ? `  ERR ${r.error}`
    : `  ${r.status}  blocks=${r.blocks.length}`;
  console.log(`${r.route}\n${head}`);
  for (const b of r.blocks) {
    if (b.ok) console.log(`    ok    @type=${b.type}`);
    else console.log(`    FAIL  ${b.reason}`);
  }
}
console.log("=".repeat(60));
console.log(`Total JSON-LD blocks: ${totalBlocks}`);
console.log(`Valid:                ${totalOk}`);
console.log(`Failed:               ${totalBlocks - totalOk}`);

process.exit(totalBlocks > 0 && totalOk === totalBlocks ? 0 : 1);
