/**
 * tracker-csv.ts — read-only access to the Practiq outreach tracker CSV
 * plus a write helper that produces a JSON diff (for Slack reporting).
 *
 * **Vercel filesystem is read-only at runtime.** This module DOES NOT
 * attempt to write the CSV file in production. The only state-write
 * happens in Gmail (via labels — `Practiq/Reply/Processed`,
 * `Practiq/Followup/Touch2Sent`, etc) which is already the system of
 * record for the cold-send / trade-press-send pipeline. The CSV is a
 * snapshot/seed; the operator hand-reconciles status fields locally
 * after each batch using the Slack diff this module emits.
 *
 * For the trade-press-tracker.csv (which doesn't exist yet) we seed
 * from `personalization/trade-press-output-v2.jsonl` on first read.
 */
import fs from "fs/promises";
import path from "path";

export type TrackerRow = {
  firm_name: string;
  contact_name: string;
  contact_role: string;
  contact_email: string;
  linkedin_url: string;
  firm_size: string;
  city: string;
  state: string;
  vertical: string;
  signal: string;
  scored_priority: string;
  batch_assigned: string;
  sent_initial_at: string;
  sent_followup1_at: string;
  sent_followup2_at: string;
  last_response_at: string;
  response_type: string;
  status: string;
  zoom_booked_at: string;
  zoom_held_at: string;
  zoom_outcome: string;
  design_partner_decision: string;
  notes: string;
};

export type TrackerKind = "cold" | "trade-press";

const HEADER = [
  "firm_name",
  "contact_name",
  "contact_role",
  "contact_email",
  "linkedin_url",
  "firm_size",
  "city",
  "state",
  "vertical",
  "signal",
  "scored_priority",
  "batch_assigned",
  "sent_initial_at",
  "sent_followup1_at",
  "sent_followup2_at",
  "last_response_at",
  "response_type",
  "status",
  "zoom_booked_at",
  "zoom_held_at",
  "zoom_outcome",
  "design_partner_decision",
  "notes",
] as const;

// Minimal RFC4180-ish CSV parser. Supports quoted fields with embedded
// commas + escaped quotes ("") but not multi-line quoted fields. The
// outreach tracker doesn't have those, but if it ever does swap in
// papaparse.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): TrackerRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  // Skip header row; we trust the schema matches HEADER.
  const rows: TrackerRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Partial<TrackerRow> = {};
    for (let j = 0; j < HEADER.length; j++) {
      (row as Record<string, string>)[HEADER[j]] = cells[j] ?? "";
    }
    rows.push(row as TrackerRow);
  }
  return rows;
}

function resolveTrackerPath(kind: TrackerKind): string[] {
  // The repo layout has the CSV at
  // ventures/fractional-ai-command-center/.cycle/marketing/...
  // process.cwd() can be either the repo root (in dev sometimes) OR the
  // venture root (Vercel). Try both.
  const cold = "2026-05-07-outreach-tracker.csv";
  const tp = "trade-press-tracker.csv";
  const filename = kind === "cold" ? cold : tp;
  return [
    path.resolve(process.cwd(), ".cycle", "marketing", filename),
    path.resolve(
      process.cwd(),
      "..",
      "..",
      "ventures",
      "fractional-ai-command-center",
      ".cycle",
      "marketing",
      filename
    ),
  ];
}

async function readFileFromCandidates(candidates: string[]): Promise<string | null> {
  for (const c of candidates) {
    try {
      return await fs.readFile(c, "utf8");
    } catch {
      continue;
    }
  }
  return null;
}

