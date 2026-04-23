/**
 * Standalone smoke test for the unified Claude provider.
 *
 * Goal: confirm that whichever provider `getClaudeProvider()` selects
 * (sdk or cli) actually streams tokens end-to-end. This bypasses auth
 * and the /api/chat HTTP layer — if this passes, the route layer works
 * because it's a thin wrapper over `provider.stream()`.
 *
 * Run:
 *   npx dotenv -o -e ../../.env.local -e .env -- npx tsx scripts/verify-claude-provider.ts
 *
 * Expected output:
 *   [provider] chosen=cli (or sdk)
 *   [stream] delta: "..."  (several times)
 *   [stream] done  tokens=in/out
 *   [complete] ok  len=N
 */
import { getClaudeProvider } from "@/lib/claude/provider";

async function main() {
  const provider = getClaudeProvider();
  console.log(`[provider] chosen=${provider.name}`);

  const req = {
    system:
      "You are a terse test harness. Reply with exactly one sentence acknowledging the context loaded.",
    messages: [
      {
        role: "user" as const,
        content:
          "Client: Kim's Restaurant (food service). Question: what is the core differentiator of a client-centric AI vs a chat-session AI? Answer in ONE sentence.",
      },
    ],
    maxTokens: 200,
  };

  console.log("[stream] starting...");
  let deltaCount = 0;
  let accumulated = "";
  for await (const ev of provider.stream(req)) {
    if (ev.type === "delta") {
      deltaCount++;
      accumulated += ev.text;
      if (deltaCount <= 5 || deltaCount % 10 === 0) {
        console.log(`[stream] delta #${deltaCount}: ${JSON.stringify(ev.text.slice(0, 80))}`);
      }
    } else if (ev.type === "done") {
      console.log(
        `[stream] done  deltas=${deltaCount}  text.length=${ev.text.length}  usage=${JSON.stringify(ev.usage ?? null)}`,
      );
      console.log(`[stream] full text:\n---\n${ev.text}\n---`);
    } else if (ev.type === "error") {
      console.error(`[stream] error: ${ev.error}`);
      process.exit(1);
    }
  }
  if (!accumulated.trim()) {
    console.error("[stream] FAIL: no deltas accumulated");
    process.exit(1);
  }

  console.log("[complete] starting one-shot...");
  const res = await provider.complete(req);
  console.log(
    `[complete] ok  len=${res.text.length}  in=${res.inputTokens ?? "?"} out=${res.outputTokens ?? "?"}`,
  );
  console.log(`[complete] text:\n---\n${res.text}\n---`);

  console.log("\n[verify-claude-provider] ALL GREEN");
}

main().catch((err) => {
  console.error("[verify-claude-provider] FAILED:", err);
  process.exit(1);
});
