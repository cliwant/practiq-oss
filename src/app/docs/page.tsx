import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Even though this page 308-redirects to the first docs article, we declare
// canonical + OG metadata here so that if the redirect is ever removed and
// we render a real docs index, canonical information is already in place.
// Crawlers following the redirect land on the real page and use its canonical.
export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Practiq documentation — guides, concepts, and reference for running a boutique professional services firm with shared team memory.",
  alternates: { canonical: "https://practiq.dev/docs" },
  openGraph: {
    title: "Documentation | Practiq",
    description:
      "Practiq documentation — guides, concepts, and reference for running a boutique professional services firm with shared team memory.",
    url: "https://practiq.dev/docs",
    type: "website",
  },
};

export default function DocsIndexPage() {
  redirect("/docs/getting-started/what-is-practiq");
}
