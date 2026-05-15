import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { isStripeConfigured } from "@/lib/stripe/client";
import { PLANS, PER_CLIENT_PRICING, PRICING_TIERS } from "@/lib/stripe/plans";
import { SettingsShell } from "@/components/settings/settings-shell";

export const dynamic = "force-dynamic";

/**
 * /app/settings — operator self-service: profile, billing, agent prefs.
 *
 * Server component: fetches the user + subscription + usage counters
 * and hands the hydrated state to the client-side SettingsShell which
 * runs tabbed forms.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; checkout?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/app/settings");

  const params = (await searchParams) ?? {};
  const initialTab =
    params.tab === "billing" ||
    params.tab === "agent" ||
    params.tab === "team"
      ? params.tab
      : "profile";
  const checkoutSuccess = params.checkout === "success";

  const user = await withDbRetry(() =>
    prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      firmName: true,
      firmVertical: true,
      timezone: true,
      briefingEnabled: true,
      briefingHour: true,
      stripeCustomerId: true,
      preferredModel: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          // Stage 3c per-client fields
          tier: true,
          clientCount: true,
          foundingLockedAt: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          seatCount: true,
        },
      },
      _count: {
        select: { clients: true, contexts: true, approvalItems: true },
      },
    },
  }),
  );
  if (!user) redirect("/login");

  // Month-to-date usage counters for Billing tab.
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  // Serial with retry wrapper — parallel Promise.all trips the
  // prisma-dev pool on idle-timeout reclaim (see lib/db-retry.ts).
  const chatCalls = await withDbRetry(() =>
    prisma.usageEvent.count({
      where: { userId: user.id, kind: "chat", createdAt: { gte: since } },
    }),
  );
  const agentRuns = await withDbRetry(() =>
    prisma.usageEvent.count({
      where: {
        userId: user.id,
        kind: "agent_run",
        createdAt: { gte: since },
      },
    }),
  );
  const mtdUsage = await withDbRetry(() =>
    prisma.usageEvent.aggregate({
      where: { userId: user.id, createdAt: { gte: since } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
  );

  const currentPlan = user.subscription
    ? PLANS[user.subscription.plan as keyof typeof PLANS] ?? null
    : null;

  // Stage 3e: aggregate firm-wide credit balance (BigInt → string for
  // JSON serialization since BigInt is not natively JSON-serializable).
  // 0 when the user has no credit packs or has consumed all of them.
  const creditAgg = await withDbRetry(() =>
    prisma.credit.aggregate({
      where: { userId: user.id },
      _sum: { tokensRemaining: true },
    }),
  );
  const creditBalanceTokens = (creditAgg._sum.tokensRemaining ?? BigInt(0)).toString();

  // Stage 3e: per-client display name resolution. Falls back to legacy
  // plan name when subscription is on a legacy per-seat tier.
  const tierDisplayName =
    user.subscription?.tier === "founding"
      ? PRICING_TIERS.founding.publicName
      : user.subscription?.tier === "standard"
        ? PRICING_TIERS.standard.publicName
        : null;
  const tierPricePerClientUsd =
    user.subscription?.tier === "founding"
      ? PER_CLIENT_PRICING.foundingPricePerClientUsd
      : user.subscription?.tier === "standard"
        ? PER_CLIENT_PRICING.standardPricePerClientUsd
        : null;

  return (
    <SettingsShell
      initialTab={initialTab}
      checkoutSuccess={checkoutSuccess}
      stripeConfigured={isStripeConfigured()}
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        firmName: user.firmName,
        firmVertical: user.firmVertical,
        timezone: user.timezone,
        briefingEnabled: user.briefingEnabled,
        briefingHour: user.briefingHour,
        stripeCustomerId: user.stripeCustomerId,
        preferredModel: user.preferredModel,
        createdAt: user.createdAt.toISOString(),
      }}
      stats={{
        clients: user._count.clients,
        contexts: user._count.contexts,
        approvalItems: user._count.approvalItems,
        mtdChatCalls: chatCalls,
        mtdAgentRuns: agentRuns,
        mtdInputTokens: mtdUsage._sum.inputTokens ?? 0,
        mtdOutputTokens: mtdUsage._sum.outputTokens ?? 0,
      }}
      subscription={
        user.subscription
          ? {
              plan: user.subscription.plan,
              planName: tierDisplayName ?? currentPlan?.publicName ?? user.subscription.plan,
              // Stage 3c per-client fields. tier is null for legacy
              // per-seat subs — the UI falls back to legacy display
              // (planName + seatCount) for those.
              tier: user.subscription.tier as
                | "trial"
                | "founding"
                | "standard"
                | null,
              clientCount: user.subscription.clientCount,
              foundingLockedAt:
                user.subscription.foundingLockedAt?.toISOString() ?? null,
              pricePerClientUsd: tierPricePerClientUsd,
              status: user.subscription.status,
              currentPeriodEnd:
                user.subscription.currentPeriodEnd.toISOString(),
              cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
              seatCount: user.subscription.seatCount,
            }
          : null
      }
      creditBalanceTokens={creditBalanceTokens}
    />
  );
}
