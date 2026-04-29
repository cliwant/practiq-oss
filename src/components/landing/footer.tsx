import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-6 pt-16 pb-10 border-t border-zinc-800/80 bg-[#050505]">
      <div className="mx-auto max-w-7xl">
        {/* Main footer grid — surfaces all programmatic + conversion surfaces */}
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Product */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/#features"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Platform
                </Link>
              </li>
              <li>
                <Link
                  href="/use-cases"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Use Cases
                </Link>
              </li>
              <li>
                <Link
                  href="/integrations"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Integrations
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Learn
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/benchmarks"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Firm Benchmarks
                </Link>
              </li>
              <li>
                <Link
                  href="/problem"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Problem Analysis
                </Link>
              </li>
              <li>
                <Link
                  href="/glossary"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Glossary
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Docs
                </Link>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Free Tools
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/readiness-quiz"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Readiness Quiz
                </Link>
              </li>
              <li>
                <Link
                  href="/roi-calculator"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  ROI Calculator
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Templates & Playbooks
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Compare */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Compare
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/best"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Best-Of Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/vs"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Head-to-Head
                </Link>
              </li>
              <li>
                <Link
                  href="/compare"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Practiq vs.
                </Link>
              </li>
              <li>
                <Link
                  href="/alternatives"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Alternatives
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/founding-member"
                  className="text-sm text-zinc-200 transition-colors hover:text-white"
                >
                  Founding Member
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@practiq.dev"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Support
                </a>
              </li>
              <li>
                <Link
                  href="/#cta"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Early Access
                </Link>
              </li>
            </ul>
          </div>

          {/* Account — primary entry points for visitors who already have
              a Practiq account (or are about to). Previously buried in the
              top nav only — visitors who scroll past the hero would hit
              the footer with no obvious "log in" affordance, contributing
              to the support volume around "where do I sign in?". */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Account
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-zinc-200 transition-colors hover:text-white"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Start free trial
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Live demo
                </Link>
              </li>
              <li>
                <Link
                  href="/app"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Open workspace
                </Link>
              </li>
              <li>
                <Link
                  href="/forgot-password"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Reset password
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Vertical hubs — lightweight cross-link row */}
        <div className="mb-10 rounded-xl border border-zinc-800 bg-[#0a0a0a] px-6 py-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Built for
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link
              href="/for/accounting"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Small CPA firms
            </Link>
            <span className="text-zinc-700">·</span>
            <Link
              href="/for/law"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Small law firms
            </Link>
            <span className="text-zinc-700">·</span>
            <Link
              href="/for/hr"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              HR advisory
            </Link>
            <span className="text-zinc-700">·</span>
            <Link
              href="/for/consulting"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Boutique consulting
            </Link>
            <span className="text-zinc-700">·</span>
            <Link
              href="/for/agency"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Marketing agencies
            </Link>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="flex flex-col items-center gap-4 border-t border-zinc-800 pt-8 md:flex-row md:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <span className="text-lg font-black tracking-tight text-zinc-950">
                P
              </span>
            </div>
            <span className="text-xl font-bold tracking-tighter text-zinc-100">
              Pract<span className="text-zinc-500">iq</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <Link
              href="/privacy"
              className="transition-colors hover:text-zinc-300"
            >
              Privacy
            </Link>
            <span>·</span>
            <Link
              href="/terms"
              className="transition-colors hover:text-zinc-300"
            >
              Terms
            </Link>
            <span>·</span>
            <Link
              href="/sitemap.xml"
              className="transition-colors hover:text-zinc-300"
            >
              Sitemap
            </Link>
          </div>
        </div>

        {/* Footer fine-print: was text-zinc-600 (2.64:1 ratio, fails
            WCAG AA-large). Bumped to zinc-500 (4.22:1) so the legal
            text is at least at the AA-large threshold. The only zinc-600
            uses left in the marketing surface are decorative icons
            where text contrast doesn't apply. */}
        <div className="mt-6 text-center text-[10px] text-zinc-500">
          Built by <strong className="text-zinc-300">Grindworks</strong> ·
          &copy; 2026 Cliwant, Inc. · 1111b South Governors Ave STE 93589,
          Dover, DE 19904 · We respond within 4 hours US business time
        </div>
      </div>
    </footer>
  );
}
