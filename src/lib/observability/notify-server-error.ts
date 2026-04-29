/**
 * notifyServerError — single helper that logs an error AND fires a
 * Slack alert.
 *
 * Wires up the missing alert path on critical user-facing endpoints.
 * Round 11 audit found 33 console.error sites in src/app/api +
 * src/lib but only 3 also called safeNotify("error", ...). That meant
 * a real user hitting a 500 on /api/auth/signup (like the P2022
 * schema bug caught earlier today) would get a generic "Internal
 * server error" reply with no operator alerting — only a Vercel log
 * line that the operator has to know to grep for.
 *
 * Usage in catch blocks:
 *
 *   } catch (error) {
 *     notifyServerError("signup", error);
 *     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
 *   }
 *
 * Side-effect safety: never throws. The Slack notification is
 * fire-and-forget (safeNotify already eats its own failures), the
 * console.error always runs, and the function itself is awaited only
 * if the caller wants to. The argument shape stays narrow so adopting
 * this helper across the 30+ call sites is a mechanical search-and-
 * replace.
 *
 * Why not just make console.error auto-Slack: we don't want every
 * `console.error("oh that prisma update failed but we caught it")`
 * to ping the operator. This helper is for paths where the catch
 * means "the user got a 5xx" — that's a strict subset.
 */

import { safeNotify } from "@/lib/notifications/slack";

/**
 * Extra structured context — userId, requestId, clientId, etc.
 * The helper passes these straight through to the Slack payload + the
 * console line so Vercel logs and the alert agree on the shape.
 */
export type NotifyContext = Record<string, unknown>;

export function notifyServerError(
  where: string,
  error: unknown,
  context: NotifyContext = {},
): void {
  // 1. Always log to stdout so Vercel-logs / `--query` paths still find it.
  console.error(`[${where}] error:`, error, context);

  // 2. Fire-and-forget Slack — operator wants to know NOW, not next
  // log review. safeNotify swallows its own failures internally.
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error).slice(0, 500);

  safeNotify("error", {
    where,
    message,
    ...context,
  });
}
