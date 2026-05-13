// Per-surface OG image registry. Each entry drives the dynamic
// /api/og/[slug] ImageResponse route so social shares of a given page
// unfurl with a bespoke card instead of the shared default
// /images/og-image.png. Visual system matches the existing
// /for/[vertical]/opengraph-image.tsx — dark zinc canvas, P-mark logo
// + Practiq wordmark, accent-colored uppercase badge, large headline.
//
// To add a new surface: append a slug here, then point that page's
// `openGraph.images` (+ `twitter.images`) at `/api/og/<slug>`.
//
// Accent palette mirrors the vertical-hub colors so the visual system
// reads as one across all surfaces.

export interface OgConfig {
  /** Uppercase badge text, top-right. Keep ≤ 28 chars. */
  badge: string;
  /** Headline copy, large bottom-left. 8-14 words is the sweet spot. */
  title: string;
  /** Optional sub-line below the headline. Used for blog post meta etc. */
  subtitle?: string;
  /** Pill background hex. */
  accentBg: string;
  /** Pill foreground hex. */
  accentFg: string;
}

const FALLBACK: OgConfig = {
  badge: "Practiq",
  title: "AI built around your clients, not your chats.",
  accentBg: "#1e3a8a",
  accentFg: "#93c5fd",
};

// Keys are URL-safe slugs used as the path segment for /api/og/<slug>.
// Each surface's metadata block points at /api/og/<key>.
const REGISTRY: Record<string, OgConfig> = {
  homepage: {
    badge: "Practiq",
    title: "AI built around your clients, not your chats.",
    subtitle: "Client-centric workspace for boutique professional services firms.",
    accentBg: "#1e3a8a",
    accentFg: "#93c5fd",
  },
  pricing: {
    badge: "Founding Member · 50% off",
    title: "From $49/mo. First 50 firms lock in the founding rate for life.",
    accentBg: "#064e3b",
    accentFg: "#6ee7b7",
  },
  "workflow-audit": {
    badge: "Free · 10-min audit",
    title: "LLM-generated workflow audit, operator-reviewed before it lands in your inbox.",
    accentBg: "#7c2d12",
    accentFg: "#fdba74",
  },
  "ai-policy-generator": {
    badge: "Free tool",
    title: "AI policy generator for boutique professional services firms.",
    accentBg: "#3b0764",
    accentFg: "#d8b4fe",
  },
  demo: {
    badge: "Sample firm · 50 clients",
    title: "Explore a fully-loaded Practiq workspace — no signup, no setup.",
    accentBg: "#831843",
    accentFg: "#f9a8d4",
  },
  "professional-services-ai-evidence-layer": {
    badge: "Topic landing",
    title: "An AI evidence layer for professional services firms that bill on judgment.",
    accentBg: "#1e3a8a",
    accentFg: "#93c5fd",
  },
  "legal-ai-review-workflow": {
    badge: "For legal teams",
    title: "The AI review workflow boutique law firms keep rebuilding by hand.",
    accentBg: "#1e3a8a",
    accentFg: "#93c5fd",
  },
  "client-context-memory": {
    badge: "Topic landing",
    title: "Client context memory built for firms that manage 50 relationships at once.",
    accentBg: "#064e3b",
    accentFg: "#6ee7b7",
  },
};

export function getOgConfig(slug: string): OgConfig {
  return REGISTRY[slug] ?? FALLBACK;
}

export function listOgSlugs(): string[] {
  return Object.keys(REGISTRY);
}
