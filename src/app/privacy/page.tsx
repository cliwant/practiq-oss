/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Practiq collects, uses, stores, and protects your information.",
  alternates: { canonical: "https://practiq.dev/privacy" },
};

const LAST_UPDATED = "April 14, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="pt-32 pb-16 px-6">
        <article className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">Privacy</p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-500 mb-8">Last updated: {LAST_UPDATED}</p>

          <div className="prose-dark">
            <p>
              This Privacy Policy describes how <strong>Cliwant, Inc.</strong> (&quot;Practiq,&quot; &quot;we,&quot; &quot;us&quot;) collects, uses, and shares information when you visit practiq.dev, sign up for early access, or interact with our blog, documentation, or other surfaces. We aim to keep this plain-English; if anything is unclear, email <a href="mailto:privacy@practiq.dev">privacy@practiq.dev</a>.
            </p>

            <h2>What we collect</h2>
            <ul>
              <li><strong>Early-access signup</strong>: email, optional firm name, firm vertical, firm size, client count, role. You provide these in the signup form.</li>
              <li><strong>Newsletter signup</strong>: email, plus which blog post you signed up from (for attribution).</li>
              <li><strong>Traffic analytics</strong>: pseudonymous visit data via Vercel Web Analytics — path, referrer, country, device type. No cookies, no cross-site tracking.</li>
              <li><strong>Crawler hit log</strong>: for each search-engine or AI-engine bot request, we log bot name, path, country, and a 32-bit hash of the bot&apos;s IP. Raw IPs are never stored.</li>
              <li><strong>UTM parameters</strong>: if you arrive via a tagged link (utm_source, utm_medium, utm_campaign), we associate the tag with your signup for attribution only.</li>
              <li><strong>Transactional email metadata</strong>: when we send you a confirmation or reply, our email provider (Amazon SES) logs delivery events (sent, bounced, complained).</li>
            </ul>

            <h2>What we do NOT collect</h2>
            <ul>
              <li>Passwords (no public authentication surface yet).</li>
              <li>Payment information (no billing in early access).</li>
              <li>Third-party tracking identifiers (no Google Analytics, no Facebook Pixel, no ad networks).</li>
              <li>Raw IP addresses for public visitors.</li>
            </ul>

            <h2>How we use it</h2>
            <ul>
              <li>To contact you about early access, onboarding, and product updates you signed up for.</li>
              <li>To send you newsletter content you subscribed to. You can unsubscribe any time via the link in every newsletter email.</li>
              <li>To measure which blog posts, docs pages, and sources drive early-access signups.</li>
              <li>To understand which search engines and AI engines are crawling which pages (so we can prioritize SEO / AEO investment).</li>
              <li>To debug, prevent abuse, and improve the product.</li>
            </ul>

            <h2>Who we share it with</h2>
            <p>We share information only with service providers needed to run the product:</p>
            <ul>
              <li><strong>Vercel</strong> — hosting, edge network, Web Analytics.</li>
              <li><strong>Supabase</strong> — database for waitlist, newsletter, crawler logs.</li>
              <li><strong>Amazon Web Services (SES)</strong> — transactional email delivery.</li>
              <li><strong>Cloudflare</strong> — DNS.</li>
              <li><strong>Anthropic</strong> — AI features inside the product (sent only when you trigger them; your data is not used to train models).</li>
            </ul>
            <p>We do not sell, rent, or trade your information. We do not share it with advertisers.</p>

            <h2>How long we keep it</h2>
            <ul>
              <li>Early-access signup records: until you ask us to delete them, or we sunset the product.</li>
              <li>Newsletter subscription: until you unsubscribe.</li>
              <li>Crawler logs: 12 months, then purged.</li>
              <li>Transactional email logs: 30 days.</li>
            </ul>

            <h2>Your rights</h2>
            <p>You can at any time:</p>
            <ul>
              <li>Request a copy of the data we hold about you.</li>
              <li>Ask us to correct or delete your data.</li>
              <li>Unsubscribe from any email we send.</li>
              <li>Opt out of future early-access communication.</li>
            </ul>
            <p>
              Email <a href="mailto:privacy@practiq.dev">privacy@practiq.dev</a> with the subject &quot;Data request&quot; and we&apos;ll respond within 14 days. If you&apos;re in the EU, UK, California, or any other jurisdiction with specific data-subject rights, those rights apply.
            </p>

            <h2>Security</h2>
            <p>
              We use industry-standard practices: TLS for all traffic, hashed passwords (bcrypt) for any admin surfaces, tokenized session cookies, no raw IP storage. No system is perfectly secure, but our attack surface is deliberately small.
            </p>

            <h2>Cookies</h2>
            <p>
              The public marketing site (practiq.dev) does not set tracking cookies. The admin surface sets a single HttpOnly session cookie for logged-in administrators; it&apos;s not used for any user-facing tracking.
            </p>

            <h2>Changes</h2>
            <p>
              If we change this policy materially, we&apos;ll update the &quot;last updated&quot; date and notify email subscribers. Minor clarifications happen in place.
            </p>

            <h2>Contact</h2>
            <p>
              Cliwant, Inc. &middot; <a href="mailto:privacy@practiq.dev">privacy@practiq.dev</a>
              <br />
              For general questions: <Link href="/contact">Contact</Link>
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
