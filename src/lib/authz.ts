/**
 * Per-client authorization (RBAC for the Team / Practice / Firm tiers).
 *
 * Practiq's data model has two ways a user can have access to a Client
 * workspace:
 *
 *   1. Ownership — `Client.userId` points at the user. The owner has
 *      full rights regardless of plan tier; this is the cycle-1
 *      single-owner default and the basis of the trial UX.
 *
 *   2. Membership — a `UserClientMapping` row links the user to the
 *      client with a `role` of "owner" | "member" | "viewer". This
 *      kicks in once a Practice/Firm-tier owner invites teammates and
 *      we route work between them.
 *
 * Two important rules guard the API surface:
 *
 *   • The OWNING user's plan is what gates RBAC enforcement, not the
 *     accessing user's plan. A free / Solo owner cannot have RBAC
 *     because their tier doesn't include it; a Practice owner does,
 *     so any teammate they invite is bound by the role they were
 *     given. The accessing user's own subscription is irrelevant
 *     here — they're using the owner's workspace, not their own.
 *
 *   • When RBAC is OFF (Solo / free), every mapping is treated as
 *     "owner" so the role column is effectively dormant until the
 *     owner upgrades. That keeps the behavior identical to the
 *     pre-RBAC product for users who haven't paid for it.
 *
 * The helper is read-only and never throws on missing data — it
 * returns `{ allowed: false, role: null }` so the caller can decide
 * whether to 403 or 404. Routes typically pair this with the existing
 * pattern of looking up the client first, so a missing mapping
 * surfaces as "you can't see this client" rather than leaking which
 * client IDs exist.
 */

import { prisma } from "@/lib/prisma";
import { resolveUserPlan } from "@/lib/plan-gates";

export type ClientRole = "owner" | "member" | "viewer";

const ROLE_RANK: Record<ClientRole, number> = {
  viewer: 1,
  member: 2,
  owner: 3,
};

function isClientRole(value: unknown): value is ClientRole {
  return value === "owner" || value === "member" || value === "viewer";
}

export interface ClientAccessResult {
  /** Whether the user has at least the requested role on the client. */
  allowed: boolean;
  /**
   * The role actually held — useful for routes that need to render UI
   * differently (e.g. show "edit" buttons only to members and above).
   * `null` when the user has no relationship to the client at all.
   */
  role: ClientRole | null;
}

/**
 * Assert that `userId` has at least `requiredRole` on `clientId`.
 *
 * Resolution order:
 *   1. Load the Client. If it doesn't exist, return false / null.
 *   2. If the user is `Client.userId` (the owner), return true / "owner"
 *      regardless of plan or any mapping.
 *   3. Otherwise look up `UserClientMapping(userId, clientId)`.
 *      • No mapping → false / null.
 *      • Mapping exists → check the OWNER's plan capability for `rbac`:
 *        - rbac = false (Solo / free) → treat the mapping as "owner";
 *          allowed = true, role = "owner".
 *        - rbac = true (Practice / Firm) → use the mapping's stored
 *          role and compare against `requiredRole` via the rank table.
 */
export async function assertClientAccess(
  userId: string,
  clientId: string,
  requiredRole: ClientRole,
): Promise<ClientAccessResult> {
  if (!userId || !clientId) {
    return { allowed: false, role: null };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { userId: true },
  });
  if (!client) {
    return { allowed: false, role: null };
  }

  // Owner shortcut — the user that owns the client always has full
  // rights, full stop. No mapping lookup, no plan check.
  if (client.userId === userId) {
    return { allowed: true, role: "owner" };
  }

  const mapping = await prisma.userClientMapping.findUnique({
    where: { userId_clientId: { userId, clientId } },
    select: { role: true },
  });
  if (!mapping) {
    return { allowed: false, role: null };
  }

  // RBAC enforcement is gated by the OWNER's plan, not the accessing
  // user's. If the owner is on free / Solo, mappings collapse to
  // full-access "owner" semantics. This keeps the column dormant
  // until the owner upgrades to Practice.
  const ownerPlan = await resolveUserPlan(client.userId);
  if (!ownerPlan.capabilities.rbac) {
    return { allowed: true, role: "owner" };
  }

  const role: ClientRole = isClientRole(mapping.role) ? mapping.role : "viewer";
  const allowed = ROLE_RANK[role] >= ROLE_RANK[requiredRole];
  return { allowed, role };
}
