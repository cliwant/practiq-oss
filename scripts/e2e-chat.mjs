#!/usr/bin/env node
/**
 * End-to-end chat validation: open a client, send a message, confirm
 * the AI streams a response back. This is the heartbeat of the
 * per-client agent experience.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "[redacted-test-password]";
const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Capture page errors + relevant console logs for debugging.
page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error" || /chat|sse|stream|parse/i.test(text)) {
    console.log(`[browser.${msg.type()}] ${text.slice(0, 300)}`);
  }
});

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
if (!page.url().includes("/app")) await page.goto(`${base}/app`);
await page.waitForTimeout(1500);

console.log("[chat] opening TechStart Inc.");
await page.locator('aside').getByText(/TechStart Inc\./).first().click();
await page.waitForTimeout(1500);

// Open the Chat tab
console.log("[chat] switching to Chat tab");
await page.getByRole("tab", { name: /chat/i }).or(page.getByRole("link", { name: /chat/i })).or(page.getByText(/^Chat/).first()).click({ timeout: 5_000 }).catch(async () => {
  await page.getByText(/Chat/).first().click();
});
await page.waitForTimeout(2000);

// Find the chat message input by placeholder — the sidebar has its own
// "search clients" input which appears first in the DOM, so we must be
// explicit or we end up typing into the wrong box.
const input = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Message"], textarea').last();
await input.waitFor({ state: "visible", timeout: 10_000 });
console.log("[chat] typing message into chat input");
await input.click();
// Use a unique-ish prompt each run so Claude doesn't see 8 identical
// priors in the conversation history and protest that the user is
// spamming. Real users don't re-send the same message 8 times; this
// is a test-only artifact.
await input.fill(
  `[t=${new Date().toISOString()}] Summarize what you know about this client in exactly one sentence, starting with the client's name.`,
);

// Submit — try Ctrl+Enter, then Enter, then any visible send button.
const respPromise = page.waitForResponse(
  (r) => r.url().includes("/api/chat") && r.request().method() === "POST",
  { timeout: 180_000 },
);

const sendButton = page.getByRole("button", { name: /send|submit|ask/i }).last();
if (await sendButton.count()) {
  await sendButton.click().catch(() => {});
} else {
  await input.press("Control+Enter").catch(() => {});
  await input.press("Enter").catch(() => {});
}

console.log("[chat] waiting for /api/chat response...");
const resp = await respPromise.catch((e) => {
  console.error(`[chat] no response: ${e.message}`);
  return null;
});
if (resp) console.log(`[chat] response status ${resp.status()}`);

// Wait for the LATEST agent bubble to stop saying "Thinking...".
// The fallback path takes ~45s (stall timeout) + ~1s (DB refetch).
// Poll up to 120s past that to be safe.
console.log("[chat] waiting for streamed response text...");
const deadline = Date.now() + 180_000;
let lastPrefix = "";
while (Date.now() < deadline) {
  await page.waitForTimeout(2000);
  const lastBubble = await page
    .locator("li")
    .filter({ hasText: /agent/i })
    .last()
    .innerText()
    .catch(() => "");
  // Strip the header lines ("TechStart Inc. agent\nApr 23, 12:37 PM\n") to
  // get the actual body text.
  const lines = lastBubble.split("\n").map((s) => s.trim()).filter(Boolean);
  const body = lines.slice(2).join(" ").trim();
  if (body.length > 20 && !/^thinking…?$/i.test(body)) {
    console.log(`[chat] response arrived (${body.length} chars)`);
    lastPrefix = body;
    break;
  }
}
console.log(`[chat] final visible body: ${lastPrefix.slice(0, 240)}`);

await page.screenshot({ path: ".debug/chat.png", fullPage: false });
console.log("[chat] saved .debug/chat.png");
await page.screenshot({ path: ".debug/chat-full.png", fullPage: true });

// Extract the latest assistant bubble text to confirm the stream
// actually rendered into the UI (not just "Thinking...").
const lastAssistant = await page
  .locator("li")
  .filter({ hasText: /agent/i })
  .last()
  .innerText()
  .catch(() => "(no assistant bubble)");
console.log(`[chat] last assistant bubble:\n---\n${lastAssistant.slice(0, 600)}\n---`);

await browser.close();
