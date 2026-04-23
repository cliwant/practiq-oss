/**
 * Smoke-test a Postgres connection from env vars.
 * Usage:
 *   dotenv -e <env-file> -- node scripts/test-prod-db.mjs
 * or simply export DATABASE_URL (and optionally DIRECT_URL) before invoking.
 */
import pg from "pg";

const poolerUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL ?? poolerUrl;

if (!poolerUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

console.log("direct len:", directUrl.length, "| pooler len:", poolerUrl.length);

async function test(label, url) {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    const r = await client.query(
      "select current_database() as db, current_user as u, current_setting('server_version') as v",
    );
    console.log(
      `[${label}] OK - db:${r.rows[0].db} user:${r.rows[0].u} pg:${r.rows[0].v}`,
    );
  } catch (e) {
    console.error(`[${label}] FAIL:`, e.message);
  } finally {
    await client.end().catch(() => {});
  }
}

await test("direct", directUrl);
if (directUrl !== poolerUrl) {
  await test("pooler", poolerUrl);
}
