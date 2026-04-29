/**
 * Beta feedback intake endpoint.
 *
 * Beta-launch UX: paid + trial users have an in-app way to send a
 * bug report or product question without leaving the app. We persist
 * to AnalyticsEvent (so it shows up in /admin/analytics) AND fire a
 * Slack alert (warning severity) so the operator sees feedback in
 * near-real-time.
 *
 * Anonymous users are deliberately rejected — beta feedback is
 * scoped to authenticated users so we know who said what. (If we
 * later want public bug-reporting, that's a separate endpoint with
 * a different rate limit.)
 *
 * Rate limit: 5 / user / hour. Most beta feedback is a couple
 * messages a week; 5/h is generous for any legitimate bug
 * burst-report and protects against runaway client-side loops.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeNotify } from "@/lib/notifications/slack";
import { notifyServerError } from "@/lib/observability/notify-server-error";

const FeedbackSchema = z.object({
  // "bug" / "feature" / "praise" / "question" / "other" — kept open
  // because operator categorization is more useful than enforcing
  // a specific taxonomy here.
  kind: z.string().min(1).max(40).default("other"),
  message: z.string().min(5).max(4000),
  // Optional context the client widget can capture and forward —
  // current page path, viewport, last error seen. None required.
  context: z
    .object({
      path: z.string().max(200).optional(),
      userAgent: z.string().max(400).optional(),
      lastError: z.string().max(2000).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit({
    namespace: "feedback",
    identity: session.user.id,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error:
          "Slow down — too many feedback submissions. Try again in an hour or email support@practiq.dev directly.",
      },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof FeedbackSchema>;
  try {
    parsed = FeedbackSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof z.ZodError
            ? err.issues[0]?.message ?? "Invalid feedback payload"
            : "Invalid feedback payload",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        type: "beta_feedback",
        userId: session.user.id,
        properties: {
          kind: parsed.kind,
          message: parsed.message,
          path: parsed.context?.path ?? null,
          userAgent: parsed.context?.userAgent ?? null,
          lastError: parsed.context?.lastError ?? null,
          submittedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    notifyServerError("feedback/persist", err, { userId: session.user.id });
    // Don't fail the user — at least try the Slack ping below so the
    // feedback isn't lost.
  }

  // Slack ping — warning severity per the L6 hygiene tiers; the
  // feedback channel surfaces these without flooding.
  safeNotify(
    "error", // re-use the existing 'error' notification type for now;
             // a dedicated 'beta_feedback' formatter is a 5-line follow-up
    {
      where: "beta_feedback",
      kind: parsed.kind,
      userId: session.user.id,
      email: session.user.email,
      message: parsed.message.slice(0, 2000),
      path: parsed.context?.path ?? "(unknown)",
    },
    { severity: "warning" },
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
