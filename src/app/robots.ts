import type { MetadataRoute } from "next";

// Explicit per-UA allowlist.
// We welcome SEO + AEO + GEO crawlers with equal priority — every agent that
// might answer "what is a good practice management tool for a small accounting
// firm" should be able to discover and quote practiq.dev. Each UA gets its own
// rule so that no crawler interprets a `User-agent: *` fallback differently.
//
// - Standard search: the eight biggest crawlers that drive organic traffic.
// - AEO (answer engines): the crawlers LLM/search products use to read the
//   live web (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web,
//   Anthropic-AI, PerplexityBot, Perplexity-User, YouBot, Bytespider,
//   cohere-ai, MistralAI-User, Diffbot, Meta-ExternalAgent).
// - GEO (generative/training): opt-in bots that surface our content inside
//   Gemini / Apple Intelligence / Amazon Q / Meta AI answers
//   (Google-Extended, Applebot-Extended, Amazonbot, Meta-ExternalFetcher).
// - Social: the unfurlers used by every major chat/social app so that a
//   pasted practiq.dev link renders a rich preview card.
//
// Private surfaces (`/dashboard`, `/api/`, `/login`, `/signup`, `/admin`)
// are blocked for every agent — they carry authenticated or operational
// data that should never be indexed.
const DISALLOW = ["/dashboard", "/api/", "/login", "/signup", "/admin"];

const USER_AGENTS = [
  // ── Standard search ───────────────────────────────────────────────
  "Googlebot",
  "Bingbot",
  "YandexBot",
  "Baiduspider",
  "DuckDuckBot",
  "Applebot",

  // ── AEO / answer-engine crawlers ──────────────────────────────────
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "Anthropic-AI",
  "PerplexityBot",
  "Perplexity-User",
  "YouBot",
  "Bytespider",
  "cohere-ai",
  "MistralAI-User",
  "Diffbot",
  "Meta-ExternalAgent",

  // ── GEO / generative-training crawlers ────────────────────────────
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalFetcher",

  // ── Social unfurlers ──────────────────────────────────────────────
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "TelegramBot",
  "Pinterest",
  "WhatsApp",

  // ── Catch-all fallback ────────────────────────────────────────────
  "*",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: USER_AGENTS.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: DISALLOW,
    })),
    sitemap: "https://practiq.dev/sitemap.xml",
  };
}
