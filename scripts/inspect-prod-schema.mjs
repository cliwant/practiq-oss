/**
 * Inspect user-visible tables and views in the current Postgres database.
 * Prints one line per table/view, grouped by schema. Also shows any views
 * that depend on tables in the `public` schema — useful when planning a
 * destructive migration.
 *
 * Usage:
 *   dotenv -e <env-file> -- node scripts/inspect-prod-schema.mjs
 * or export DIRECT_URL (or DATABASE_URL) before invoking.
 */
import pg from "pg";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error("DIRECT_URL or DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const tables = await client.query(`
  select table_schema, table_name, table_type
  from information_schema.tables
  where table_schema not in ('pg_catalog', 'information_schema', 'pg_toast', 'auth', 'storage',
    'extensions', 'realtime', 'supabase_functions', 'supabase_migrations', 'pgsodium', 'pgsodium_masks',
    'graphql', 'graphql_public', 'net', 'vault')
  order by table_schema, table_name
`);
console.log(`Found ${tables.rows.length} user tables/views:`);
for (const row of tables.rows) {
  console.log(`  ${row.table_schema}.${row.table_name} (${row.table_type})`);
}

const viewDeps = await client.query(`
  select dependent_ns.nspname as dep_schema,
         dependent_view.relname as dep_view,
         source_ns.nspname as src_schema,
         source_table.relname as src_table
  from pg_depend d
  join pg_rewrite rw on rw.oid = d.objid
  join pg_class dependent_view on dependent_view.oid = rw.ev_class
  join pg_class source_table on source_table.oid = d.refobjid
  join pg_namespace dependent_ns on dependent_ns.oid = dependent_view.relnamespace
  join pg_namespace source_ns on source_ns.oid = source_table.relnamespace
  where dependent_view.relkind in ('v', 'm')
    and source_ns.nspname = 'public'
    and dependent_view.oid <> source_table.oid
  order by dep_schema, dep_view
`);
console.log(`\nView dependencies on public tables:`);
for (const row of viewDeps.rows) {
  console.log(`  ${row.dep_schema}.${row.dep_view} depends on ${row.src_schema}.${row.src_table}`);
}

await client.end();
