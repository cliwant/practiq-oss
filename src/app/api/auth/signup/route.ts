import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeInviteToken } from "@/lib/team-invites";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail as sequenceWelcomeEmail } from "@/lib/email/sequences";
import { trackEvent as trackAnalyticsEvent } from "@/lib/analytics/track";
import {
  checkRateLimit,
  identityFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { seedSampleClient } from "@/lib/onboarding/seed-sample-client";
import { safeNotify } from "@/lib/notifications/slack";
import { notifyServerError } from "@/lib/observability/notify-server-error";
import {
  trackServerEvent,
  flushServerEvents,
  posthogClient,
} from "@/lib/analytics/posthog-server";

const ALLOWED_VERTICALS = new Set([
  "accounting",
  "law",
  "consulting",
  "hr",
  "agency",
  "advisory",
  "other",
]);

/**
 * POST /api/auth/signup
 *
 * Creates a new User row with hashed password + optional firmVertical
 * seeded from the signup form. Returns 201 on success, 400/409 on
 * validation/dup, 500 on server error. Post-creation the client side
 * calls next-auth's signIn("credentials") for the session bootstrap.
 */
export async function POST(request: NextRequest) {
  // Rate limit: 5 signup attempts per IP per hour. Prevents script-
  // kiddie account creation spam.
  const rl = await checkRateLimit({
    namespace: "auth/signup",
    identity: identityFromRequest(request),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          email?: string;
          password?: string;
          name?: string;
          firmVertical?: string;
          firmName?: string;
          inviteToken?: string;
        }
      | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const name = body.name?.trim() || null;
    const firmVertical = body.firmVertical?.trim() || null;
    const firmName = body.firmName?.trim() || null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Beta-launch invite gate. Default is open (any email may sign up)
    // — flip the env vars below when we want the gate to enforce.
    //
    //   BETA_OPEN_SIGNUP=1         → unconditional open (default)
    //   BETA_OPEN_SIGNUP unset/0 + BETA_ALLOWLIST_EMAILS=a@x.com,b@y.com
    //                              → only those exact addresses, OR an
    //                                explicit team inviteToken, may
    //                                proceed
    //   BETA_OPEN_SIGNUP unset/0 + BETA_ALLOWLIST_EMAILS unset
    //                              → everything is blocked except team
    //                                inviteToken redemptions
    //
    // Domain-level allowlist (e.g. accept anyone @some-cpa-firm.com)
    // is intentionally NOT supported here — beta enrollment is one
    // person at a time so we know who's in.
    const betaOpen = process.env.BETA_OPEN_SIGNUP === "1";
    if (!betaOpen && !body.inviteToken) {
      const allowlist = (process.env.BETA_ALLOWLIST_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0);
      if (!allowlist.includes(email)) {
        return NextResponse.json(
          {
            error:
              "Practiq is invite-only during the beta. Request access at https://practiq.dev/early-access — we'll send an invite as soon as a slot opens.",
          },
          { status: 403 },
        );
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (firmVertical && !ALLOWED_VERTICALS.has(firmVertical)) {
      return NextResponse.json(
        { error: "Unknown firm vertical" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        firmName,
        firmVertical,
      },
      select: { id: true, email: true, name: true, firmVertical: true },
    });

    // Consume a team invite token if one was passed. Silently no-ops
    // on invalid / expired / email-mismatch so the signup itself still
    // succeeds — the user can request a fresh invite afterward.
    let invite = null;
    if (body.inviteToken) {
      invite = await consumeInviteToken(body.inviteToken, user.id, email);
    }

    // Seed a sample client unless the new user joined via a team
    // invite (in which case they'll inherit shared firm clients and
    // a sample would be confusing). Non-blocking on failure — sample
    // data is a nice-to-have, not a signup blocker.
    if (!invite) {
      try {
        await seedSampleClient({ userId: user.id });
      } catch (err) {
        console.error("[signup] sample-client seed failed:", err);
      }
    }

    // Fire a welcome email. Non-blocking — delivery failure must not
    // break signup. The underlying sendEmail() dev-logs when Resend
    // isn't configured so nothing silently disappears.
    const firstNameRaw =
      (name ?? email).split(/[@\s]/)[0].replace(/[^a-zA-Z]/g, "");
    const firstName =
      firstNameRaw.length > 0
        ? firstNameRaw[0].toUpperCase() + firstNameRaw.slice(1)
        : "";
    const mail = sequenceWelcomeEmail({
      id: user.id,
      email: user.email,
      firstName,
      firmVertical: firmVertical ?? null,
    });
    sendEmail({ to: email, ...mail, tag: "sequence-welcome" })
      .then(() => {
        // Idempotency marker for the day3/7/14 cron — the cron queries
        // `practiq.analytics_events` for this row before sending the
        // next step, so a re-run is a no-op. PostHog mirror is for
        // dashboard correlation; the SQL-queryable row is what gates
        // the cron.
        void trackAnalyticsEvent({
          type: "sequence_email_sent",
          userId: user.id,
          properties: { step: "welcome" },
        });
        trackServerEvent(user.id, "sequence_email_sent", {
          step: "welcome",
        });
      })
      .catch((err) => {
        console.error("[signup] welcome email failed:", err);
      });

    // Fire-and-forget Slack ping. Production lever: every real signup
    // hits the #venture-practiq channel within seconds, so the operator
    // never misses an inflow event. Errors swallowed inside safeNotify.
    safeNotify("practiq_signup", {
      email: user.email,
      name: user.name ?? null,
      firmName,
      firmVertical: user.firmVertical,
      userId: user.id,
      provider: "credentials",
    });

    // PostHog conversion event — server-side so ad-blockers can't drop
    // it. distinct_id is the user's DB id so this stitches to client
    // identify() afterward via posthog-client.identifyUser().
    trackServerEvent(user.id, "signup_completed", {
      provider: "credentials",
      firmVertical: user.firmVertical ?? null,
      hasInviteToken: Boolean(body.inviteToken),
    });

    // PostHog identity stitching: alias the anonymous visitor cookie
    // (practiq_visitor) to the new userId so the pre-signup activity
    // trail joins to the authenticated user. identify() also enriches
    // the user profile with email + name + vertical for cohort analysis.
    if (posthogClient) {
      try {
        const cookieDistinctId = request.cookies.get("practiq_visitor")?.value;
        posthogClient.identify({
          distinctId: user.id,
          properties: {
            email: user.email,
            name: user.name ?? undefined,
            firm_vertical: user.firmVertical ?? undefined,
            firm_name: firmName ?? undefined,
          },
        });
        if (cookieDistinctId && cookieDistinctId !== user.id) {
          posthogClient.alias({
            distinctId: user.id,
            alias: cookieDistinctId,
          });
        }
      } catch (err) {
        console.warn("[posthog] identify/alias failed:", err);
      }
    }
    // Drain the queue before returning so Vercel cold-shutdown doesn't
    // drop the event. flushServerEvents is idempotent + cheap.
    await flushServerEvents();

    return NextResponse.json({ user, invite }, { status: 201 });
  } catch (error) {
    notifyServerError("signup", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
