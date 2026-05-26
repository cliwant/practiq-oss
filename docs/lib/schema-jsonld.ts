/**
 * schema.org JSON-LD generators for docs.practiq.dev
 *
 * Mount in Next.js root layout as <script type="application/ld+json"> so the
 * full graph emits server-side (no client hydration) — Lighthouse SEO ≥ 95.
 */

export const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Practiq",
  "url": "https://practiq.dev",
  "logo": "https://practiq.dev/logo.png",
  "sameAs": [
    "https://github.com/cliwant/practiq-oss",
    "https://www.npmjs.com/package/@cliwant/practiq-mcp",
    "https://twitter.com/practiq_dev"
  ],
  "founder": {
    "@type": "Organization",
    "name": "Cliwant",
    "url": "https://cliwant.com"
  }
} as const;

export const SOFTWARE_APP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Practiq",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Practice Management",
  "operatingSystem": "Web, macOS, Linux, Windows",
  "description":
    "Open-source AI-native practice management for boutique professional services firms (CPA, law, HR advisory, consulting, agency) managing 50-200 clients.",
  "url": "https://practiq.dev",
  "softwareVersion": "0.1.0",
  "license": "https://www.gnu.org/licenses/agpl-3.0.html",
  "offers": [
    {
      "@type": "Offer",
      "name": "Self-host (open source)",
      "price": "0",
      "priceCurrency": "USD",
      "description": "AGPL-3.0 self-host. Same features as cloud."
    },
    {
      "@type": "Offer",
      "name": "Cloud Starter",
      "price": "99",
      "priceCurrency": "USD",
      "billingPeriod": "P1M",
      "description": "Managed Postgres + backups + OAuth. 1-2 seats."
    },
    {
      "@type": "Offer",
      "name": "Cloud Team",
      "price": "499",
      "priceCurrency": "USD",
      "billingPeriod": "P1M",
      "description": "5 seats + team RBAC + audit log retention."
    },
    {
      "@type": "Offer",
      "name": "Cloud Pro",
      "price": "999",
      "priceCurrency": "USD",
      "billingPeriod": "P1M",
      "description": "10 seats + single-tenant deploy option + SOC2 docs."
    }
  ],
  "aggregateRating": undefined  // populate after launch when we have real reviews
} as const;

/**
 * HowTo schema for the Quickstart page. AEO-friendly: AI Overviews extract
 * `step` arrays and present them as "How to install Practiq" answers.
 */
export const QUICKSTART_HOWTO_JSONLD = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to install Practiq MCP in Claude Desktop",
  "description":
    "Install the @cliwant/practiq-mcp server in Claude Desktop / Claude Code / Cursor in under 60 seconds. BYOK — bring your own OpenRouter or Anthropic key.",
  "totalTime": "PT1M",
  "estimatedCost": { "@type": "MonetaryAmount", "currency": "USD", "value": "0" },
  "tool": [
    { "@type": "HowToTool", "name": "Node.js 20+" },
    { "@type": "HowToTool", "name": "Claude Desktop (or Claude Code / Cursor)" }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "name": "Verify Node 20+",
      "text": "Run `node -v`. Output should be 20.x.x or higher.",
      "url": "https://docs.practiq.dev/quickstart#node"
    },
    {
      "@type": "HowToStep",
      "name": "Open Claude Desktop config",
      "text":
        "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json. Windows: %APPDATA%\\Claude\\claude_desktop_config.json.",
      "url": "https://docs.practiq.dev/quickstart#claude-desktop"
    },
    {
      "@type": "HowToStep",
      "name": "Add Practiq MCP server entry",
      "text":
        'Add { "mcpServers": { "practiq": { "command": "npx", "args": ["-y", "@cliwant/practiq-mcp"] } } } to the config.',
      "url": "https://docs.practiq.dev/quickstart#mcp-config"
    },
    {
      "@type": "HowToStep",
      "name": "Restart Claude Desktop",
      "text": "Fully quit and re-open Claude Desktop. The Practiq MCP server is now available.",
      "url": "https://docs.practiq.dev/quickstart#restart"
    },
    {
      "@type": "HowToStep",
      "name": "Try the first prompt",
      "text":
        "Ask Claude: 'Good morning, what do I need to focus on today?' — Practiq reads your local ~/.practiq/ JSON files and returns a prioritized briefing.",
      "url": "https://docs.practiq.dev/quickstart#first-prompt"
    }
  ]
} as const;

/**
 * FAQPage schema for the Cloud vs Self-host page. AEO-friendly: AI Overviews
 * cite FAQ pages directly. Each Q/A pair is structured so a single answer can
 * be quoted verbatim by Perplexity / ChatGPT / Google AI Overviews.
 */
export const CLOUD_VS_SELFHOST_FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Are there any features in Practiq Cloud that are not in the open source self-host?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text":
          "No. Practiq is permanently AGPL-3.0. Every feature on practiq.dev cloud also ships in the open source repo — including the 10 MCP tools, the approval queue, Stripe billing integration, and multi-tenant SSO. The cloud sells managed Postgres, automated backups, OAuth provisioning, and an uptime SLA — not premium features."
      }
    },
    {
      "@type": "Question",
      "name": "Why AGPL-3.0 instead of MIT or Apache?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text":
          "AGPL-3.0 protects against a competing hosted SaaS being launched on top of Practiq's code without contributing back. For SMB B2B practice management, AGPL is not friction for buyers — your firm using Practiq internally is fine; the network-use clause only triggers if you turn Practiq into a competing hosted product. We chose AGPL specifically because Cal.com's 2026 re-license to closed-source caused a 391-point critical HN thread within 24 hours; AGPL is the safer permanent commitment."
      }
    },
    {
      "@type": "Question",
      "name": "Can I self-host Practiq for free, forever?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text":
          "Yes. The docker-compose.yml in the repo runs on a $5/month VPS. There is no telemetry on by default, no license key, no time limit, no usage cap. AGPL-3.0 only requires that if you modify Practiq and serve it as a hosted product to others, you publish your changes."
      }
    },
    {
      "@type": "Question",
      "name": "What is BYOK and why does Practiq use it?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text":
          "BYOK stands for 'bring your own key.' Practiq does not run an LLM gateway in the open source server. You provide your OpenRouter or Anthropic API key, and Practiq sends LLM calls directly to that provider on your behalf. Your API spend goes to your account, not to Practiq. This avoids cloud-LLM lock-in and keeps your client data outside Practiq's infrastructure when self-hosted."
      }
    },
    {
      "@type": "Question",
      "name": "What if I want to switch from Practiq Cloud to self-host (or vice versa)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text":
          "Same Postgres schema, same Next.js app. The cloud export is a standard pg_dump file you import into your self-host Postgres. No vendor lock-in — that's the point of permanent AGPL-3.0."
      }
    }
  ]
} as const;

/**
 * Helper to emit JSON-LD inside a Next.js layout.tsx server component.
 *
 * Usage:
 *   <script
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APP_JSONLD) }}
 *   />
 *
 * Safe — these are server-rendered constants, not user input.
 */
export function jsonLdScript(jsonld: object): { __html: string } {
  return { __html: JSON.stringify(jsonld) };
}
