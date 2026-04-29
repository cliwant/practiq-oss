/**
 * Verify-email + reset-password token consumption spec.
 *
 * The Round 7 auth-flows spec covered the page rendering + bogus-token
 * paths. This spec covers the DB-write paths by fabricating a real
 * VerificationToken row in the practiq schema, then submitting it to
 * the corresponding POST endpoint, and verifying the user's row got
 * the right side-effect (User.emailVerified set; passwordHash changed).
 *
 * What we cover:
 *   t01 — POST /api/auth/verify-email with no token → 400
 *   t02 — POST /api/auth/verify-email with bogus token → 400
 *   t03 — POST /api/auth/verify-email with a valid pending token →
 *         200 + User.emailVerified set to a recent timestamp; second
 *         call returns 200 alreadyVerified=true (idempotent)
 *   t04 — POST /api/auth/reset-password with missing fields → 400
 *   t05 — POST /api/auth/reset-password with short password → 400
 *   t06 — POST /api/auth/reset-password with valid token + 12-char
 *         password → 200; subsequent re-use of the same token → 400
 *         (one-shot consumption); passwordHash on User actually changed.
 *
 * All token + user setup goes through Supabase Management API so the
 * spec doesn't need a Postgres connection.
 */
import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";
const SUPABASE_PROJECT_REF = "pyzcgemrkoeusrrbhazv";
const SUPABASE_API = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

async function supabaseQuery<T = unknown>(
  token: string,
  sql: string,
): Promise<T> {
  const resp = await fetch(SUPABASE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!resp.ok) {
    throw new Error(
      `Supabase query failed (${resp.status}): ${(await resp.text()).slice(0, 200)}`,
    );
  }
  return (await resp.json()) as T;
}

function sqlEscape(s: string) {
  return s.replace(/'/g, "''");
}

test.describe.configure({ mode: "serial" });

test.describe("Verify-email + reset-password token DB-write paths", () => {
  let supabaseToken: string;

  test.beforeAll(() => {
    const sb = process.env.SUPABASE_ACCESS_TOKEN;
    if (!sb) {
      throw new Error(
        "SUPABASE_ACCESS_TOKEN required. Run with `dotenv -o -e ../../.env.local -- ...`.",
      );
    }
    supabaseToken = sb;
  });

  test("t01 — verify-email with no token → 400", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/auth/verify-email`, {
      data: {},
    });
    expect(resp.status()).toBe(400);
  });

  test("t02 — verify-email with bogus token → 400", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/auth/verify-email`, {
      data: { token: `bogus-${Date.now()}` },
    });
    expect(resp.status()).toBe(400);
  });

  test("t03 — valid pending verify-email token → User.emailVerified set; idempotent on retry", async ({
    request,
  }) => {
    const ts = Date.now();
    const email = `t03-verify-${ts}@practiq-test.cliwant.com`;
    const tokenStr = `t03-token-${ts}-${Math.random().toString(36).slice(2, 10)}`;

    // Provision: user + token. Future expiry, not yet consumed.
    await supabaseQuery(
      supabaseToken,
      `INSERT INTO practiq.users (id, email, password_hash, name, firm_vertical, timezone, updated_at)
       VALUES (gen_random_uuid(), '${sqlEscape(email)}', 'placeholder', 'T03', 'accounting', 'America/New_York', now());`,
    );
    const user = await supabaseQuery<Array<{ id: string }>>(
      supabaseToken,
      `SELECT id FROM practiq.users WHERE email = '${sqlEscape(email)}';`,
    );
    expect(user).toHaveLength(1);
    const userId = user[0].id;

    await supabaseQuery(
      supabaseToken,
      `INSERT INTO practiq.verification_tokens (id, user_id, kind, token, expires_at, created_at)
       VALUES (gen_random_uuid(), '${userId}', 'verify_email', '${sqlEscape(tokenStr)}',
               now() + interval '24 hours', now());`,
    );

    // First consume — should succeed and set emailVerified.
    const resp1 = await request.post(`${BASE_URL}/api/auth/verify-email`, {
      data: { token: tokenStr },
    });
    expect(resp1.status()).toBe(200);

    const verified = await supabaseQuery<Array<{ email_verified: string | null }>>(
      supabaseToken,
      `SELECT email_verified FROM practiq.users WHERE id = '${userId}';`,
    );
    expect(verified[0].email_verified).not.toBeNull();

    // Second consume — alreadyVerified path, also 200.
    const resp2 = await request.post(`${BASE_URL}/api/auth/verify-email`, {
      data: { token: tokenStr },
    });
    expect(resp2.status()).toBe(200);
    const body2 = await resp2.json();
    expect(body2.alreadyVerified).toBe(true);

    // Cleanup.
    await supabaseQuery(
      supabaseToken,
      `DELETE FROM practiq.verification_tokens WHERE token = '${sqlEscape(tokenStr)}';
       DELETE FROM practiq.users WHERE id = '${userId}';`,
    );
  });

  test("t04 — reset-password missing fields → 400", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { token: "anything" },
    });
    expect(resp.status()).toBe(400);
  });

  test("t05 — reset-password too-short password → 400", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { token: "anything", password: "short" },
    });
    expect(resp.status()).toBe(400);
  });

  test("t06 — valid reset-password token → password actually changes; second use → 400", async ({
    request,
  }) => {
    const ts = Date.now();
    const email = `t06-reset-${ts}@practiq-test.cliwant.com`;
    const tokenStr = `t06-token-${ts}-${Math.random().toString(36).slice(2, 10)}`;
    const oldHash = await bcrypt.hash(`old-pw-${ts}`, 12);

    await supabaseQuery(
      supabaseToken,
      `INSERT INTO practiq.users (id, email, password_hash, name, firm_vertical, timezone, updated_at)
       VALUES (gen_random_uuid(), '${sqlEscape(email)}', '${sqlEscape(oldHash)}',
               'T06', 'accounting', 'America/New_York', now());`,
    );
    const user = await supabaseQuery<Array<{ id: string }>>(
      supabaseToken,
      `SELECT id FROM practiq.users WHERE email = '${sqlEscape(email)}';`,
    );
    const userId = user[0].id;

    await supabaseQuery(
      supabaseToken,
      `INSERT INTO practiq.verification_tokens (id, user_id, kind, token, expires_at, created_at)
       VALUES (gen_random_uuid(), '${userId}', 'password_reset', '${sqlEscape(tokenStr)}',
               now() + interval '1 hour', now());`,
    );

    // First use — should succeed.
    const newPw = `NewPassword!${ts}`;
    const resp1 = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { token: tokenStr, password: newPw },
    });
    expect(resp1.status()).toBe(200);

    const updated = await supabaseQuery<Array<{ password_hash: string | null }>>(
      supabaseToken,
      `SELECT password_hash FROM practiq.users WHERE id = '${userId}';`,
    );
    expect(updated[0].password_hash).not.toBe(oldHash);
    expect(updated[0].password_hash).not.toBeNull();
    // Confirm the hash actually validates the new password.
    expect(
      await bcrypt.compare(newPw, updated[0].password_hash as string),
    ).toBe(true);

    // Second use — should fail (token already consumed).
    const resp2 = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { token: tokenStr, password: newPw },
    });
    expect(resp2.status()).toBe(400);

    // Cleanup.
    await supabaseQuery(
      supabaseToken,
      `DELETE FROM practiq.verification_tokens WHERE token = '${sqlEscape(tokenStr)}';
       DELETE FROM practiq.users WHERE id = '${userId}';`,
    );
  });
});