async function seedTradePressFromJsonl(): Promise<TrackerRow[]> {
  // The trade-press tracker is materialized from the v2 JSONL output.
  const candidates = [
    path.resolve(
      process.cwd(),
      ".cycle",
      "marketing",
      "personalization",
      "trade-press-output-v2.jsonl"
    ),
    path.resolve(
      process.cwd(),
      "..",
      "..",
      "ventures",
      "fractional-ai-command-center",
      ".cycle",
      "marketing",
      "personalization",
      "trade-press-output-v2.jsonl"
    ),
  ];
  const text = await readFileFromCandidates(candidates);
  if (!text) return [];
  const out: TrackerRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const rec = JSON.parse(trimmed);
      const empty: TrackerRow = {
        firm_name: rec.publication ?? "",
        contact_name: rec.editor_name ?? "",
        contact_role: rec.editor_title ?? "",
        contact_email: rec.email_verified ?? "",
        linkedin_url: "",
        firm_size: "",
        city: "",
        state: "",
        vertical: "trade-press",
        signal: rec.recent_piece?.title ?? "",
        scored_priority: "",
        batch_assigned: rec.label_slug ?? "",
        sent_initial_at: "",
        sent_followup1_at: "",
        sent_followup2_at: "",
        last_response_at: "",
        response_type: "",
        status: "new",
        zoom_booked_at: "",
        zoom_held_at: "",
        zoom_outcome: "",
        design_partner_decision: "",
        notes: rec.email_notes ?? "",
      };
      out.push(empty);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}

export async function readTracker(kind: TrackerKind): Promise<TrackerRow[]> {
  const candidates = resolveTrackerPath(kind);
  const text = await readFileFromCandidates(candidates);
  if (text) return parseCsv(text);
  if (kind === "trade-press") {
    // Seed from the JSONL output if the CSV doesn't exist yet.
    return await seedTradePressFromJsonl();
  }
  return [];
}

export type TrackerUpdate = {
  contact_email: string;
  fields: Partial<
    Pick<
      TrackerRow,
      | "sent_initial_at"
      | "sent_followup1_at"
      | "sent_followup2_at"
      | "last_response_at"
      | "response_type"
      | "status"
    >
  >;
};

/**
 * Apply tracker updates and serialize a CSV-fragment style report for
 * Slack/operator. Returns the matched rows (post-update) and the list
 * of unmatched contact_emails. Does NOT write to disk — Vercel runtime
 * is read-only. The operator hand-merges these updates into the canonical
 * CSV from the Slack message after the cron run.
 */
export function applyAndDescribeUpdates(
  rows: TrackerRow[],
  updates: TrackerUpdate[]
): {
  updatedRows: TrackerRow[];
  unmatched: string[];
  describe: string;
} {
  const byEmail = new Map<string, TrackerRow>();
  for (const r of rows) {
    if (r.contact_email) {
      byEmail.set(r.contact_email.trim().toLowerCase(), r);
    }
  }

  const updated: TrackerRow[] = [];
  const unmatched: string[] = [];
  const describeLines: string[] = [];

  for (const u of updates) {
    const key = u.contact_email.trim().toLowerCase();
    const row = byEmail.get(key);
    if (!row) {
      unmatched.push(u.contact_email);
      continue;
    }
    const before: Record<string, string> = {};
    const after: Record<string, string> = {};
    for (const [field, value] of Object.entries(u.fields)) {
      if (value === undefined) continue;
      before[field] = (row as Record<string, string>)[field] ?? "";
      (row as Record<string, string>)[field] = value;
      after[field] = value;
    }
    updated.push(row);
    const diff = Object.entries(after)
      .map(([k, v]) => `${k}: "${before[k] ?? ""}" → "${v}"`)
      .join(", ");
    describeLines.push(`${row.firm_name} (${row.contact_email}) — ${diff}`);
  }

  return {
    updatedRows: updated,
    unmatched,
    describe: describeLines.join("\n"),
  };
}

export function findRowByEmail(
  rows: TrackerRow[],
  email: string
): TrackerRow | null {
  const key = email.trim().toLowerCase();
  for (const r of rows) {
    if (r.contact_email && r.contact_email.trim().toLowerCase() === key) {
      return r;
    }
  }
  return null;
}
