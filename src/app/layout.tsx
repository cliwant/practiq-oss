import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://firmem.com"),
  title: {
    default: "Firmem — Manage 50 clients with the memory of one.",
    template: "%s | Firmem",
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
    url: "https://firmem.com",
    siteName: "Firmem",
    title: "Firmem — Manage 50 clients with the memory of one.",
    description:
      "AI workspace for boutique professional services firms. Shared team memory, instant context switching, ready-to-send deliverables.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Firmem — AI workspace for professional services firms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Firmem — Manage 50 clients with the memory of one.",
    description:
      "AI workspace for boutique professional services firms.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
