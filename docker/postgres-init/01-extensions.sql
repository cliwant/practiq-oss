-- Runs once on first Postgres init (docker-entrypoint-initdb.d).
-- The Practiq schema declares a pgvector column
-- (ClientContext.content_embedding = vector(1024)), so the `vector` type
-- must exist before `prisma db push` runs in the web container's entrypoint.
-- The schema doesn't manage the extension via Prisma, so create it here.
-- Requires a pgvector-capable image (see docker-compose.yml: pgvector/pgvector).
CREATE EXTENSION IF NOT EXISTS vector;
