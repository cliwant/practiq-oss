import type { Metadata } from "next";
import DemoClient from "./demo-client";

export const metadata: Metadata = {
  title: "Try Practiq in 60 seconds — live redline demo",
  description:
    "Feed Practiq a Word memo + your prior memos for that client. Get back a tracked-changes Word doc you accept or reject in Word, in your firm's voice. No signup.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://practiq.dev/demo",
  },
  openGraph: {
    title: "Try Practiq in 60 seconds",
    description:
      "Live redline demo. No signup. Tracked-changes Word doc in your firm's voice.",
    url: "https://practiq.dev/demo",
    type: "website",
  },
};

/**
 * /demo — public, anonymous, interactive "try the wedge" page.
 *
 * Cold-email recipients land here from the Apr/May 2026 boutique-CPA
 * outreach batch. They hit "Generate redline" on the pre-loaded Acme
 * Manufacturing scenario, wait ~30-60s, and download a tracked-changes
 * .docx that opens in Word with native ins/del markup. Optional BYO
 * upload below the result lets them try with their own draft.
 */
export default function DemoPage() {
  return <DemoClient />;
}
