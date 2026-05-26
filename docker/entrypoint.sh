#!/bin/sh
# Practiq web container entrypoint.
# Runs Prisma migrations idempotently then execs the Next.js standalone server.

set -e

echo "[practiq] Waiting for Postgres at $DATABASE_URL ..."
# Simple wait — postgres health-check in docker-compose is the real gate,
# this is a backup.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if node -e "
    const c = require('pg').Client ? new (require('pg').Client)(process.env.DATABASE_URL) : null;
    if (!c) process.exit(1);
    c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "[practiq] Postgres reachable."
    break
  fi
  echo "[practiq] Attempt $i/10 — Postgres not ready yet, waiting 3s..."
  sleep 3
done

echo "[practiq] Running Prisma migrations..."
# `migrate deploy` is the production-safe Prisma command. It only runs migrations
# already in `prisma/migrations/`; never opens an interactive prompt. Idempotent.
cd /app && npx prisma migrate deploy --schema=./apps/web/prisma/schema.prisma

echo "[practiq] Starting Next.js server..."
exec "$@"
