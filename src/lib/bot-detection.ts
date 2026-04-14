/**
 * Bot / crawler detection for SEO / AEO / GEO traffic tracking.
 *
 * Edge-runtime safe (no Node APIs).
 *
 * Categorization:
 *   seo      — traditional search engine crawlers (Google, Bing, Yandex, etc.)
 *   aeo      — AI-engine crawlers (GPT, Claude, Perplexity, Bytespider, etc.)
 *   geo      — generative-search opt-in crawlers (Google-Extended, Applebot-Extended)
 *   social   — link-preview crawlers (Twitter, Facebook, LinkedIn, Slack)
 *   seo_tool — SEO/marketing tools (Ahrefs, Semrush, MJ12, etc.)
 *   other    — anything else matching /bot|crawler|spider/
 */

export type BotCategory =
  | "seo"
  | "aeo"
  | "geo"
  | "social"
  | "seo_tool"
  | "other";

export interface BotDetectionResult {
  isBot: boolean;
  botName?: string;
  category?: BotCategory;
}

interface BotPattern {
  // Regex tested against the user-agent string (case-insensitive).
  pattern: RegExp;
  // Canonical bot name to record.
  name: string;
  category: BotCategory;
}

// Order matters: more specific patterns first.
const BOT_PATTERNS: BotPattern[] = [
  // ─── AEO (AI engines that crawl to answer user queries) ───────────────
  { pattern: /GPTBot\b/i, name: "GPTBot", category: "aeo" },
  { pattern: /ChatGPT-User\b/i, name: "ChatGPT-User", category: "aeo" },
  { pattern: /OAI-SearchBot\b/i, name: "OAI-SearchBot", category: "aeo" },
  { pattern: /ClaudeBot\b/i, name: "ClaudeBot", category: "aeo" },
  { pattern: /Claude-Web\b/i, name: "Claude-Web", category: "aeo" },
  { pattern: /Anthropic-AI\b/i, name: "Anthropic-AI", category: "aeo" },
  { pattern: /PerplexityBot\b/i, name: "PerplexityBot", category: "aeo" },
  { pattern: /Perplexity-User\b/i, name: "Perplexity-User", category: "aeo" },
  { pattern: /YouBot\b/i, name: "YouBot", category: "aeo" },
  { pattern: /Bytespider\b/i, name: "Bytespider", category: "aeo" },
  { pattern: /cohere-ai\b/i, name: "cohere-ai", category: "aeo" },
  { pattern: /MistralAI-User\b/i, name: "MistralAI", category: "aeo" },
  { pattern: /Diffbot\b/i, name: "Diffbot", category: "aeo" },
  { pattern: /Meta-ExternalAgent\b/i, name: "Meta-ExternalAgent", category: "aeo" },

  // ─── GEO (opt-in generative-search index crawlers) ────────────────────
  { pattern: /Google-Extended\b/i, name: "Google-Extended", category: "geo" },
  { pattern: /Applebot-Extended\b/i, name: "Applebot-Extended", category: "geo" },
  { pattern: /Amazonbot\b/i, name: "Amazonbot", category: "geo" },
  { pattern: /Meta-ExternalFetcher\b/i, name: "Meta-ExternalFetcher", category: "geo" },

  // ─── SEO (traditional search engine crawlers) ─────────────────────────
  // Googlebot variants — match before generic Google
  { pattern: /Googlebot-Image\b/i, name: "Googlebot-Image", category: "seo" },
  { pattern: /Googlebot-Video\b/i, name: "Googlebot-Video", category: "seo" },
  { pattern: /Googlebot-News\b/i, name: "Googlebot-News", category: "seo" },
  { pattern: /AdsBot-Google\b/i, name: "AdsBot-Google", category: "seo" },
  { pattern: /Mediapartners-Google\b/i, name: "Mediapartners-Google", category: "seo" },
  { pattern: /Storebot-Google\b/i, name: "Storebot-Google", category: "seo" },
  { pattern: /Googlebot\b/i, name: "Googlebot", category: "seo" },
  { pattern: /Google-InspectionTool\b/i, name: "Google-InspectionTool", category: "seo" },

  { pattern: /bingbot\b/i, name: "Bingbot", category: "seo" },
  { pattern: /BingPreview\b/i, name: "BingPreview", category: "seo" },
  { pattern: /msnbot\b/i, name: "MSNBot", category: "seo" },
  { pattern: /adidxbot\b/i, name: "AdIdxBot", category: "seo" },

  { pattern: /YandexBot\b/i, name: "YandexBot", category: "seo" },
  { pattern: /YandexImages\b/i, name: "YandexImages", category: "seo" },
  { pattern: /Yandex/i, name: "Yandex", category: "seo" },

  { pattern: /Baiduspider\b/i, name: "Baiduspider", category: "seo" },
  { pattern: /DuckDuckBot\b/i, name: "DuckDuckBot", category: "seo" },
  { pattern: /DuckDuckGo-Favicons-Bot\b/i, name: "DuckDuckGo", category: "seo" },
  { pattern: /Sogou\b/i, name: "Sogou", category: "seo" },
  { pattern: /Naver/i, name: "Naverbot", category: "seo" },
  { pattern: /SeznamBot\b/i, name: "SeznamBot", category: "seo" },
  { pattern: /Applebot\b/i, name: "Applebot", category: "seo" },
  { pattern: /Slurp\b/i, name: "YahooSlurp", category: "seo" },

  // ─── Social (link preview / unfurl bots) ──────────────────────────────
  { pattern: /Twitterbot\b/i, name: "Twitterbot", category: "social" },
  { pattern: /facebookexternalhit\b/i, name: "FacebookExternalHit", category: "social" },
  { pattern: /facebookcatalog\b/i, name: "FacebookCatalog", category: "social" },
  { pattern: /Facebot\b/i, name: "Facebot", category: "social" },
  { pattern: /LinkedInBot\b/i, name: "LinkedInBot", category: "social" },
  { pattern: /Slackbot\b/i, name: "Slackbot", category: "social" },
  { pattern: /Slack-ImgProxy\b/i, name: "Slack-ImgProxy", category: "social" },
  { pattern: /Discordbot\b/i, name: "Discordbot", category: "social" },
  { pattern: /TelegramBot\b/i, name: "TelegramBot", category: "social" },
  { pattern: /Pinterest/i, name: "Pinterest", category: "social" },
  { pattern: /WhatsApp\b/i, name: "WhatsApp", category: "social" },
  { pattern: /redditbot\b/i, name: "RedditBot", category: "social" },

  // ─── SEO tools (analytics crawlers — usually noisy) ───────────────────
  { pattern: /AhrefsBot\b/i, name: "AhrefsBot", category: "seo_tool" },
  { pattern: /AhrefsSiteAudit\b/i, name: "AhrefsSiteAudit", category: "seo_tool" },
  { pattern: /SemrushBot\b/i, name: "SemrushBot", category: "seo_tool" },
  { pattern: /MJ12bot\b/i, name: "MJ12bot", category: "seo_tool" },
  { pattern: /DotBot\b/i, name: "DotBot", category: "seo_tool" },
  { pattern: /PetalBot\b/i, name: "PetalBot", category: "seo_tool" },
  { pattern: /Screaming Frog SEO Spider/i, name: "ScreamingFrog", category: "seo_tool" },
  { pattern: /SiteAuditBot\b/i, name: "SiteAuditBot", category: "seo_tool" },
  { pattern: /MegaIndex\b/i, name: "MegaIndex", category: "seo_tool" },
  { pattern: /BLEXBot\b/i, name: "BLEXBot", category: "seo_tool" },
  { pattern: /SerpstatBot\b/i, name: "SerpstatBot", category: "seo_tool" },

  // ─── IndexNow / search engine submission related ──────────────────────
  { pattern: /IndexNow\b/i, name: "IndexNow", category: "seo" },
];

// Generic catch-all — must run AFTER the specific patterns above.
const GENERIC_BOT_RE = /(?:bot|crawler|spider|scraper|fetcher|monitor|preview)/i;

/**
 * Detect whether a user-agent string belongs to a known bot/crawler.
 * Returns the category and canonical name when matched.
 */
export function detectBot(userAgent: string | null | undefined): BotDetectionResult {
  if (!userAgent) {
    return { isBot: false };
  }

  for (const p of BOT_PATTERNS) {
    if (p.pattern.test(userAgent)) {
      return { isBot: true, botName: p.name, category: p.category };
    }
  }

  if (GENERIC_BOT_RE.test(userAgent)) {
    // Try to extract a token containing "bot" / "crawler" / "spider" so we
    // record something specific instead of "other".
    const m = userAgent.match(
      /([A-Za-z0-9.\-_/]+(?:bot|crawler|spider|scraper|fetcher|monitor|preview)[A-Za-z0-9.\-_/]*)/i
    );
    return {
      isBot: true,
      botName: m ? m[1] : "Unknown",
      category: "other",
    };
  }

  return { isBot: false };
}
