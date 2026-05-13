import { notFound } from "next/navigation";

/**
 * Catch-all under /app/* — forces unmatched authenticated routes into the
 * /app layout segment so src/app/app/not-found.tsx renders inside the
 * WorkspaceShell, instead of bubbling up to the public marketing 404 at
 * src/app/not-found.tsx ("Homepage / Pricing / Blog" — wrong context for a
 * logged-in operator).
 *
 * Why this file exists in addition to not-found.tsx: Next.js App Router
 * only renders a segment's not-found.tsx when either (a) a route exists in
 * that segment but a child page calls notFound(), or (b) a catch-all in
 * that segment calls notFound(). Without (a) or (b), a truly unmatched
 * URL falls all the way back to the root not-found.tsx — verified on
 * practiq.dev/app/non-existent-page before this fix shipped, where the
 * RSC payload showed `c: ["","_not-found"]` (root not-found resolving)
 * rather than the /app segment's not-found.
 *
 * Real routes under /app/* (clients/[id], settings, tasks, workflows,
 * the /app/clients server-redirect from commit 8117939, etc.) take
 * priority over this catch-all per App Router's static-before-dynamic-
 * before-catchall specificity ordering — verified by `npm run build`
 * listing them all alongside /app/[...catchall].
 *
 * Wave 14 (2026-05-13): R3 triage class-of-bug fix.
 */
export default function AppCatchAll() {
  notFound();
}
