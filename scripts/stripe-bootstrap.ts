/**
 * Stripe one-shot bootstrap — creates the products, monthly USD prices,
 * and the production webhook endpoint that Practiq's checkout flow
 * needs in order to go from "pricing page renders" to "Start Checkout
 * actually charges someone."
 *
 * Run with:
 *   npx tsx scripts/stripe-bootstrap.ts
 *
 * What it needs:
 *   - STRIPE_SECRET_KEY in .env.local at studio root
 *     (live mode: sk_live_…, test mode: sk_test_…)
 *
 * What it creates (idempotently — safe to re-run):
 *   - Product "Practiq Starter" + monthly price $99 USD
 *   - Product "Practiq Team"    + monthly price $499 USD
 *   - Product "Practiq Pro"     + monthly price $999 USD
 *   - Webhook endpoint at https://practiq.dev/api/stripe/webhook
 *     listening for the subscription lifecycle events that the webhook
 *     handler in src/app/api/stripe/webhook/route.ts already handles
 *
 * What it prints at the end:
 *   - The five env vars to add to .env.local:
 *       STRIPE_PRICE_STARTER, STRIPE_PRICE_TEAM, STRIPE_PRICE_PRO,
 *       STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY (asks user for it)
 *
 * Idempotency: each product is looked up by `metadata.practiq_plan_key`
 * before being created, and each price is looked up by `lookup_key`.
 * Re-running the script after an interruption picks up where it left
 * off rather than creating duplicates. The webhook endpoint is
 * deduplicated by URL.
 *
 * Why a script, not a manual dashboard walk: every plan switch (price
 * change, new tier, currency add) becomes a code edit + re-run instead
 * of a 20-click dashboard ritual that's easy to mis-click.
 */
import "dotenv/config";
import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim();
if (!SECRET_KEY) {
  console.error(
    "✗ STRIPE_SECRET_KEY is not set.\n" +
      "  Add it to .env.local (studio root) before running this script.\n" +
      "  Get it from: https://dashboard.stripe.com/apikeys",
  );
  process.exit(1);
}

const stripe = new Stripe(SECRET_KEY, {
  // apiVersion omitted — see src/lib/stripe/client.ts (lockfile-free SDK
  // caret drift makes a hardcoded version literal fail type-check).
  typescript: true,
  appInfo: { name: "Practiq Bootstrap", url: "https://practiq.dev" },
});

const isTestMode = SECRET_KEY.startsWith("sk_test_");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://practiq.dev";

interface PriceSpec {
  envKey: string; // STRIPE_PRICE_SOLO etc.
  monthlyUsd: number;
  priceLookupKey: string;
  /** Whether this price is "the main one" for the product (vs an add-on or founding discount). */
  isPrimary: boolean;
  /** "month" for recurring base + seat pricing. */
  interval: "month";
}

interface ProductSpec {
  envKeyPrefix: string; // SOLO, PRACTICE, FIRM
  practiqPlanKey: "solo" | "practice" | "firm";
  productName: string;
  productDescription: string;
  prices: PriceSpec[];
}

