import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AnalyticsPixels } from "@/components/analytics-pixels";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://practiq.dev"),
  title: {
    default: "Practiq — Manage 50 clients with the memory of one.",
    template: "%s | Practiq",
  },
  description:
    "AI workspace for boutique professional services firms. Manage 50–200 client relationships with shared team memory, instant context switching, and ready-to-send deliverables.",
  keywords: [
    "AI accounting software",
    "client management software",
    "professional services workspace",
    "multi-client management",
    "context switching",
    "AI workspace",
    "CPA software",
    "law firm software",
    "consulting firm tools",
    "bookkeeping AI",
    "small firm management",
  ],
  authors: [{ name: "Cliwant, Inc." }],
  creator: "Cliwant, Inc.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://practiq.dev",
    siteName: "Practiq",
    title: "Practiq — Manage 50 clients with the memory of one.",
    description:
      "AI workspace for boutique professional services firms. Shared team memory, instant context switching, ready-to-send deliverables.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Practiq — AI workspace for professional services firms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Practiq — Manage 50 clients with the memory of one.",
    description:
      "AI workspace for boutique professional services firms.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
        "AI workspace for boutique professional services firms (2-20 people) managing 30-200 client relationships across accounting, law, consulting, HR, and marketing/agency verticals.",
      foundingDate: "2026",
      slogan: "Manage 50 clients with the memory of one.",
      knowsAbout: [
        "Practice management software",
        "Multi-client workspace",
        "AI workspace",
        "Accounting firm software",
        "Law firm software",
        "Consulting firm software",
        "HR advisory software",
        "Marketing agency software",
        "Client relationship management",
        "Context switching reduction",
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
      applicationSubCategory: "Practice Management Software",
      operatingSystem: "Web",
      url: "https://practiq.dev",
      description:
        "AI workspace for boutique professional services firms. Each client gets a dedicated workspace storing complete history; an AI assistant scans every client overnight and surfaces what needs attention each morning.",
      publisher: { "@id": "https://practiq.dev/#organization" },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/PreOrder",
        description: "Early access — join the waitlist.",
        url: "https://practiq.dev/#cta",
      },
      featureList: [
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
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
      </head>
      <body className="antialiased">
        <AnalyticsPixels />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
