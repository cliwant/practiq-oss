/**
 * Markdown audit shadow — Wave-4 P1-01.
 *
 * Lovable-mark gate #3 demands "every approval decision mirrored to a
 * grep-able Markdown trail." DB AuditLog is the system of record for
 * compliance, but on-disk Markdown gives operators (and auditors)
 * something they can `grep`, `tail`, and reason about without booting
 * the application. The MemKraft pattern: append-only, one file per
 * client per day, headed by a stable client-id banner.
 *
 * Behaviour:
 *
 *   - File path: `${SHADOW_ROOT}/clients/{clientId}/audit/{YYYY-MM-DD}.md`
 *   - Append-only: existing entries never edited or deleted (matches
 *     the legal-defensibility intent — drift in audit logs reads as
 *     tampering, even when benign).
 *   - On Vercel (serverless) the filesystem is ephemeral; we still
 *     write to /tmp so the operator running `vercel dev` or a
 *     long-lived edge function gets the trail, AND we return the
 *     rendered Markdown so the caller can persist it via a durable
 *     channel (AuditLog.details.shadowMarkdown is the chosen sink).
 *   - Failures swallow — DB AuditLog is authoritative, the shadow is
 *     a usability layer. We never let a fs.appendFile error reject the
 *     operator's approval.
 *
 * Acceptance test for this module is in
 * `src/lib/audit-shadow.test.ts` (Vitest) — exercises the renderer
 * deterministically without touching the filesystem.
 */
import fs from "node:fs/promises";
import path from "node:path";

export interface AuditShadowEvent {
  approvalItemId: string;
  clientId: string;
  userId: string;
  itemType: string;
  itemTitle: string;
  decision: "approve" | "reject" | "modify" | "dismiss" | "reset";
  originalContent: unknown;
  modifiedContent?: unknown;
  reviewerNotes?: string | null;
  aiNotes?: string | null;
  aiConfidence?: number | null;
  reviewer: { userId: string; email?: string | null };
  timestamp: Date;
}

/**
 * Resolve the on-disk root for shadow files. Order:
 *   1. AUDIT_SHADOW_ROOT env var (explicit override)
 *   2. /tmp/practiq-shadow when running on Vercel (only writable path)
 *   3. <cwd>/storage in local dev
 *
 * Cached on first call so a misconfigured env doesn't flap.
 */
let cachedRoot: string | null = null;
export function shadowRoot(): string {
  if (cachedRoot) return cachedRoot;
  const explicit = process.env.AUDIT_SHADOW_ROOT;
  if (explicit && explicit.length > 0) {
    cachedRoot = explicit;
  } else if (process.env.VERCEL === "1" || process.env.VERCEL) {
    cachedRoot = "/tmp/practiq-shadow";
  } else {
    cachedRoot = path.join(process.cwd(), "storage");
  }
  return cachedRoot;
}

/**
 * Render a single entry as Markdown. Pure, no I/O — easy to unit-test
 * and easy to embed in DB rows for off-disk reconstruction.
 *
 * Each entry is one H2 followed by structured fields and code blocks.
 * The trailing horizontal rule lets `grep -A` style queries find the
 * boundaries naturally.
 */
export function renderShadowEntry(e: AuditShadowEvent): string {
  const ts = e.timestamp.toISOString();
  const conf =
    e.aiConfidence != null
      ? `${(e.aiConfidence * 100).toFixed(0)}%`
      : "n/a";
  const lines: string[] = [
    `## ${ts} — ${e.decision.toUpperCase()} — ${e.itemType}: ${e.itemTitle}`,
    ``,
    `- **Approval ID**: ${e.approvalItemId}`,
    `- **Client ID**: ${e.clientId}`,
    `- **Reviewer**: ${e.reviewer.email ?? e.reviewer.userId}`,
    `- **AI confidence**: ${conf}`,
    ``,
    `### Original draft`,
    "```json",
    safeJson(e.originalContent),
    "```",
    ``,
  ];
  if (e.modifiedContent !== undefined) {
    lines.push(
      `### Modified content`,
      "```json",
      safeJson(e.modifiedContent),
      "```",
      ``,
    );
  }
  if (e.aiNotes) {
    lines.push(`### AI notes`, "", e.aiNotes.trim(), ``);
  }
  if (e.reviewerNotes) {
    lines.push(`### Reviewer notes`, "", e.reviewerNotes.trim(), ``);
  }
  lines.push(`---`, ``);
  return lines.join("\n");
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2) ?? "null";
  } catch {
    return `(unserializable: ${typeof v})`;
  }
}

export interface AppendShadowResult {
  /** Rendered Markdown body, regardless of fs write success. */
  body: string;
  /** True if the file write succeeded. */
  written: boolean;
  /** Final on-disk path when written. */
  filePath?: string;
  /** Error string when not written. Does NOT throw. */
  error?: string;
}

/**
 * Append a shadow entry to today's per-client audit file. Creates the
 * directory tree and seeds a header on first write of the day.
 *
 * Caller is expected to ALSO persist the returned `body` to the
 * authoritative AuditLog row (so a serverless cold start that loses
 * /tmp doesn't lose the audit trail). This function never throws.
 */
export async function appendApprovalToShadow(
  e: AuditShadowEvent,
): Promise<AppendShadowResult> {
  const body = renderShadowEntry(e);
  try {
    const yyyymmdd = e.timestamp.toISOString().slice(0, 10);
    const dir = path.join(shadowRoot(), "clients", e.clientId, "audit");
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${yyyymmdd}.md`);
    let needHeader = false;
    try {
      await fs.access(filePath);
    } catch {
      needHeader = true;
    }
    if (needHeader) {
      const header = `# Approval audit — client \`${e.clientId}\` — ${yyyymmdd}\n\nAppend-only. Do not edit historical entries.\n\n`;
      await fs.writeFile(filePath, header, "utf8");
    }
    await fs.appendFile(filePath, body, "utf8");
    return { body, written: true, filePath };
  } catch (err) {
    return {
      body,
      written: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
