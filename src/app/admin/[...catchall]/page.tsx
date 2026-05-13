import { notFound } from "next/navigation";

/**
 * Catch-all under /admin/* — forces unmatched admin routes into the
 * /admin layout segment so src/app/admin/not-found.tsx renders inside the
 * admin top-bar + nav, instead of falling through to the public marketing
 * 404 (which on the admin host gets blanket-404'd by middleware anyway,
 * but on practiq.dev would otherwise leak marketing UX into an admin URL).
 *
 * Same rationale as src/app/app/[...catchall]/page.tsx — segment-level
 * not-found.tsx alone doesn't trigger for unmatched routes unless a child
 * (page or catch-all) inside the segment calls notFound(). This file
 * supplies that call.
 *
 * Middleware in src/middleware.ts still runs first:
 *   - admin.grindworks.ai + no cookie → 307 to /admin/login (this page
 *     never renders).
 *   - practiq.dev/admin/anything → blanket 404 from middleware (this
 *     page never renders either).
 *   - admin.grindworks.ai + valid cookie + unmatched path → middleware
 *     passes through, App Router resolves to this catch-all, notFound()
 *     fires, src/app/admin/not-found.tsx renders inside the admin shell.
 *
 * Real /admin/* routes (analytics, blog, crawler, login, etc.) take
 * priority via static-segment specificity. Verified at build time.
 *
 * Wave 14 (2026-05-13): R3 triage class-of-bug fix.
 */
export default function AdminCatchAll() {
  notFound();
}
