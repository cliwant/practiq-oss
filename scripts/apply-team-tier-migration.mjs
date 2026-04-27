// Applies the Team-tier paper-feature migration via the Supabase
// Management API since the direct Postgres connection (SASL auth) has
// been unreliable from this environment. Reads the access token from
// the studio-root .env.local and the project ref from the Supabase URL.
//
// What this migrates:
//   - approval_items: add assignee_id (uuid, nullable, FK→users.id) and
//     assigned_at (timestamptz, nullable). Index (assignee_id, status).
//   - founding_slots: new singleton table with claimed_count, cap, and
//     updated_at. Seeded with one row id='singleton'.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(__dirname, "..", "..", "..");
const envPath = path.join(studioRoot, ".env.local");

if (!fs.existsSync(envPath)) {
  console.error(`Missing studio .env.local at ${envPath}`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf-8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      let v = l.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, idx).trim(), v];
    }),
);

const accessToken = env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (!accessToken) {
  console.error("SUPABASE_ACCESS_TOKEN missing from .env.local");
  process.exit(1);
}
if (!supabaseUrl) {
  console.error("NEXT_PUBLIC_SUPABASE_URL missing from .env.local");
  process.exit(1);
}

const refMatch = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) {
  console.error(`Cannot parse project ref from ${supabaseUrl}`);
  process.exit(1);
}
const projectRef = refMatch[1];

const SQL = `
-- ───── ApprovalItem: assignee routing (Team-tier feature) ─────────────
ALTER TABLE practiq.approval_items
  ADD COLUMN IF NOT EXISTS assignee_id text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamp(3) without time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'practiq'
      AND table_name = 'approval_items'
      AND constraint_name = 'approval_items_assignee_id_fkey'
  ) THEN
    ALTER TABLE practiq.approval_items
      ADD CONSTRAINT approval_items_assignee_id_fkey
      FOREIGN KEY (assignee_id) REFERENCES practiq.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS approval_items_assignee_id_status_idx
  ON practiq.approval_items (assignee_id, status);

-- ───── FoundingSlot: singleton counter for Founding Member checkout ───
CREATE TABLE IF NOT EXISTS practiq.founding_slots (
  id            text                          PRIMARY KEY DEFAULT 'singleton',
  claimed_count integer                       NOT NULL DEFAULT 0,
  cap           integer                       NOT NULL DEFAULT 50,
  updated_at    timestamp(3) without time zone NOT NULL DEFAULT now()
);

INSERT INTO practiq.founding_slots (id, claimed_count, cap)
  VALUES ('singleton', 0, 50)
  ON CONFLICT (id) DO NOTHING;
`;

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
console.log(`POST ${endpoint}`);

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: SQL }),
});

const text = await res.text();
console.log(`Status: ${res.status}`);
console.log(text.slice(0, 4000));

if (!res.ok) {
  process.exit(1);
}
