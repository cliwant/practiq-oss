/**
 * Demo-zone throttle configuration.
 *
 * Anonymous (unauthenticated) traffic to /api/demo/chat is gated by
 * an IP-scoped rolling-window token cap. Five thousand tokens / IP /
 * 24h is enough for ~10 medium turns of the marketing demo but not
 * enough to run a real workflow against the free API. Exhaustion
 * surfaces a sign-up CTA via the structured 401 body.
 *
 * Moved out of `src/lib/stripe/plans.ts` in Stage 3a (2026-05-15) so
 * the demo throttle no longer depends on the legacy per-seat `PLANS`
 * registry. Both `plans.ts` (deprecated re-export) and
 * `src/lib/token-budget.ts` import from here.
 */
export const DEMO_ZONE = {
  /** Rolling-window cap per IP. */
  tokensPerIpPerDay: 5_000,
  /** Window length used by the rate limiter. */
  windowMs: 24 * 60 * 60 * 1000,
} as const;
