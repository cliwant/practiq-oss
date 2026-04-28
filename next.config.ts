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
      // resolving rather than 404ing.
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
};

export default nextConfig;
