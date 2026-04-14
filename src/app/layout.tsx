import type { Metadata } from "next";
import { Providers } from "@/components/providers";
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

// JSON-LD: Organization + WebSite. Helps Google build a knowledge panel,
// helps AEO/GEO crawlers (GPTBot, ClaudeBot, PerplexityBot) build a
// structured understanding of the brand, and powers sitelinks search box.
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
