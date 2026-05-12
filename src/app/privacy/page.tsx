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

const LAST_UPDATED = "May 13, 2026";

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
              <li><strong>Account</strong>: email, hashed password, firm name, firm size, time-zone. Stored in our database.</li>
              <li><strong>OAuth identity</strong> (when you sign in via Google / LinkedIn / Microsoft): the provider gives us your email + name + profile id. We do not pull contacts, calendar, drive, or any other scope.</li>
              <li><strong>Workspace data</strong>: clients you create, knowledge-base entries you save, files you upload, chat messages, agent task results, approval decisions, audit log. Stored in our database, scoped to your firm only.</li>
              <li><strong>Billing</strong>: when you subscribe, Stripe stores your payment method and charges. We receive a tokenized customer id, plan, period dates, and webhook events (succeeded, failed, refunded). We never see the card number, CVV, or bank account.</li>
              <li><strong>Token usage</strong>: per-month aggregate of input + output tokens you spent on AI features, used for plan-allowance enforcement and metered overage billing.</li>
              <li><strong>Newsletter signup</strong>: email + which blog post you signed up from.</li>
              <li><strong>Traffic analytics</strong>: pseudonymous visit data via Vercel Web Analytics + PostHog (paths, referrer, country, device type). No cookies on the marketing site.</li>
              <li><strong>Crawler hit log</strong>: for each search / AI-engine bot request, we log bot name, path, country, and a 32-bit hash of the bot&apos;s IP. Raw IPs are not stored.</li>
              <li><strong>Transactional email metadata</strong>: when we send you a confirmation, password reset, or invoice email, Resend logs delivery events (sent, bounced, complained).</li>
            </ul>

            <h2>Free tools and what they collect</h2>
            <p>
              practiq.dev offers a small set of free, no-signup-required tools. Using these tools creates a record of your submission even if you never create a Practiq account. Each tool is described below.
            </p>

            <h3>Workflow audit (<a href="/tools/workflow-audit">/tools/workflow-audit</a>)</h3>
            <ul>
              <li><strong>What you give us</strong>: your name, work email, firm name, firm vertical (e.g. accounting / law / consulting), firm size, approximate client count, and answers to an 8-step questionnaire about your engagement model, current AI tool usage, and handoff pain points. The questionnaire includes free-text fields you fill in yourself.</li>
              <li><strong>What we do with it</strong>: we send the structured form responses to an LLM (see &quot;LLM processing&quot; below) to generate a personalized workflow audit report. The report is shown to you on-screen and delivered to the email address you provided.</li>
              <li><strong>Where it lives</strong>: the submission and generated report are stored in our database table <code>public.workflow_audits</code> alongside the SNS attribution (which landing page / source post / campaign / topic referred you), the user-agent string, and the country derived from your request IP. We do not store the raw IP.</li>
              <li><strong>How long we keep it</strong>: up to 2 years from creation, or until you ask us to delete it, whichever comes first.</li>
              <li><strong>Workflow audit follow-up email</strong>: if you complete the workflow audit, we may send a single follow-up email 24 to 72 hours after your submission, asking whether the audit&apos;s diagnosis matched your actual day-to-day at the firm. Reply STOP to opt out (we will record your opt-out in <code>optout_at</code> on your <code>workflow_audits</code> row and no further messages will be sent). The follow-up is operator-voiced (sent from a real person, not automation), and is the only proactive email we send after the initial audit-report delivery.</li>
            </ul>

            <h3>AI policy generator (<a href="/tools/ai-policy-generator">/tools/ai-policy-generator</a>)</h3>
            <ul>
              <li><strong>What you give us</strong>: your name, work email, firm name, firm vertical, firm size, the US states you operate in, and answers to a 7-step form about your current AI tool usage, sensitive data categories you handle, preferred approval workflow, and disclosure stance.</li>
              <li><strong>What we do with it</strong>: we send the structured responses to an LLM to generate a draft AI usage policy for your firm. The policy is shown to you on-screen, delivered as a PDF to the email you provided, and made downloadable from a Supabase Storage URL we generate.</li>
              <li><strong>About that PDF URL</strong>: the generated PDF lives at a public-read Supabase Storage URL keyed to a UUID we generate per submission. The URL is not enumerable (you cannot guess another firm&apos;s URL), but it is not behind authentication — anyone with the URL can open the PDF. We email the URL only to the address you provide. If you need the PDF taken down, email <a href="mailto:privacy@practiq.dev">privacy@practiq.dev</a>.</li>
              <li><strong>Where it lives</strong>: the submission, generated policy JSON, and PDF metadata are stored in our database table <code>practiq.policy_generations</code> alongside the SNS attribution, user-agent, country, and a server-side <code>email_sent_at</code> timestamp.</li>
              <li><strong>How long we keep it</strong>: up to 2 years from creation, or until you ask us to delete it, whichever comes first.</li>
            </ul>

            <h3>Sample workspace (<a href="/demo/workspace">/demo/workspace</a>)</h3>
            <ul>
              <li>No form data is captured. The sample workspace is read-only.</li>
              <li>We log <strong>behavioral events only</strong> — which sample surfaces you opened, clicked, or interacted with — tied to a pseudonymous PostHog distinct-id cookie. No personal information is associated with these events unless you separately sign up.</li>
            </ul>

            <h3>LLM processing of your free-text input</h3>
            <p>
              All free-text fields you submit through the workflow audit and AI policy generator (engagement description, pain points, data categories you handle, etc.) are sent to an LLM for processing. We route these calls through <strong>OpenRouter</strong> to <strong>Anthropic Claude</strong>. Per OpenRouter&apos;s and Anthropic&apos;s published terms, those providers do not retain input or output beyond what is required to serve the response, and API inputs are not used to train their models. We do not fine-tune any model on customer input.
            </p>

            <h3>Analytics events for free tools</h3>
            <p>
              In addition to the dedicated tables above, we record pseudonymous analytics events when you interact with these tools — event types include <code>workflow_audit_step_advanced</code>, <code>workflow_audit_completed</code>, <code>policy_step_advanced</code>, <code>policy_generated</code>, <code>sns_cta_clicked</code>, <code>demo_workspace_interaction</code>, and <code>waitlist_signed_up</code>. Properties on these events include the SNS attribution and high-level form selections (e.g. vertical, gap categories) but no personally identifying information beyond what is already in the dedicated tables described above. These events live in <code>practiq.analytics_events</code> and are retained for 90 days.
            </p>

            <h2>What we do NOT collect</h2>
            <ul>
              <li>Card numbers, CVVs, or bank account details — Stripe handles those directly. We see only the last four digits + brand on your billing tab, drawn from Stripe at render time.</li>
              <li>Third-party tracking identifiers (no Google Analytics, no Facebook Pixel, no ad networks, no LinkedIn Insight Tag).</li>
              <li>Raw IP addresses for marketing-site visitors.</li>
              <li>Anything from connected accounting software (QuickBooks / Xero) until you explicitly authorize it via OAuth — and even then, only the read-scopes you grant.</li>
            </ul>

            <h2>How we use it</h2>
            <ul>
              <li>To contact you about early access, onboarding, and product updates you signed up for.</li>
              <li>To send you newsletter content you subscribed to. You can unsubscribe any time via the link in every newsletter email.</li>
              <li>To measure which blog posts, docs pages, and sources drive early-access signups.</li>
              <li>To understand which search engines and AI engines are crawling which pages (so we can prioritize SEO / AEO investment).</li>
              <li>To debug, prevent abuse, and improve the product.</li>
            </ul>

            <h2>Sub-processors</h2>
            <p>
              We share information only with the service providers needed to run the product. Each is contractually bound by their own DPA / privacy terms; we&apos;re happy to provide our DPA on request for B2B customers (
              <a href="mailto:privacy@practiq.dev">privacy@practiq.dev</a>).
            </p>
            <ul>
              <li><strong>Vercel</strong> (Frontier Inc., USA) — hosting, edge network, Web Analytics. Region: us-east. <a href="https://vercel.com/legal/privacy-policy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>Supabase</strong> (Supabase Inc., USA) — Postgres database for app data + auth, and Supabase Storage for AI-policy-generator PDFs (public-read bucket, UUID-keyed paths). Region: us-east. <a href="https://supabase.com/privacy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>Stripe</strong> (Stripe Inc., USA) — payment processing + metered billing. PCI-DSS Level 1. <a href="https://stripe.com/privacy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>OpenRouter</strong> (Lambda Inc., USA) — primary LLM gateway for chat + agent features. Routes to Anthropic / OpenAI / Google models. By default OpenRouter does NOT log prompts or responses (zero-data-retention mode is enabled on our account). <a href="https://openrouter.ai/privacy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>Anthropic</strong> (Anthropic PBC, USA) — secondary fallback LLM for chat + agents. Per their commercial terms, your inputs are NOT used to train Anthropic&apos;s models. <a href="https://www.anthropic.com/legal/privacy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>OpenAI</strong> (OpenAI L.L.C., USA) — embedding generation only (text-embedding-3-small). Per OpenAI&apos;s API terms, API inputs are NOT used to train OpenAI&apos;s models. <a href="https://openai.com/policies/privacy-policy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>Resend</strong> (Resend Inc., USA) — transactional email delivery (welcome, password reset, invoice). <a href="https://resend.com/legal/privacy-policy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>PostHog</strong> (PostHog Inc., USA) — product analytics, opt-in only inside the app. Marketing-site analytics are via Vercel and do not flow to PostHog. <a href="https://posthog.com/privacy" rel="noopener" target="_blank">Privacy</a>.</li>
              <li><strong>Cloudflare</strong> (Cloudflare Inc., USA) — DNS. <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener" target="_blank">Privacy</a>.</li>
            </ul>
            <p>We do not sell, rent, or trade your information. We do not share it with advertisers. Your workspace data (clients, knowledge base, chat history) is never used to train any AI model.</p>

            <h2>How long we keep it</h2>
            <ul>
              <li>Account + workspace data: while your subscription is active. After cancellation we retain it for 30 days (so you can reactivate without data loss), then purge unless you explicitly request earlier deletion.</li>
              <li>Audit log: 7 years (US tax-record retention norm). Lets you replay AI activity for SOC 2 / IRS audits even after you cancel.</li>
              <li>Billing records (Stripe): 7 years (US tax / accounting requirement).</li>
              <li>Token usage logs: 18 months (lets us validate any disputed metered overage charge).</li>
              <li>Newsletter / waitlist: until you unsubscribe.</li>
              <li>Crawler logs: 12 months.</li>
              <li>Transactional email logs (Resend): 30 days.</li>
              <li>Workflow audit submissions (<code>public.workflow_audits</code>): up to 2 years from creation, or until deletion request, whichever first.</li>
              <li>AI policy generator submissions (<code>practiq.policy_generations</code>) and the generated PDFs in Supabase Storage: up to 2 years from creation, or until deletion request, whichever first.</li>
              <li>Analytics events (<code>practiq.analytics_events</code>): 90 days.</li>
            </ul>

            <h2>Where data lives</h2>
            <p>
              All workspace data is stored in Supabase&apos;s us-east-1 region. We do not currently mirror to other regions; if your firm requires EU data residency, contact <a href="mailto:privacy@practiq.dev">privacy@practiq.dev</a> before subscribing — we&apos;ll let you know our roadmap.
            </p>

            <h2>AI training disclosure</h2>
            <p>
              <strong>Your data is never used to train any AI model.</strong> All LLM calls go to Anthropic / OpenAI / OpenRouter via API, where commercial terms exclude API inputs from training. Practiq does not run its own model training. We disable any optional model-training opt-in on every provider account.
            </p>

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
