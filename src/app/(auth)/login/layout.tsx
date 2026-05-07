import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in — Practiq",
  description:
    "Sign in to Practiq, the AI-Native Agent for boutique professional services firms.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
