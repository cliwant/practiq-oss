import Stripe from "stripe";

/**
 * Shared Stripe server client. Instantiated once per process.
 *
 * Missing STRIPE_SECRET_KEY in dev is non-fatal — the lazy getter
 * only throws on first actual use, so pages that don't hit Stripe
 * (landing, /app, /login, /signup) still build and render.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env to enable billing.",
    );
  }
  _stripe = new Stripe(key, {
    // Pin the API version so Stripe rolling updates don't break our
    // types out from under us. Update deliberately alongside tests.
    // Cast to LatestApiVersion: the repo ships no lockfile, so the stripe
    // ^22 caret range floats and its pinned-version literal type drifts;
    // the cast keeps our deliberately-pinned runtime value type-stable.
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: {
      name: "Practiq",
      url: "https://practiq.dev",
    },
  });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  // Plan keys were renamed starter/team/pro → solo/practice/firm long
  // before any of those StripePrice rows were even seeded, but this
  // helper kept checking the original names — so it ALWAYS returned
  // false in production, which made every authenticated /api/stripe
  // /checkout call short-circuit to a 503 ("Billing is not configured
  // yet"). The 4/28 user report ("결제가 실제 서비스에서 정상적으로
  // 붙어있지 않습니다") traces directly to this. The new check
  // mirrors src/lib/stripe/plans.ts and trips when any of the live
  // price-ID env vars is set.
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      (process.env.STRIPE_PRICE_SOLO ||
        process.env.STRIPE_PRICE_PRACTICE ||
        process.env.STRIPE_PRICE_FIRM),
  );
}
