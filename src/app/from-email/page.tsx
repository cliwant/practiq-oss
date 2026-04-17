import type { Metadata } from "next";
import { FromEmailClient } from "./from-email-client";

export const metadata: Metadata = {
  title: "Practiq — for firms past the 75-client ceiling",
  description:
    "AI-native context layer for small professional services firms. Manages multi-client context so partners stop losing 3+ hours/day to context reconstruction.",
  robots: { index: false, follow: false },
};

export default function FromEmailPage() {
  return <FromEmailClient />;
}
