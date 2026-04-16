/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { MessageCircle, Mail, Shield, Briefcase } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Practiq",
  description: "How to reach Practiq — early access, press, privacy, security.",
  alternates: { canonical: "https://practiq.dev/contact" },
};

const CONTACT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: "https://practiq.dev/contact",
  name: "Contact Practiq",
  mainEntity: { "@id": "https://practiq.dev/#organization" },
};

interface Channel {
  title: string;
  email: string;
  hint: string;
  icon: React.ReactNode;
  accent: string;
}

const CHANNELS: Channel[] = [
  {
    title: "Early access & product",
    email: "hello@practiq.dev",
    hint: "Running or working inside a small firm with 30+ clients? Want a live walkthrough? This is the fastest way in.",
    icon: <MessageCircle className="w-4 h-4" />,
    accent: "text-emerald-400",
  },
  {
    title: "Press & partnerships",
    email: "hello@practiq.dev",
    hint: "Interview, podcast, guest post, integration partnership. We typically respond within 1-2 business days.",
    icon: <Briefcase className="w-4 h-4" />,
    accent: "text-blue-400",
  },
  {
    title: "Privacy & data requests",
    email: "privacy@practiq.dev",
    hint: "Data export, deletion, rectification. We respond within 14 days per our Privacy Policy.",
    icon: <Shield className="w-4 h-4" />,
    accent: "text-purple-400",
  },
  {
    title: "Security disclosures",
    email: "security@practiq.dev",
    hint: "Responsible disclosure of vulnerabilities. We appreciate coordinated reports.",
    icon: <Mail className="w-4 h-4" />,
    accent: "text-amber-400",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(CONTACT_JSON_LD) }}
      />
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">Contact</p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Talk to us.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-2xl">
            Real humans read every message. We&apos;re a small team, so response time is hours to a day or two, not weeks.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {CHANNELS.map((c) => (
              <a
                key={c.email + c.title}
                href={`mailto:${c.email}?subject=${encodeURIComponent("[" + c.title + "]")}`}
                className="bento-card p-6 hover:border-zinc-600 transition-colors block"
              >
                <div className={`flex items-center gap-2 mb-3 ${c.accent}`}>
                  {c.icon}
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {c.title}
                  </span>
                </div>
                <div className="text-zinc-100 font-mono text-sm mb-3">{c.email}</div>
                <p className="text-sm text-zinc-400 leading-relaxed">{c.hint}</p>
              </a>
            ))}
          </div>

          <div className="bento-card p-6">
            <h2 className="text-lg font-bold text-zinc-100 mb-3">Before you email…</h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
              The fastest way to get started is to join the early-access list. You&apos;ll get a personal onboarding email, not a form-letter.
            </p>
            <Link
              href="/#cta"
              className="btn-premium inline-flex items-center gap-2 py-3 px-6 text-xs uppercase tracking-widest"
            >
              Request early access
            </Link>
          </div>

          <div className="bento-card p-6 mt-10">
            <h2 className="text-lg font-bold text-zinc-100 mb-3">Mailing address</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Cliwant, Inc.<br />
              1111b South Governors Ave STE 93589<br />
              Dover, DE 19904<br />
              United States
            </p>
          </div>

          <p className="mt-6 text-xs text-zinc-600 text-center">
            Practiq is built by <strong className="text-zinc-400">Cliwant, Inc.</strong> See <Link href="/about" className="hover:text-zinc-400">about</Link> · <Link href="/privacy" className="hover:text-zinc-400">privacy</Link> · <Link href="/terms" className="hover:text-zinc-400">terms</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
