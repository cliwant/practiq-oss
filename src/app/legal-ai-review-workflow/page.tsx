import type { Metadata } from "next";
import { TopicLandingPage } from "@/components/landing/topic-landing-page";
import { buildTopicMetadata } from "@/lib/seo/topic-landing-metadata";
import { TOPIC_LANDINGS } from "@/data/topic-landings";

const SLUG = "legal-ai-review-workflow";

export const metadata: Metadata = buildTopicMetadata(SLUG);

export default function Page() {
  return <TopicLandingPage topic={TOPIC_LANDINGS[SLUG]} />;
}
