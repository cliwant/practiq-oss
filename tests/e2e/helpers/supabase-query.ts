/**
 * Tiny wrapper around the Supabase Management API for E2E DB assertions.
 *
 * Used when a test needs to confirm "the POST returned 200 — but did the
 * row actually land?" The application's Supabase client uses the
 * `practiq` schema with the secret service-role key; here we go one
 * level above that to the Management API which executes raw SQL
 * against the project's database with a Supabase Access Token.
 *
 * The project ref is hard-coded — it's the studio's single Supabase
 * project and never changes per environment. If you ever stand up a
 * staging Supabase project this becomes an env var.
 *
 * Token strategy (matches founding-slot-cleanup.spec.ts):
 *   - SUPABASE_ACCESS_TOKEN lives in studio-root .env.local.
 *   - CI must wire it up as a repo secret + pass it via env on the e2e
 *     workflow. If the token is absent, tests that need it should
 *     `test.skip()` themselves — every spec MUST tolerate the missing
 *     token gracefully so local devs without it can still run the rest.
 */

const SUPABASE_PROJECT_REF = "pyzcgemrkoeusrrbhazv";
const SUPABASE_API = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

export interface SupabaseQueryOpts {
  /** Override the token (defaults to process.env.SUPABASE_ACCESS_TOKEN). */
  token?: string;
}

/**
 * Execute one SQL statement against the studio's Supabase project and
 * return the parsed JSON response. Throws on non-2xx or token absence.
 */
export async function supabaseQuery<T = unknown>(
  sql: string,
  opts: SupabaseQueryOpts = {},
): Promise<T> {
  const token = opts.token ?? process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN missing. Set it in studio-root .env.local or as a GitHub repo secret.",
    );
  }
  const resp = await fetch(SUPABASE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Supabase query failed (${resp.status}): ${text.slice(0, 300)}`,
    );
  }
  return (await resp.json()) as T;
}

/**
 * Helper: SQL-escape a string literal. The Management API doesn't
 * support parameter binding — we splice literals into the SQL text.
 * Keep this tight: doubled single quotes are the only thing that
 * matters for the values our tests embed (emails, IDs, short strings).
 */
export function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Check whether the access token is wired up. Specs that need DB
 * assertions can call this in `test.beforeAll` to decide between
 * "full coverage" and "skip the DB-verification leg" gracefully.
 */
export function hasSupabaseToken(): boolean {
  return Boolean(process.env.SUPABASE_ACCESS_TOKEN);
}
