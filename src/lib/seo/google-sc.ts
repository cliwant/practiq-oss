/**
 * Google Search Console + Indexing API client.
 *
 * Uses a Service Account (Node-only, crypto.sign RSA). Service-account email
 * must be added as Owner on the Search Console property.
 *
 * Scopes:
 *   - webmasters           (Search Console: sitemaps, analytics, URL inspection)
 *   - indexing             (Indexing API: submit URLs for immediate crawl)
 *
 * Env:
 *   GOOGLE_SERVICE_ACCOUNT_JSON   Single-line JSON of the service-account key.
 */
import crypto from "crypto";

export const SITE_URL = "https://practiq.dev/";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function base64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env is missing");
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("service account JSON missing client_email or private_key");
    }
    return parsed;
  } catch (e) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON parse error: " + (e as Error).message);
  }
}

// ───── Auth ─────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const sa = loadServiceAccount();
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const sig = base64url(
    crypto.sign("RSA-SHA256", Buffer.from(header + "." + claim), sa.private_key)
  );
  const jwt = `${header}.${claim}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Google token exchange failed: " + JSON.stringify(data));
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

// ───── Sitemaps ─────

export async function submitSitemap(sitemapUrl: string): Promise<{ ok: boolean; status: number; body: string }> {
  const token = await getAccessToken();
  const site = encodeURIComponent(SITE_URL);
  const sm = encodeURIComponent(sitemapUrl);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${site}/sitemaps/${sm}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, body: res.ok ? "" : (await res.text()).slice(0, 500) };
}

export async function listSitemaps(): Promise<unknown> {
  const token = await getAccessToken();
  const site = encodeURIComponent(SITE_URL);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${site}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
}

// ───── Indexing API ─────

export async function indexingNotify(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<{ ok: boolean; status: number; body: string }> {
  const token = await getAccessToken();
  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, type }),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? "" : (await res.text()).slice(0, 500) };
}

// ───── Search Analytics ─────

interface SearchAnalyticsRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Pull search analytics from Search Console.
 * dimensions: [] = aggregate site totals; ["query"] = per query; ["page"] = per page; ["query","page"] = both.
 */
export async function searchAnalytics(options: {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dimensions?: ("query" | "page" | "date" | "country" | "device")[];
  rowLimit?: number;
  startRow?: number;
}): Promise<SearchAnalyticsRow[]> {
  const token = await getAccessToken();
  const site = encodeURIComponent(SITE_URL);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: options.dimensions ?? [],
        rowLimit: options.rowLimit ?? 1000,
        startRow: options.startRow ?? 0,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`searchAnalytics ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.rows ?? [];
}

// ───── URL Inspection API ─────

export interface UrlInspectionResult {
  url: string;
  indexingState: string;
  pageFetchState: string;
  lastCrawlTime: string | null;
  verdict: string;
  robotsTxtState: string;
  coverageState: string;
}

/**
 * Inspect a URL via Google Search Console URL Inspection API.
 * Limit: 2,000 inspections/day per property.
 */
export async function inspectUrl(inspectionUrl: string): Promise<UrlInspectionResult> {
  const token = await getAccessToken();
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionUrl,
        siteUrl: SITE_URL,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`inspectUrl ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const result = data.inspectionResult?.indexStatusResult ?? {};
  return {
    url: inspectionUrl,
    indexingState: result.indexingState ?? "UNKNOWN",
    pageFetchState: result.pageFetchState ?? "UNKNOWN",
    lastCrawlTime: result.lastCrawlTime ?? null,
    verdict: result.verdict ?? "UNKNOWN",
    robotsTxtState: result.robotsTxtState ?? "UNKNOWN",
    coverageState: result.coverageState ?? "UNKNOWN",
  };
}
