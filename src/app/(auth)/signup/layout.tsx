import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — Practiq",
  description:
    "Create your Practiq account. Built for boutique professional services firms (2-20 person, 50-200 clients) — CPA, law, HR, consulting, agency.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
