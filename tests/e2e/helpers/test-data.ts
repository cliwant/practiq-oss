/**
 * Per-spec test data factory.
 *
 * Every spec mints its own fresh email/firm/etc. so reruns of the suite
 * never collide on UNIQUE constraints in the DB. The email pattern
 *
 *   seungdo+e2e-<spec>-<timestamp>@grindworks.ai
 *
 * is intentional:
 *   - The "+" sub-address routes everything back to the operator's
 *     real inbox (grindworks.ai is a real domain we own).
 *   - The <spec> segment makes filtering DB rows trivial when triaging.
 *   - The <timestamp> guarantees uniqueness within a single run AND
 *     across reruns.
 *
 * Convention (carried over from the dogfood agent pattern): we do NOT
 * delete test rows after the run. They persist in production DB for
 * operator inspection — which is how we caught the `required` attribute
 * regression on /signup in the first place. Reverse-chronological
 * inspection of these rows is a debugging tool, not garbage.
 */

export interface TestEmailParts {
  /** Full email — what goes into the form. */
  email: string;
  /** Bare local part (left of @) — for log messages. */
  localPart: string;
  /** ISO-ish timestamp suffix — useful to include in firm names so a
   *  human triaging the DB can correlate row → spec → run. */
  timestamp: string;
}

/**
 * Mint a unique email + correlated firm name for one test.
 *
 * @example
 *   const { email, firmName } = freshTestIdentity("workflow-audit");
 *   // email     = "seungdo+e2e-workflow-audit-1715701234567@grindworks.ai"
 *   // firmName  = "E2E Workflow Audit Firm 1715701234567"
 */
export function freshTestIdentity(spec: string): {
  email: string;
  localPart: string;
  timestamp: string;
  name: string;
  firmName: string;
} {
  const timestamp = String(Date.now());
  const slug = spec.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const localPart = `seungdo+e2e-${slug}-${timestamp}`;
  const email = `${localPart}@grindworks.ai`;
  const titleCased = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    email,
    localPart,
    timestamp,
    name: `E2E ${titleCased}`,
    firmName: `E2E ${titleCased} Firm ${timestamp}`,
  };
}

/**
 * Strong-but-deterministic password. NextAuth credentials + bcrypt cost
 * 12 means signups take ~150ms — there's no win from per-run variation.
 */
export const TEST_PASSWORD = "Practiq-E2E-2026!";