const PRODUCTS: ProductSpec[] = [
  {
    envKeyPrefix: "SOLO",
    practiqPlanKey: "solo",
    productName: "Practiq Solo",
    productDescription:
      "Solo operators. Up to 30 client workspaces, daily AI briefings, " +
      "unlimited document generation, 500 chat messages/mo. 1 seat.",
    prices: [
      {
        envKey: "STRIPE_PRICE_SOLO",
        monthlyUsd: 39,
        priceLookupKey: "practiq_solo_monthly_usd",
        isPrimary: true,
        interval: "month",
      },
    ],
  },
  {
    envKeyPrefix: "PRACTICE",
    practiqPlanKey: "practice",
    productName: "Practiq Practice",
    productDescription:
      "2-5 person firms. Up to 100 client workspaces, shared client memory, " +
      "Approval Queue routing, role-based access, 2,000 chat messages/mo " +
      "(pooled). 5 seats included; $19/extra seat/mo.",
    prices: [
      {
        envKey: "STRIPE_PRICE_PRACTICE",
        monthlyUsd: 99,
        priceLookupKey: "practiq_practice_monthly_usd",
        isPrimary: true,
        interval: "month",
      },
      {
        envKey: "STRIPE_PRICE_PRACTICE_FOUNDING",
        monthlyUsd: 49,
        priceLookupKey: "practiq_practice_founding_monthly_usd",
        isPrimary: false,
        interval: "month",
      },
      {
        envKey: "STRIPE_PRICE_PRACTICE_SEAT",
        monthlyUsd: 19,
        priceLookupKey: "practiq_practice_extra_seat_monthly_usd",
        isPrimary: false,
        interval: "month",
      },
    ],
  },
  {
    envKeyPrefix: "FIRM",
    practiqPlanKey: "firm",
    productName: "Practiq Firm",
    productDescription:
      "6-10 person firms. Up to 200 client workspaces, advanced RBAC + audit " +
      "trail, dedicated onboarding, custom integrations, SOC 2 docs, " +
      "8,000 chat messages/mo (pooled). 10 seats included; $29/extra seat/mo.",
    prices: [
      {
        envKey: "STRIPE_PRICE_FIRM",
        monthlyUsd: 299,
        priceLookupKey: "practiq_firm_monthly_usd",
        isPrimary: true,
        interval: "month",
      },
      {
        envKey: "STRIPE_PRICE_FIRM_SEAT",
        monthlyUsd: 29,
        priceLookupKey: "practiq_firm_extra_seat_monthly_usd",
        isPrimary: false,
        interval: "month",
      },
    ],
  },
];

const WEBHOOK_URL = `${SITE_URL}/api/stripe/webhook`;
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

async function findExistingProduct(planKey: string): Promise<Stripe.Product | null> {
  // Stripe doesn't index on metadata server-side, so we list and filter.
  // Practiq has at most 3 products — list once, filter in memory.
  for await (const p of stripe.products.list({ active: true, limit: 100 })) {
    if (p.metadata?.practiq_plan_key === planKey) return p;
  }
  return null;
}

async function findExistingPrice(lookupKey: string): Promise<Stripe.Price | null> {
  const res = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  return res.data[0] ?? null;
}

interface EnsuredPrice {
  spec: PriceSpec;
  price: Stripe.Price;
  created: boolean;
}

async function ensureProduct(spec: ProductSpec): Promise<{
  product: Stripe.Product;
  prices: EnsuredPrice[];
  createdProduct: boolean;
}> {
  let product = await findExistingProduct(spec.practiqPlanKey);
  let createdProduct = false;
  if (!product) {
    product = await stripe.products.create({
      name: spec.productName,
      description: spec.productDescription,
      metadata: {
        practiq_plan_key: spec.practiqPlanKey,
        bootstrap_source: "scripts/stripe-bootstrap.ts",
      },
    });
    createdProduct = true;
  } else {
    // Refresh metadata + description on every run so product data
    // doesn't drift from this script. Stripe's update is no-op when
    // values are unchanged so this is safe.
    product = await stripe.products.update(product.id, {
      name: spec.productName,
      description: spec.productDescription,
      metadata: {
        practiq_plan_key: spec.practiqPlanKey,
        bootstrap_source: "scripts/stripe-bootstrap.ts",
      },
    });
  }

  const ensured: EnsuredPrice[] = [];
  for (const ps of spec.prices) {
    let price = await findExistingPrice(ps.priceLookupKey);
    let createdPrice = false;
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: ps.monthlyUsd * 100,
        recurring: { interval: ps.interval },
        lookup_key: ps.priceLookupKey,
        transfer_lookup_key: true,
        metadata: {
          practiq_plan_key: spec.practiqPlanKey,
          is_primary: ps.isPrimary ? "true" : "false",
          founding: ps.priceLookupKey.includes("founding") ? "true" : "false",
          extra_seat: ps.priceLookupKey.includes("seat") ? "true" : "false",
        },
      });
      createdPrice = true;
    }
    ensured.push({ spec: ps, price, created: createdPrice });
  }

  return { product, prices: ensured, createdProduct };
}

