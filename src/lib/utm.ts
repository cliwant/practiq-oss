/**
 * UTM URL builder — appends utm_* query params to a base URL.
 *
 * Handles three kinds of inputs correctly:
 *   withUtm("/#cta", { source, medium, campaign })
 *     → "/?utm_source=...&utm_medium=...&utm_campaign=...#cta"
 *   withUtm("/page?x=1", { source, medium, campaign })
 *     → "/page?x=1&utm_source=...&utm_medium=...&utm_campaign=..."
 *   withUtm("/page?x=1#cta", { source, medium, campaign })
 *     → "/page?x=1&utm_source=...&utm_medium=...&utm_campaign=...#cta"
 *
 * Works for relative paths (e.g. "/#cta") and absolute URLs
 * (e.g. "https://practiq.dev/blog/slug") alike.
 */

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

export function withUtm(baseUrl: string, params: UtmParams): string {
  // Split off the hash fragment first — URLSearchParams + relative paths
  // don't play nicely with hashes, and we need to preserve it as-is.
  const hashIdx = baseUrl.indexOf("#");
  const hash = hashIdx >= 0 ? baseUrl.slice(hashIdx) : "";
  const pathAndQuery = hashIdx >= 0 ? baseUrl.slice(0, hashIdx) : baseUrl;

  const queryIdx = pathAndQuery.indexOf("?");
  const path = queryIdx >= 0 ? pathAndQuery.slice(0, queryIdx) : pathAndQuery;
  const existingQuery = queryIdx >= 0 ? pathAndQuery.slice(queryIdx + 1) : "";

  const search = new URLSearchParams(existingQuery);
  search.set("utm_source", params.source);
  search.set("utm_medium", params.medium);
  search.set("utm_campaign", params.campaign);
  if (params.content) search.set("utm_content", params.content);
  if (params.term) search.set("utm_term", params.term);

  const queryString = search.toString();
  return `${path}${queryString ? `?${queryString}` : ""}${hash}`;
}

export const BLOG_CTA_UTM = (slug: string): UtmParams => ({
  source: "blog",
  medium: "post_cta",
  campaign: slug,
});

export const BLOG_NEWSLETTER_UTM = (slug: string): UtmParams => ({
  source: "blog",
  medium: "newsletter_signup",
  campaign: slug,
});
