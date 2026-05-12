"use client";

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { trackClient } from "@/lib/analytics/track-client";

/**
 * Client-only CTA link used by the topic landing pages. Extracted out of
 * topic-landing-page.tsx so the page itself can stay a Server Component
 * — the page's static markup (hero, problem teardown, FAQ, sources) now
 * renders server-side and shows up in the initial HTML / curl, while
 * only the bits that genuinely need the browser (URLSearchParams,
 * onClick beacons, on-mount $pageview) stay as Client Components.
 *
 * Two variants share this file:
 *  - <TopicCtaLink> — the hero + bottom "Run the audit" anchor that
 *    forwards to /workflow-audit with SNS attribution query params
 *    captured from the current URL.
 *  - <TopicPageviewBeacon> — invisible component that fires the
 *    structured $pageview event on mount with landing_slug + lane/cta/
 *    fmt/v read from the URL.
 */

interface TopicCtaLinkProps {
  landingSlug: string;
  ctaType: "primary" | "secondary";
  label: string;
}

export function TopicCtaLink({
  landingSlug,
  ctaType,
  label,
}: TopicCtaLinkProps) {
  return (
    <a
      href={`/workflow-audit?landing_slug=${encodeURIComponent(
        landingSlug,
      )}&lane=practiq&topic=${encodeURIComponent(landingSlug)}`}
      onClick={() => {
        const sp =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams();
        trackClient({
          type: "sns_cta_clicked",
          properties: {
            landing_slug: landingSlug,
            cta_type: ctaType,
            cta: sp.get("cta"),
            destination: "/workflow-audit",
            lane: sp.get("lane") ?? "practiq",
            source_platform: sp.get("src"),
            source_post_id: sp.get("post"),
            campaign: sp.get("campaign"),
            topic: sp.get("topic") ?? landingSlug,
            fmt: sp.get("fmt"),
            v: sp.get("v"),
          },
        });
      }}
      className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
    >
      {label}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </a>
  );
}

interface TopicPageviewBeaconProps {
  landingSlug: string;
  landingVariant: string;
}

export function TopicPageviewBeacon({
  landingSlug,
  landingVariant,
}: TopicPageviewBeaconProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    trackClient({
      type: "$pageview",
      properties: {
        landing_slug: landingSlug,
        landing_variant: landingVariant,
        source_platform: sp.get("src"),
        source_post_id: sp.get("post"),
        campaign: sp.get("campaign"),
        topic: sp.get("topic") ?? landingSlug,
        lane: sp.get("lane") ?? "practiq",
        cta: sp.get("cta"),
        fmt: sp.get("fmt"),
        v: sp.get("v"),
      },
    });
  }, [landingSlug, landingVariant]);
  return null;
}
