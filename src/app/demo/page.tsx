import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live demo — try Practiq without signing up",
  description:
    "A fully interactive tour of Practiq across 5 boutique firms — accounting, law, consulting, agency, and HR advisory. See how client-scoped AI memory feels before creating an account.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://practiq.dev/demo",
  },
};

/**
 * /demo — canonical public entry point for the interactive tour.
 *
 * Anonymous visitors get the full workspace UI across 5 synthetic
 * firms (Meridian Accounting, Chen Morgan LLP, North Arc Advisors,
 * Wildcard Studio, Lattice Partners HR). Every mutation action
 * surfaces a "Sign up to try" CTA that routes to /signup?next=/app.
 *
 * Implementation: forwards to the cycle-0 mockup dashboard which is
 * already a complete multi-firm demo with the tour banner enabled.
 * This keeps the demo assets in one place and avoids divergence
 * between landing screenshots and the interactive preview.
 */
export default function DemoEntry() {
  redirect("/build-dashboard?firm=meridian-accounting&view=home&tour=1");
}
