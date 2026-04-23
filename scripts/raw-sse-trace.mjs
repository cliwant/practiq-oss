#!/usr/bin/env node
/**
 * Capture raw bytes coming out of /api/chat to see exactly what SSE
 * frames the server produces. This bypasses the client parser so we
 * can rule in/out whether the server is actually sending deltas.
 */
import { chromium } from "playwright";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "[redacted-test-password]";
const base = process.env.BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Log raw bytes of the chat response.
page.on("response", async (resp) => {
  if (!resp.url().includes("/api/chat") || resp.request().method() !== "POST") return;
  // Wait briefly, then fetch the full body via resp.text() — Playwright
  // buffers the whole response.
  try {
    const body = await resp.text();
    console.log(`[raw] ${resp.url()}  status=${resp.status()}  bytes=${body.length}`);
    console.log(`[raw] body:\n---\n${body}\n---`);
  } catch (e) {
    console.log(`[raw] failed to read body: ${e.message}`);
  }
});

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login")).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);

// Find TechStart client id from cookies via a direct fetch
const clientsRes = await page.evaluate(async () => {
  const r = await fetch("/api/clients");
  return r.ok ? r.json() : [];
});
const techstart = (clientsRes.clients ?? clientsRes).find((c) =>
  /TechStart/.test(c.name),
);
if (!techstart) {
  console.error("[raw] no TechStart client found");
  process.exit(1);
}

console.log(`[raw] posting to /api/chat for ${techstart.name}`);
const postRes = await page.evaluate(async (clientId) => {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      message: `raw-trace-${Date.now()}: one-sentence status of this client`,
    }),
  });
  if (!r.ok || !r.body) return { ok: false, status: r.status };
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  return { ok: true, status: r.status, raw };
}, techstart.id);

console.log(`[raw] result: ok=${postRes.ok} status=${postRes.status}`);
if (postRes.raw) {
  console.log(`[raw] raw body:\n---\n${postRes.raw}\n---`);
  // Count frame types
  const frames = postRes.raw.split("\n\n").filter((s) => s.trim());
  const types = frames
    .map((f) => {
      try {
        return JSON.parse(f.replace(/^data:\s?/, "").trim()).type;
      } catch {
        return "parse-error";
      }
    })
    .join(", ");
  console.log(`[raw] frames=${frames.length}  types=[${types}]`);
}

await browser.close();
