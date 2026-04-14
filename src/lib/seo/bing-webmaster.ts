/**
 * Bing Webmaster API client.
 *
 * Notes from 2026-04-14 diagnostic:
 *   - GetSites endpoint is deprecated (returns 404).
 *   - All working endpoints use:   https://ssl.bing.com/webmaster/api.svc/json/<Method>?apikey=<KEY>
 *   - SubmitUrl, GetCrawlStats, GetQueryStats, GetRankAndTrafficStats,
 *     GetUrlSubmissionQuota, GetUrlInfo all respond 200.
 *   - Site must be pre-verified in Bing Webmaster UI.
 *
 * Quota: 99 URL / day, 1699 URL / month (as of 2026-04-14).
 *
 * Env: BING_API_KEY
 */

export const SITE_URL = "https://practiq.dev/";

function getKey(): string {
  const k = process.env.BING_API_KEY?.trim();
  if (!k) throw new Error("BING_API_KEY env is missing");
  return k;
}

const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

async function bingGet<T>(method: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ apikey: getKey(), ...params }).toString();
  const res = await fetch(`${BASE}/${method}?${query}`, {
    headers: { "User-Agent": "practiq/1.0", Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bing ${method} ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { d: T };
  return json.d;
}

async function bingPost<T>(method: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/${method}?apikey=${getKey()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "practiq/1.0",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bing ${method} ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { d: T };
  return json.d;
}

// ───── Submission ─────

export async function submitUrl(url: string): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    await bingPost("SubmitUrl", { siteUrl: SITE_URL, url });
    return { ok: true, status: 200, body: "" };
  } catch (e) {
    const msg = (e as Error).message;
    const m = msg.match(/Bing SubmitUrl (\d+):/);
    return { ok: false, status: m ? parseInt(m[1], 10) : 0, body: msg };
  }
}

export async function submitUrlBatch(urls: string[]): Promise<{ ok: boolean; status: number; body: string }> {
  // Batch up to 500 per call per Bing docs.
  try {
    await bingPost("SubmitUrlBatch", { siteUrl: SITE_URL, urlList: urls });
    return { ok: true, status: 200, body: "" };
  } catch (e) {
    const msg = (e as Error).message;
    const m = msg.match(/Bing SubmitUrlBatch (\d+):/);
    return { ok: false, status: m ? parseInt(m[1], 10) : 0, body: msg };
  }
}

export async function getUrlSubmissionQuota(): Promise<{ daily: number; monthly: number }> {
  const d = await bingGet<{ DailyQuota: number; MonthlyQuota: number }>(
    "GetUrlSubmissionQuota",
    { siteUrl: SITE_URL }
  );
  return { daily: d.DailyQuota, monthly: d.MonthlyQuota };
}

// ───── Sitemap submission ─────

export async function submitFeed(feedUrl: string): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    await bingPost("SubmitFeed", { siteUrl: SITE_URL, feedUrl });
    return { ok: true, status: 200, body: "" };
  } catch (e) {
    const msg = (e as Error).message;
    const m = msg.match(/Bing SubmitFeed (\d+):/);
    return { ok: false, status: m ? parseInt(m[1], 10) : 0, body: msg };
  }
}

interface BingFeed {
  Url: string;
  Status: string;
  UrlCount: number;
  Submitted: string; // /Date(...)/
  LastCrawled: string; // /Date(...)/
  Compressed: boolean;
  FileSize: number;
}

export async function getFeeds(): Promise<BingFeed[]> {
  return await bingGet<BingFeed[]>("GetFeeds", { siteUrl: SITE_URL });
}

// ───── Analytics ─────

interface BingCrawlStat {
  Date: string;    // /Date(ms-offset)/
  CrawledPages: number;
  HttpStatus: number;
}

interface BingQueryStat {
  Query: string;
  Clicks: number;
  Impressions: number;
  Position: number; // avg position
  AvgClickPosition?: number;
  AvgImpressionPosition?: number;
}

interface BingRankStat {
  Date: string;
  Clicks: number;
  Impressions: number;
  AvgClickPosition: number;
  AvgImpressionPosition: number;
}

function parseBingDate(s: string): Date | null {
  // Bing returns /Date(1700000000000)/ or /Date(1700000000000-0800)/
  const m = s.match(/\/Date\((-?\d+)/);
  return m ? new Date(parseInt(m[1], 10)) : null;
}

export async function getCrawlStats(): Promise<BingCrawlStat[]> {
  return await bingGet<BingCrawlStat[]>("GetCrawlStats", { siteUrl: SITE_URL });
}

export async function getQueryStats(): Promise<BingQueryStat[]> {
  return await bingGet<BingQueryStat[]>("GetQueryStats", { siteUrl: SITE_URL });
}

export async function getRankAndTrafficStats(): Promise<BingRankStat[]> {
  return await bingGet<BingRankStat[]>("GetRankAndTrafficStats", { siteUrl: SITE_URL });
}

export { parseBingDate };
