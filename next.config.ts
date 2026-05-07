import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Move the Next.js dev indicator out of the bottom-left corner where it
  // would visually conflict with our dashboard chrome (toasts, firm switcher
  // tooltips). This is a dev-only UI element — in production it's not rendered.
  devIndicators: {
    position: "bottom-right",
  },

  // The studio repo has a sibling lockfile at the monorepo root, which makes
  // Turbopack infer the wrong workspace root and silently fail to find
  // src/app/. Pin the root to this package so dev/build always resolve here.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Permanent redirects for legacy / alternate URLs that visitors may type
  // or that older marketing assets still link to. Each redirect is 308 so
  // search engines pass authority through (rather than indexing both URLs).
  async redirects() {
    return [
      // The homepage industry cards used to push to /dashboard before the
      // demo was renamed to /build-dashboard. Old screenshots, social
      // posts, and bookmarks still reference /dashboard, so we keep it
      // resolving rather than 408ing.
      {
        source: "/dashboard",
        destination: "/build-dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/build-dashboard/:path*",
        permanent: true,
      },
    ];
  },

  // Production-tier security headers applied to every response. Using
  // next.config.ts headers() rather than middleware so these land on
  // ALL routes — including statically generated pages, redirects,
  // and middleware short-circuit returns where wiring per-path was
  // brittle.
  //
  // What we set and why (from a 2026-04-29 production audit that
  // found `/`, `/login`, and `/api/users/me` only carrying HSTS):
  //
  //  - Content-Security-Policy: blocks XSS by restricting where
  //    scripts / styles / connections can come from. Tuned for
  //    Next.js 15 + Stripe Checkout + Resend webhook + Vercel
  //    Analytics + Plausible + Slack notify endpoints. 'unsafe-inline'
  //    on style-src is required by Next.js + Tailwind v4's hydration
  //    style injection; 'unsafe-eval' is excluded so the report-only
  //    path can catch any future regression. We use Report-Only on
  //    the hot paths first (Phase 5 will switch to enforce after a
  //    week of clean reports).
  //  - Strict-Transport-Security: already present (max-age=63072000)
  //    — kept and unified across response types.
  //  - X-Content-Type-Options: nosniff prevents MIME sniffing attacks.
  //  - X-Frame-Options: DENY prevents clickjacking against the
  //    authed dashboard. Stripe Checkout opens in same window via
  //    full nav so we don't need to allow iframe embed.
  //  - Referrer-Policy: strict-origin-when-cross-origin keeps the
  //    full URL in same-origin requests but only the origin on
  //    cross-origin (avoids leaking auth-stained URLs to third parties).
  //  - Permissions-Policy: opts out of microphone / camera / geolocation
  //    / payment by default. Stripe Checkout takes the user out of
  //    the app via redirect so we never need the payment permission.
  //  - X-DNS-Prefetch-Control / X-Permitted-Cross-Domain-Policies:
  //    minor hardening for legacy plugins.
  async headers() {
    const securityHeaders = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      // CSP — flipped from Report-Only to enforce on 2026-04-29 after
      // (a) the persona-journey 15-step spec passes against production
      // (Playwright respects CSP), and (b) the report endpoint has been
      // log-only for a week with no novel violations. The `report-uri`
      // directive stays so we still capture any edge case.
      //
      // To roll back: rename this header key to
      // `Content-Security-Policy-Report-Only`. The browser then logs
      // violations without blocking. No code change beyond the key.
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.vercel-analytics.com https://*.vercel-insights.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' https://api.stripe.com https://*.supabase.co https://*.vercel-analytics.com https://*.vercel-insights.com https://api.resend.com https://api.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io",
          "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
          "form-action 'self' https://checkout.stripe.com",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "upgrade-insecure-requests",
          // POST violation reports to /api/csp-report. The endpoint
          // de-duplicates and Slack-pings novel violations so we can
          // tighten the policy week-over-week. Modern browsers
          // honor `report-uri` even though `report-to` is the new
          // mechanism — keeping the legacy directive maximizes coverage.
          "report-uri /api/csp-report",
        ].join("; "),
      },
    ];

    return [
      {
        // Apply to every path. Next.js automatically deduplicates with
        // any per-route headers set by route handlers.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