async function ensureWebhook(): Promise<{ endpoint: Stripe.WebhookEndpoint; created: boolean; secret: string | null }> {
  // Find existing webhook by URL — Stripe allows multiple endpoints per
  // URL, but we want exactly one for Practiq. If duplicates exist (from
  // an earlier interrupted run), keep the newest and disable the others.
  const all = await stripe.webhookEndpoints.list({ limit: 100 });
  const matching = all.data.filter((e) => e.url === WEBHOOK_URL);

  if (matching.length === 0) {
    const endpoint = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: WEBHOOK_EVENTS,
      description: "Practiq webhook (created by scripts/stripe-bootstrap.ts)",
      metadata: { bootstrap_source: "scripts/stripe-bootstrap.ts" },
    });
    return { endpoint, created: true, secret: endpoint.secret ?? null };
  }

  // Existing endpoint — Stripe only returns the signing secret on creation
  // (or via dashboard "Reveal"). We can't programmatically retrieve it
  // here. Print a clear instruction for the operator.
  const endpoint = matching.sort((a, b) => b.created - a.created)[0];
  return { endpoint, created: false, secret: null };
}

async function main() {
  console.log(
    `\n● Stripe bootstrap — ${isTestMode ? "TEST MODE" : "LIVE MODE"}\n` +
      `  Site URL:   ${SITE_URL}\n` +
      `  Webhook URL: ${WEBHOOK_URL}\n`,
  );

  const allEnsured: EnsuredPrice[] = [];

  for (const spec of PRODUCTS) {
    process.stdout.write(`  ${spec.productName} `);
    const r = await ensureProduct(spec);
    allEnsured.push(...r.prices);
    const newCount = r.prices.filter((p) => p.created).length;
    const tag = r.createdProduct
      ? `(created product + ${newCount}/${r.prices.length} prices)`
      : `(reused product, ${newCount}/${r.prices.length} new prices)`;
    console.log(`✓ ${tag}`);
  }

  process.stdout.write(`  Webhook endpoint `);
  const wh = await ensureWebhook();
  console.log(wh.created ? "✓ (created)" : "✓ (reused existing)");

  console.log("\n────────────────────────────────────────────────────");
  console.log("  Add these to .env.local at the studio root:");
  console.log("────────────────────────────────────────────────────\n");
  for (const e of allEnsured) {
    console.log(`${e.spec.envKey}=${e.price.id}`);
  }
  if (wh.created && wh.secret) {
    console.log(`STRIPE_WEBHOOK_SECRET=${wh.secret}`);
  } else if (!wh.created) {
    console.log(
      `# Webhook endpoint already existed (id=${wh.endpoint.id}). The signing\n` +
        `# secret is only returned on creation. To obtain it, open the dashboard:\n` +
        `#   ${isTestMode ? "https://dashboard.stripe.com/test/webhooks/" : "https://dashboard.stripe.com/webhooks/"}${wh.endpoint.id}\n` +
        `# Click "Reveal signing secret" and paste below.\n` +
        `STRIPE_WEBHOOK_SECRET=whsec_…`,
    );
  }
  console.log(
    `\n# Optional — only needed if you adopt Stripe Elements or PaymentIntents\n` +
      `# in the front-end. Hosted Checkout (current flow) doesn't require it.\n` +
      `# Get it from: ${isTestMode ? "https://dashboard.stripe.com/test/apikeys" : "https://dashboard.stripe.com/apikeys"}\n` +
      `# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_${isTestMode ? "test" : "live"}_…\n`,
  );
  console.log("────────────────────────────────────────────────────");
  console.log("  After adding: restart `npm run dev` (or redeploy).");
  console.log("  Verify with:  curl -X POST https://practiq.dev/api/stripe/checkout -d '{\"plan\":\"starter\"}' -H 'cookie: <signed-in session>'");
  console.log("────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n✗ Bootstrap failed:");
  if (err instanceof Stripe.errors.StripeError) {
    console.error(`  ${err.type}: ${err.message}`);
    if (err.code) console.error(`  code: ${err.code}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
