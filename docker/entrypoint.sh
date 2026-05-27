#!/bin/sh
# Practiq web container entrypoint.
# Waits for Postgres, syncs the database schema, then execs the Next.js server.

set -e

echo "[practiq] Waiting for Postgres ..."
# The docker-compose postgres health-check is the real gate; this is a backup
# so the schema sync below never races a not-yet-listening database.
i=1
while [ "$i" -le 10 ]; do
  if node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.end()).then(()=>process.exit(0)).catch(()=>process.exit(1));" 2>/dev/null; then
    echo "[practiq] Postgres reachable."
    break
  fi
  echo "[practiq] Attempt $i/10 — Postgres not ready yet, waiting 3s..."
  i=$((i + 1))
  sleep 3
done

# Sync the schema. This repo ships WITHOUT a prisma/migrations/ folder (the
# project used `db push` throughout), so first-boot uses `db push` to create
# the schema idempotently. Schema + datasource are resolved from
# prisma.config.ts, so no --schema flag is needed.
#
# Note for production self-hosters: `db push` is for schema sync on a database
# you control. We deliberately do NOT pass --accept-data-loss, so a destructive
# schema diff fails loudly instead of silently dropping your data. On a fresh
# database (first boot, or the CI smoke test) there is nothing to lose and the
# push applies cleanly. See docs/self-host.md for the migrations-based path.
echo "[practiq] Syncing database schema (prisma db push)..."
# NOTE: Prisma 7's `db push` removed the --skip-generate flag (it errors and
# prints help). The Prisma client is already generated into the image, so a
# plain push is what we want.
npx prisma db push

echo "[practiq] Starting Next.js server..."
exec "$@"
