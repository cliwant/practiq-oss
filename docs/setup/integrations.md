# Practiq Integration Setup

The four integrations that gate full prod functionality:

| Integration | Status | Action |
|---|---|---|
| **Anthropic / OpenRouter** | OpenRouter wired (commit 515b4f9) | Add `OPENROUTER_API_KEY` to `.env.local` |
| **Stripe billing** | Code wired, products not created | Add `STRIPE_SECRET_KEY` then run bootstrap script |
| **Google OAuth** | Code wired, app not registered | Walk through Google Cloud Console steps below |
| **Microsoft Entra ID** | Code wired, app not registered | Walk through Entra portal steps below (optional) |
| **Resend (transactional email)** | ✅ FULLY OPERATIONAL — verified | No action needed |

This doc walks each one. Read whichever applies. Total time if doing all four: ~45 min.

---

## Stripe billing (≈10 min)

### What it unlocks
- `/pricing` page Start Checkout buttons go from a 503 "billing not configured" to a working Stripe-hosted checkout URL.
- Subscription lifecycle (created / renewed / canceled) round-trips through `/api/stripe/webhook` and updates the user's plan in DB.

### Prerequisites
- A Stripe account (sign up at https://dashboard.stripe.com/register if needed)
- About 10 minutes

### Step 1 — Get your Secret key

Open https://dashboard.stripe.com/apikeys (or the test-mode equivalent at https://dashboard.stripe.com/test/apikeys for dev).

Two keys you'll see:
- **Publishable key** (`pk_test_…` / `pk_live_…`) — safe to ship to browsers. **Optional for Practiq** — hosted Checkout does not require it.
- **Secret key** (`sk_test_…` / `sk_live_…`) — server-only, never exposes to client. **Required.**

For this script, the simplest path is to **create a restricted key** instead of using the full secret key. Click "Create restricted key" and grant Read+Write on:
- Products
- Prices
- Customers
- Subscriptions
- Checkout Sessions
- Webhook Endpoints

That key has just enough power for the bootstrap + production checkout flow, and nothing more.

### Step 2 — Add Secret key to `.env.local`

In `.env.local` at the repo root:

```sh
STRIPE_SECRET_KEY=sk_test_...   # or sk_live_… for prod
```

> **Production secrets:** as of 2026-05-29 production env is sourced from
> Doppler (auto-synced to Vercel), not `.env.local`. For a prod key, set
> `STRIPE_SECRET_KEY` in Doppler; the repo-root `.env.local` is local-dev /
> self-host only.

### Step 3 — Run the bootstrap script

```bash
npx tsx scripts/stripe-bootstrap.ts
```

The script creates:
- 3 products (Practiq Starter, Practiq Team, Practiq Pro)
- 3 monthly USD prices ($99 / $499 / $999)
- 1 webhook endpoint at `https://practiq.dev/api/stripe/webhook` listening for the subscription lifecycle events

Output looks like:

```
● Stripe bootstrap — TEST MODE
  Site URL:    https://practiq.dev
  Webhook URL: https://practiq.dev/api/stripe/webhook

  Practiq Starter ✓ (created product + price)
  Practiq Team    ✓ (created product + price)
  Practiq Pro     ✓ (created product + price)
  Webhook endpoint ✓ (created)

────────────────────────────────────────────────────
  Add these to .env.local at the repo root:
────────────────────────────────────────────────────

STRIPE_PRICE_STARTER=price_1234…
STRIPE_PRICE_TEAM=price_5678…
STRIPE_PRICE_PRO=price_9abc…
STRIPE_WEBHOOK_SECRET=whsec_…
```

### Step 4 — Paste those 4 vars into `.env.local`

Append the printed lines.

### Step 5 — Restart and verify

```bash
# Local dev:
npm run dev

# Or redeploy production:
npx vercel deploy --prod
```

Sign in to practiq.dev, hit `/pricing`, click any Start Checkout button. You should be redirected to a Stripe-hosted checkout URL.

### Re-running the script

Idempotent. If you run it twice:
- Existing products + prices are reused (no duplicates).
- Existing webhook endpoint is detected — but Stripe only returns the signing secret on initial creation, so the second run prints a dashboard URL where you can click "Reveal signing secret" manually.

### Switching test → live

When you're ready to take real money:
1. Replace `STRIPE_SECRET_KEY` with the live `sk_live_…` key.
2. Re-run the bootstrap script. It creates parallel products + prices in live mode (since live and test are separate Stripe environments).
3. Replace the printed `STRIPE_PRICE_*` and `STRIPE_WEBHOOK_SECRET` env vars in production deploy (Vercel dashboard or via CLI).

---

## Google OAuth (≈10 min)

### What it unlocks
A "Continue with Google" button on `/signup` and `/login`. Most boutique firm partners use Google Workspace, so this is the highest-leverage SSO to wire after LinkedIn (which is already live).

### Step 1 — Create or pick a Google Cloud project

Go to https://console.cloud.google.com/projectcreate.

Project name: `Practiq` (or whatever you like — only visible to you in the Console).

Wait ~30 seconds for the project to provision, then make sure the project picker at the top says `Practiq`.

### Step 2 — Configure the OAuth consent screen

Go to https://console.cloud.google.com/apis/credentials/consent.

- **User Type**: External (you want anyone with a Google account to sign in, not just your org).
- Click **Create**.

Fill the form:
- **App name**: `Practiq`
- **User support email**: your email (visible to users on the consent screen)
- **App logo**: optional, can add later
- **Application home page**: `https://practiq.dev`
- **Application privacy policy link**: `https://practiq.dev/privacy`
- **Application terms of service link**: `https://practiq.dev/terms`
- **Authorized domains**: add `practiq.dev`
- **Developer contact email**: your email

Click **Save and Continue**.

**Scopes** screen: click **Add or Remove Scopes**, then add the three you need:
- `openid`
- `email` (`.../auth/userinfo.email`)
- `profile` (`.../auth/userinfo.profile`)

Click **Update** → **Save and Continue**.

**Test users** screen: skip (publishing later removes the need). Click **Save and Continue**.

**Summary** screen: click **Back to Dashboard**.

While the app is in "Testing" mode, only listed test users can sign in (a 100-user cap). For production, you'll click **Publish App** later — Google does NOT require formal verification because you're only requesting non-sensitive scopes (openid/email/profile).

### Step 3 — Create the OAuth client ID

Go to https://console.cloud.google.com/apis/credentials.

Click **+ Create Credentials** → **OAuth client ID**.

- **Application type**: Web application
- **Name**: `Practiq Web`
- **Authorized JavaScript origins**:
  - `https://practiq.dev`
  - `http://localhost:3000` (dev)
- **Authorized redirect URIs**:
  - `https://practiq.dev/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google` (dev)

Click **Create**.

A modal pops up with two values:
- **Client ID** (looks like `1234567890-abc.apps.googleusercontent.com`)
- **Client Secret** (looks like `GOCSPX-…`)

Click **Download JSON** if you want a backup, then **OK**.

### Step 4 — Add to `.env.local`

```sh
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-…
```

### Step 5 — Restart, verify

```bash
npm run dev   # or redeploy
```

Visit `/login` — a "Continue with Google" button should now appear.

The provider auto-registers when both env vars are non-empty (see `src/lib/auth.ts:23-30`). No code change needed.

### Step 6 (later) — Publish the app

When you're past dev:
1. Back to https://console.cloud.google.com/apis/credentials/consent.
2. Click **Publish App**.
3. Confirm. Now any Google account can sign in (no more 100-test-user cap).

---

## Microsoft Entra ID / Office 365 SSO (≈15 min, optional)

### What it unlocks
A "Continue with Microsoft" button on `/signup` and `/login`. Most law firms with Office 365 Business expect this — important if you're targeting that vertical, optional otherwise.

### Step 1 — Register the app

Go to https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade.

Click **+ New registration**.

- **Name**: `Practiq`
- **Supported account types**: **Accounts in any organizational directory and personal Microsoft accounts (multitenant + personal)**. This makes the app accept users from any tenant. Pick "single tenant" only if you're doing a private deployment for one specific customer.
- **Redirect URI**:
  - Platform: `Web`
  - URI: `https://practiq.dev/api/auth/callback/microsoft-entra-id`

Click **Register**.

You're now on the app's Overview page. Note down:
- **Application (client) ID** — this is `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** — only used if you went single-tenant

### Step 2 — Add the dev redirect URI

Click **Authentication** in the left nav.

Under "Web" platform, click **+ Add URI** and add:
```
http://localhost:3000/api/auth/callback/microsoft-entra-id
```

Click **Save**.

### Step 3 — Create a client secret

Click **Certificates & secrets** in the left nav.

Click **+ New client secret**:
- **Description**: `Practiq production secret 2026`
- **Expires**: `24 months` (set a calendar reminder to rotate before expiry)

Click **Add**.

**Copy the secret VALUE immediately** (not the Secret ID — the long alphanumeric `Value` field). Microsoft will hide it after navigation.

### Step 4 — Configure API permissions

Click **API permissions** in the left nav.

The default `User.Read` (Microsoft Graph delegated) is enough for sign-in. No additional permissions needed for basic SSO.

If you ever add features that need more scopes (calendar, mail, etc.), come back here and add them, then click **Grant admin consent** for any tenant scopes.

### Step 5 — Add to `.env.local`

```sh
MICROSOFT_CLIENT_ID=…the-application-client-id…
MICROSOFT_CLIENT_SECRET=…the-secret-Value-you-copied…
# Optional — leave empty for multitenant, set for single-tenant deployment:
MICROSOFT_TENANT_ID=
```

### Step 6 — Restart, verify

`npm run dev` (or redeploy). Hit `/login`, expect a "Continue with Microsoft" button.

---

## Resend (transactional email) — ALREADY OPERATIONAL ✅

### Status as of 2026-04-27

Live and verified. No action needed.

```
$ curl -s -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains
{
  "object": "list",
  "has_more": false,
  "data": [{
    "id": "a3e90fd4-2104-4a32-bec6-5ea6b6ab5552",
    "name": "practiq.dev",
    "status": "verified",            ← green
    "created_at": "2026-04-12 …",
    "region": "us-east-1",
    "capabilities": {
      "sending": "enabled",          ← green
      "receiving": "disabled"
    }
  }]
}
```

DNS verified at the resolver level too:
```
practiq.dev               TXT  v=spf1 include:_spf.resend.com ~all   (set)
resend._domainkey…        TXT  …DKIM public key…                     (set)
```

### What was previously listed as "user-blocked: Resend DNS verify"

That item was stale. The Resend domain `practiq.dev` was verified on 2026-04-12 (15 days ago). SPF + DKIM are both live in Cloudflare DNS. Both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (`*@practiq.dev`) are populated in `.env.local` for local dev; in production (as of 2026-05-29) they are sourced from Doppler and auto-synced to Vercel.

Outbound mail from welcome / verification / password-reset / team-invite flows is hitting recipient inboxes through the verified domain (no `onboarding@resend.dev` sandbox any more). If a user reports a missing email, the bottleneck is the recipient side (gmail spam folder, corporate filter), not Resend.

### How to verify yourself anytime

```bash
# Check domain status:
curl -s -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains | jq

# Send a test email through the email lib (run from the repo root):
npx tsx -e "
import { send } from '@/lib/email/send';
await send({ to: 'YOUR_TEST_INBOX@…', subject: 'Practiq email test', html: '<p>It works.</p>' });
"
```

### When you'd need to revisit Resend

Only if:
1. The Resend dashboard shows the domain status flipping from `verified` to `pending` or `failure` (DNS records were removed/changed at Cloudflare). Action: re-add the records from https://resend.com/domains/practiq.dev.
2. You change the from-domain (e.g. moving to a sub-domain like `mail.practiq.dev`). Action: register the new domain in Resend, add new DNS records, update `RESEND_FROM_EMAIL`.

Neither is in the current cycle plan.

---

## Verification checklist

After all 4 are done:

- [ ] `/pricing` Start Checkout button goes through to `https://checkout.stripe.com/…`
- [ ] `/login` shows "Continue with Google" button
- [ ] `/login` shows "Continue with LinkedIn" button (already live)
- [ ] `/login` shows "Continue with Microsoft" button (only if you did Step 4)
- [ ] Sign up → receive welcome email at the address you used
- [ ] curl Resend domain API → `"status": "verified"`
- [ ] `/api/stripe/webhook` receives + verifies a test event from Stripe Dashboard's "Send test webhook" tool

If any of these fail, check the dev server log: run `npm run dev` from the repo root and watch stderr.
