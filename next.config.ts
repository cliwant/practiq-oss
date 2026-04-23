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
};

export default nextConfig;
