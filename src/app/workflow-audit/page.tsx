import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/json-ld";
import { WorkflowAuditPage } from "@/components/workflow-audit/workflow-audit-page";

const TITLE = "AI Workflow Audit — Practiq";
const DESCRIPTION =
  "A 5-minute self-serve audit. Answer 8 questions about a recent engagement; receive a personalized diagnosis of where your AI workflow is dropping source, review state, client context, or handoff.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/workflow-audit` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/workflow-audit`,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Practiq",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <WorkflowAuditPage />;
}
