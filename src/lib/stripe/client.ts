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
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
    appInfo: {
      name: "Practiq",
      url: "https://practiq.dev",
    },
  });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      (process.env.STRIPE_PRICE_STARTER ||
        process.env.STRIPE_PRICE_TEAM ||
        process.env.STRIPE_PRICE_PRO),
  );
}
