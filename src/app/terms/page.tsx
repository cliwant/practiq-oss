/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms under which you may use the Practiq website and early-access product.",
  alternates: { canonical: "https://practiq.dev/terms" },
};

const LAST_UPDATED = "April 14, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="pt-32 pb-16 px-6">
        <article className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">Terms</p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-500 mb-8">Last updated: {LAST_UPDATED}</p>

          <div className="prose-dark">
            <p>
              By accessing practiq.dev or the Practiq product (together, the &quot;Service&quot;), you agree to these Terms. The Service is provided by <strong>Cliwant, Inc.</strong> (&quot;we,&quot; &quot;us&quot;).
            </p>

            <h2>Early access</h2>
            <p>
              Practiq is in early access. You may request an invitation. We may accept, decline, or queue your request at our discretion. During early access:
            </p>
            <ul>
              <li>The Service is provided &quot;as is&quot; without warranty of any kind.</li>
              <li>Features may change, break, or be removed without notice.</li>
              <li>We may delete early-access data when the product exits early access, with at least 14 days advance notice.</li>
              <li>Early-access users are not charged but also receive no service-level commitment.</li>
            </ul>

            <h2>Your use of the Service</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose, including unauthorized access to data that is not yours.</li>
              <li>Interfere with or disrupt the Service (automated scraping of the marketing site is allowed for standard search/AI crawlers via our robots.txt and llms.txt; manual or high-rate scraping is not).</li>
              <li>Attempt to access administrative routes or reverse-engineer authentication mechanisms.</li>
              <li>Upload content that violates applicable law or third-party rights.</li>
            </ul>

            <h2>Content and intellectual property</h2>
            <p>
              The marketing site content (blog posts, documentation, graphics) is &copy; {new Date().getFullYear()} Cliwant, Inc. Quotation for legitimate editorial purposes with attribution is welcome; wholesale republishing requires written permission.
            </p>
            <p>
              Any content you submit through the Service remains yours; you grant us a limited license to store and process it solely to operate the Service for you.
            </p>

            <h2>Availability</h2>
            <p>
              We aim for high availability but do not commit to a specific uptime during early access. We rely on third-party infrastructure (Vercel, Supabase, AWS, Cloudflare) whose availability is outside our control.
            </p>

            <h2>Accounts and security</h2>
            <p>
              The public marketing site does not require an account. Administrative accounts (admin.grindworks.ai) are created out of band by our team; there is no self-signup. You are responsible for keeping your credentials secure and notifying us immediately at <a href="mailto:security@practiq.dev">security@practiq.dev</a> if you believe an account is compromised.
            </p>

            <h2>Fees</h2>
            <p>
              Early access is free. Paid plans, when introduced, will be announced in advance with clear pricing. You&apos;ll have the choice to accept or decline before any charge.
            </p>

            <h2>Termination</h2>
            <p>
              You may stop using the Service at any time. We may terminate or suspend access if you violate these Terms or if we discontinue the Service. On termination, we will delete or anonymize your personal data per our <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <h2>Disclaimer of warranties</h2>
            <p>
              The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE.&quot; To the maximum extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be error-free or uninterrupted.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Cliwant, Inc., its officers, directors, employees, or agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service. Our aggregate liability for direct damages shall not exceed one hundred US dollars ($100).
            </p>

            <h2>Governing law</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-law rules. Any dispute shall be resolved in the state or federal courts of Delaware, unless applicable consumer-protection law requires otherwise.
            </p>

            <h2>Changes</h2>
            <p>
              We may update these Terms. Material changes will be announced via email to active users and via the &quot;last updated&quot; date here. Continued use after a change constitutes acceptance.
            </p>

            <h2>Contact</h2>
            <p>
              Cliwant, Inc. &middot; <a href="mailto:hello@practiq.dev">hello@practiq.dev</a>
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
