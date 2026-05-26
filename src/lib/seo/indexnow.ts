/**
 * IndexNow client — push to Bing, Yandex, Seznam (all IndexNow partners)
 * in one call. We've had this integrated since the bot-tracking deploy.
 *
 * The IndexNow "key" is NOT a secret — by protocol design it must be public at
 * https://<host>/<key>.txt for ownership verification. We move it to env so
 * self-hosters can use their own key + host without forking, and so gitleaks
 * stops flagging it as a generic-api-key false positive.
 */

const KEY = process.env.INDEXNOW_KEY ?? "practiq76081581";
const HOST = process.env.INDEXNOW_HOST ?? "practiq.dev";
const KEY_LOCATION =
  process.env.INDEXNOW_KEY_LOCATION ?? `https://${HOST}/${KEY}.txt`;

export async function indexNowSubmit(
  urlList: string[]
): Promise<{ ok: boolean; status: number; body: string }> {
  if (urlList.length === 0) return { ok: true, status: 200, body: "" };
  // IndexNow spec caps at 10,000 URLs per request.
  const batch = urlList.slice(0, 10000);
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "practiq-deploy/1.0",
    },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch }),
  });
  const body = res.ok ? "" : (await res.text()).slice(0, 500);
  return { ok: res.ok, status: res.status, body };
}
