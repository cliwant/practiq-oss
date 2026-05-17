/**
 * Filesystem-backed state for discovery outreach.
 *
 * We deliberately avoid adding a new Prisma table for this — the
 * customer-discovery workflow is small (~50-200 targets total over the
 * lifetime of the validation phase) and the state needs to be
 * human-readable + editable. Markdown + CSV beats schema for the
 * operator's use case.
 *
 * The canonical state lives at:
 *
 *   .cycle/research/2026-05-17-customer-discovery-kit/
 *     ├── target-list-YYYY-MM-DD.csv          one or more batch files
 *     ├── outreach-drafts/{slug}.json         personalized payloads queued for send
 *     ├── outreach-sent/{slug}.json           sent records (one per send)
 *     └── design-partners.md                  pilot ledger
 *
 * Functions here just read/write those files atomically.
 */
import * as fs from "node:fs/promises";
import * as fspath from "node:path";

export interface TargetRow {
  // Required columns
  firm_name: string;
  contact_name: string;
  email: string;
  vertical: string;
  source_channel: string;
  // Optional / enrichment
  role?: string;
  location?: string;
  team_size?: string;
  client_count_estimate?: string;
  linkedin_url?: string;
  linkedin_snippet?: string;
  firm_url?: string;
  firm_snippet?: string;
  personalization_note?: string;
  // Status machine
  outreach_status?: string;
  outreach_date?: string;
  reply_status?: string;
  reply_date?: string;
  interview_date?: string;
  pilot_status?: string;
  pilot_outcome?: string;
}

export const KIT_DIR = fspath.resolve(
  process.cwd(),
  ".cycle/research/2026-05-17-customer-discovery-kit",
);

export const DRAFTS_DIR = fspath.join(KIT_DIR, "outreach-drafts");
export const SENT_DIR = fspath.join(KIT_DIR, "outreach-sent");

/**
 * Read all target-list-*.csv files and return a flat list. Most-recent
 * batch wins on duplicate emails.
 */
export async function readAllTargets(): Promise<TargetRow[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(KIT_DIR))
      .filter((f) => /^target-list-.*\.csv$/.test(f))
      .sort();
  } catch {
    return [];
  }
  const byEmail = new Map<string, TargetRow>();
  for (const f of files) {
    const csv = await fs.readFile(fspath.join(KIT_DIR, f), "utf-8");
    for (const row of parseCsv(csv)) {
      if (row.email) byEmail.set(row.email.toLowerCase(), row);
    }
  }
  return [...byEmail.values()];
}

/**
 * Update a single row in the most-recent target-list CSV. Writes
 * atomically (tmp + rename).
 */
export async function updateTargetStatus(
  email: string,
  patch: Partial<TargetRow>,
): Promise<boolean> {
  const files = (await fs.readdir(KIT_DIR))
    .filter((f) => /^target-list-.*\.csv$/.test(f))
    .sort();
  for (const f of files.reverse()) {
    const fullPath = fspath.join(KIT_DIR, f);
    const csv = await fs.readFile(fullPath, "utf-8");
    const lines = csv.split(/\r?\n/);
    if (lines.length < 2) continue;
    const header = parseCsvLine(lines[0]);
    let patched = false;
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      const cols = parseCsvLine(lines[i]);
      const emailCol = header.indexOf("email");
      if (emailCol === -1) break;
      if ((cols[emailCol] ?? "").toLowerCase() !== email.toLowerCase()) continue;
      for (const [k, v] of Object.entries(patch)) {
        let idx = header.indexOf(k);
        if (idx === -1) {
          header.push(k);
          idx = header.length - 1;
        }
        while (cols.length < header.length) cols.push("");
        cols[idx] = v ?? "";
      }
      // Rebuild header line in case we appended columns
      lines[0] = header.map(csvEscape).join(",");
      lines[i] = cols.map(csvEscape).join(",");
      patched = true;
    }
    if (patched) {
      const tmp = fullPath + ".tmp";
      await fs.writeFile(tmp, lines.join("\n"), "utf-8");
      await fs.rename(tmp, fullPath);
      return true;
    }
  }
  return false;
}

/**
 * Queue a personalized email payload as a draft awaiting send.
 */
export interface DraftRecord {
  email_address: string;
  contact_name: string;
  firm_name: string;
  subject: string;
  text: string;
  html: string;
  confidence: number;
  anchors_used: string[];
  notes: string;
  created_at: string;
}

export async function writeDraft(slug: string, draft: DraftRecord): Promise<string> {
  await fs.mkdir(DRAFTS_DIR, { recursive: true });
  const path = fspath.join(DRAFTS_DIR, `${slug}.json`);
  await fs.writeFile(path, JSON.stringify(draft, null, 2), "utf-8");
  return path;
}

export async function readPendingDrafts(): Promise<Array<DraftRecord & { slug: string }>> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(DRAFTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const drafts: Array<DraftRecord & { slug: string }> = [];
  for (const f of files) {
    try {
      const raw = await fs.readFile(fspath.join(DRAFTS_DIR, f), "utf-8");
      const parsed = JSON.parse(raw) as DraftRecord;
      drafts.push({ ...parsed, slug: f.replace(/\.json$/, "") });
    } catch {
      // skip malformed
    }
  }
  // Oldest first — first queued, first sent
  drafts.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return drafts;
}

/**
 * Move a draft → sent record (atomic).
 */
export async function markDraftSent(
  slug: string,
  result: { ok: boolean; provider: string; messageId?: string; error?: string },
): Promise<void> {
  await fs.mkdir(SENT_DIR, { recursive: true });
  const draftPath = fspath.join(DRAFTS_DIR, `${slug}.json`);
  const sentPath = fspath.join(SENT_DIR, `${slug}.json`);
  try {
    const draftRaw = await fs.readFile(draftPath, "utf-8");
    const draft = JSON.parse(draftRaw);
    const sentRecord = {
      ...draft,
      sent_at: new Date().toISOString(),
      send_result: result,
    };
    await fs.writeFile(sentPath, JSON.stringify(sentRecord, null, 2), "utf-8");
    await fs.rm(draftPath);
  } catch (err) {
    throw new Error(`failed to move draft to sent: ${err instanceof Error ? err.message : err}`);
  }
}

export function emailToSlug(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ─── CSV utilities (no external dep) ───────────────────────────

function parseCsv(text: string): TargetRow[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const rows: TargetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = cols[j] ?? "";
    }
    rows.push(row as unknown as TargetRow);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        cols.push(cur);
        cur = "";
      } else if (c === '"' && cur === "") {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  cols.push(cur);
  return cols;
}

function csvEscape(s: string): string {
  if (s === undefined || s === null) return "";
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
