import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move the Next.js dev indicator out of the bottom-left corner where it
  // would visually conflict with our dashboard chrome (toasts, firm switcher
  // tooltips). This is a dev-only UI element — in production it's not rendered.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
