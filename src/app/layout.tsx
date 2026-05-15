import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { AnalyticsPixels } from "@/components/analytics-pixels";
import { PlausibleProvider } from "@/components/plausible-provider";
import { ExitIntentPopup } from "@/components/landing/exit-intent-popup";
import { SocialProofToast } from "@/components/landing/social-proof-toast";
import "./globals.css";

// Self-hosted font loading via next/font/google. Replaces the prior
// `@import` from fonts.googleapis.com which was render-blocking (CSS →
// fonts.googleapis CSS → fonts.gstatic woff2 → text paint = 2.4s LCP
// chain on mobile). next/font/google self-hosts the woff2 on our origin,
// adds <link rel="preload"> + size-adjusted fallbacks automatically, and
// drops the cross-origin connection cost entirely. Measured ~710ms LCP
// improvement on the home surface (Lighthouse mobile, 2026-05-13).
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  preload: true,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  preload: false, // mono is only used in code blocks / data rows, not above the fold
});

export const metadata: Metadata = {
  metadataBase: new URL("https://practiq.dev"),
  title: {
    default: "Practiq — AI built around your clients, not your chats.",
    template: "%s | Practiq",
  },
  description:
    "Client-centric AI workspace for boutique professional services firms (accounting, law, HR, consulting, agency). Every conversation, file, and agent action lives inside a client workspace. Switch between 50 clients with zero context reload — because memory is scoped to the client, not the chat.",
  keywords: [
    "client-centric AI",
    "AI workspace for professional services",
    "multi-client AI agent",
    "AI practice management",
    "context switching elimination",
    "boutique firm software",
    "accounting firm AI",
    "law firm AI workspace",
    "consulting firm AI",
    "HR advisory AI",
    "agency client management AI",
    "AI bookkeeping workspace",
  ],
  authors: [{ name: "Cliwant, Inc." }],
  creator: "Cliwant, Inc.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://practiq.dev",
    siteName: "Practiq",
    title: "Practiq — AI built around your clients, not your chats.",
    description:
      "Client-centric AI workspace for boutique professional services firms. Memory lives on the client, not the conversation. Switch between 50 clients with zero context reload.",
    images: [
      {
        url: "/api/og/homepage",
        width: 1200,
        height: 630,
        alt: "Practiq — client-centric AI workspace for professional services firms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Practiq — AI built around your clients, not your chats.",
    description:
      "Client-centric AI workspace for boutique professional services firms.",
    images: ["/api/og/homepage"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Search-console site-verification — tokens read from env so operators
  // can rotate without a code change. Both no-op when unset.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  // Canonical for the home page. Nested routes override via their own
  // `alternates.canonical` in page-level metadata; this default covers `/`
  // and any route that doesn't set its own canonical (defensive).
  alternates: { canonical: "https://practiq.dev" },
};

// JSON-LD: Organization + WebSite + SoftwareApplication. Helps Google
// build a knowledge panel, helps AEO/GEO crawlers (GPTBot, ClaudeBot,
// PerplexityBot) build a structured understanding of the brand and the
// product, and qualifies Practiq for software-category rich results
// (pricing, operating system, application category).
const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://practiq.dev/#organization",
      name: "Practiq",
      legalName: "Cliwant, Inc.",
      url: "https://practiq.dev",
      logo: {
        "@type": "ImageObject",
        url: "https://practiq.dev/images/logo-512.png",
        width: 512,
        height: 512,
      },
      description:
        "Client-centric AI workspace for boutique professional services firms (2-20 people) managing 30-200 client relationships across accounting, law, consulting, HR, and marketing/agency verticals. Unlike chat-session AI agents, Practiq scopes memory to the client — every conversation, file, and agent action lives inside a client workspace.",
      foundingDate: "2026",
      slogan: "AI built around your clients, not your chats.",
      knowsAbout: [
        "Client-centric AI",
        "AI practice management",
        "Multi-client AI agent workspace",
        "Client-scoped agent memory",
        "Accounting firm AI",
        "Law firm AI workspace",
        "Consulting firm AI",
        "HR advisory AI",
        "Marketing agency AI",
        "Context switching elimination",
        "AI-native workspace",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hello@practiq.dev",
        url: "https://practiq.dev/contact",
        availableLanguage: ["en"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://practiq.dev/#website",
      url: "https://practiq.dev",
      name: "Practiq",
      description:
        "AI workspace for boutique professional services firms.",
      publisher: { "@id": "https://practiq.dev/#organization" },
      inLanguage: "en-US",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://practiq.dev/blog?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://practiq.dev/#software",
      name: "Practiq",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Client-Centric AI Workspace",
      operatingSystem: "Web",
      url: "https://practiq.dev",
      description:
        "Client-centric AI workspace for boutique professional services firms. Unlike chat-session AI agents (ChatGPT, Copilot) where memory is scoped to a conversation and vanishes when you close the thread, Practiq scopes memory to the client — every conversation, file, and agent action lives inside a dedicated client workspace. Switch between 50 clients with zero context reload.",
      publisher: { "@id": "https://practiq.dev/#organization" },
      // No `offers` field on the root-layout baseline entity. Per-page
      // `<JsonLd data={softwareApplicationJsonLd({ tier })} />` calls
      // emit their own offers with the canonical per-client pricing
      // (founding $10/client/mo, standard $15/client/mo). JSON-LD
      // parsers merge entities by `@id`, so the page-level offers win
      // unambiguously without colliding with a stale `price: "0"`
      // baseline. See ssr_jsonld_under_rsc + vs_jsonld_rsc_pattern
      // agent memory notes for the merge semantics.
      featureList: [
        "Client-centric memory architecture (conversations scoped to the client, not the chat)",
        "Dedicated workspace per client with complete history",
        "AI scans every client overnight and surfaces priorities",
        "One-click client switching with instant context load",
        "Ready-to-send deliverables in your firm's voice",
        "Shared team memory — knowledge stays when people leave",
        "Works across accounting, law, consulting, HR, and agency verticals",
      ],
      audience: {
        "@type": "Audience",
        audienceType:
          "Small professional services firms (2-20 people) managing 30-200 active client relationships",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetBrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
      </head>
      <body className="antialiased">
        {/* Skip-to-content link — visually hidden until keyboard focus.
            Lets keyboard / screen-reader users jump past the global nav
            and analytics scripts straight to the page's <main id="main">.
            Required for WCAG 2.4.1 Bypass Blocks. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-zinc-100 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-zinc-950 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to content
        </a>
        {/* RUN 19: Plausible OSS analytics (env-gated, no-op when
            NEXT_PUBLIC_PLAUSIBLE_DOMAIN unset). Replaces the bulk of
            what PostHog covered for page-level analytics with a
            privacy-friendly, GDPR-compliant, self-hostable script
            (~1KB). PostHog stays for the existing event funnels
            during the migration. */}
        <PlausibleProvider />
        <AnalyticsPixels />
        <ExitIntentPopup />
        <SocialProofToast />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
