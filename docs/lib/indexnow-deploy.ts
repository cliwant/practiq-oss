/**
 * IndexNow ping — run as a Vercel post-deploy webhook (or GitHub Action on
 * `release` event) to notify Bing/Yandex/Seznam of new/updated docs pages.
 *
 * Setup (one-time):
 *   1. Generate a new key for practiq.dev/docs (different from practiq.dev's):
 *      node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"
 *      → e.g. "a3f2c7d8e1b4f9a2"
 *   2. Upload the key file to https://practiq.dev/docs/a3f2c7d8e1b4f9a2.txt
 *      with content = the same key string. Put it in public/ so Vercel serves it
 *      at the root.
 *   3. Set DOCS_INDEXNOW_KEY env var in Vercel to that value.
 *   4. Optionally set DOCS_INDEXNOW_KEY_LOCATION to override the URL (default
 *      below).
 *   5. Wire the deploy webhook (Vercel → Project Settings → Webhooks →
 *      Deployment Succeeded → POST to your /api/deploy-hook endpoint).
 */

interface IndexNowResult {
  ok: boolean;
  status: number;
  body: string;
}

const DOCS_KEY = process.env.DOCS_INDEXNOW_KEY ?? "";
const DOCS_HOST = process.env.DOCS_INDEXNOW_HOST ?? "practiq.dev/docs";
const DOCS_KEY_LOCATION =
  process.env.DOCS_INDEXNOW_KEY_LOCATION ??
  `https://${DOCS_HOST}/${DOCS_KEY}.txt`;

const DOCS_URLS = [
  `https://${DOCS_HOST}/`,
  `https://${DOCS_HOST}/quickstart`,
  `https://${DOCS_HOST}/self-host`,
  `https://${DOCS_HOST}/mcp-reference`,
  `https://${DOCS_HOST}/architecture`,
  `https://${DOCS_HOST}/cloud-vs-self-host`,
  `https://${DOCS_HOST}/why-oss`,
];

export async function pingIndexNow(
  urls: string[] = DOCS_URLS,
): Promise<IndexNowResult> {
  if (!DOCS_KEY) {
    return {
      ok: false,
      status: 0,
      body: "DOCS_INDEXNOW_KEY env var not set — skipping IndexNow ping",
    };
  }

  const batch = urls.slice(0, 10000);
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "practiq-docs-deploy/1.0",
    },
    body: JSON.stringify({
      host: DOCS_HOST,
      key: DOCS_KEY,
      keyLocation: DOCS_KEY_LOCATION,
      urlList: batch,
    }),
  });

  const body = res.ok ? "" : (await res.text()).slice(0, 500);
  return { ok: res.ok, status: res.status, body };
}

/**
 * Wire as a Next.js API route at app/api/deploy-hook/route.ts:
 *
 *   import { pingIndexNow } from "@/lib/indexnow-deploy";
 *   export async function POST(req: Request) {
 *     // Verify Vercel signature here (use VERCEL_DEPLOY_HOOK_SECRET)
 *     const result = await pingIndexNow();
 *     return Response.json(result);
 *   }
 *
 * Or as a GitHub Action step (.github/workflows/release.yml):
 *
 *   - name: IndexNow ping
 *     env:
 *       DOCS_INDEXNOW_KEY: ${{ secrets.DOCS_INDEXNOW_KEY }}
 *     run: |
 *       node -e "require('./lib/indexnow-deploy').pingIndexNow().then(r => console.log(r))"
 */
