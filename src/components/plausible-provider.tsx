/**
 * Plausible Analytics — RUN 19 (OSS replacement for PostHog page analytics).
 *
 * Plausible is a privacy-friendly, GDPR-compliant, lightweight (<1KB gzipped)
 * page-analytics replacement for Google Analytics / PostHog page events.
 * Self-hostable (https://github.com/plausible/analytics, AGPL) or used via
 * the cloud at https://plausible.io.
 *
 * Why Plausible over PostHog:
 *   - 100% open source (AGPL); self-host on a single 1GB VPS for ~$5/mo.
 *   - No cookies, no PII, no tracker bloat — privacy-by-default.
 *   - Single script tag, no client SDK to maintain.
 *   - Native goal-conversion + funnels via the script's `data-domain` attr.
 *
 * Configuration: env-gated, opt-in. Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN to
 * the dashboard domain (e.g. `practiq.dev`). Optionally set
 * NEXT_PUBLIC_PLAUSIBLE_HOST to point at a self-hosted instance
 * (defaults to `https://plausible.io`). Both vars MUST use the
 * NEXT_PUBLIC_ prefix — these values ship to the browser.
 *
 * PostHog continues to coexist for the duration of the migration so we
 * don't lose the historical event stream while Plausible is verified.
 * Once Plausible's funnels prove out (~30 days of clean data) the
 * PostHog provider can be deleted.
 */
import Script from "next/script";

export function PlausibleProvider() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  const host =
    process.env.NEXT_PUBLIC_PLAUSIBLE_HOST?.trim() ?? "https://plausible.io";
  if (!domain) return null;
  // Plausible's hosted script is at `${host}/js/script.js` for Plausible
  // Cloud; self-hosted instances follow the same convention. The
  // `outbound-links` extension is loaded from the same path with a hyphen
  // suffix (script.outbound-links.js) — gives free outbound-click events
  // without instrumentation.
  const scriptUrl = `${host.replace(/\/$/, "")}/js/script.outbound-links.js`;
  return (
    <Script
      src={scriptUrl}
      data-domain={domain}
      strategy="afterInteractive"
      defer
    />
  );
}
