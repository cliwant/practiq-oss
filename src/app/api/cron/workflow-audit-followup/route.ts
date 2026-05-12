/**
 * /api/cron/workflow-audit-followup
 *
 * Daily Vercel cron at 14:00 UTC (9 AM CT). For each row in
 * public.workflow_audits that is between 24h and 72h old, has not yet
 * received a follow-up email, and has not opted out, send an operator-
 * voiced check-in email via SES, mark `follow_up_sent_at`, post a Slack
 * notification, and log an analytics event.
 *
 * Operator framing:
 *   - The follow-up is not a marketing blast. It's a check-in from the
 *     operator asking whether the audit diagnosis matched the firm's
 *     day-to-day, and offering a 15-min conversation.
 *   - Pre-launch honest framing: "looking for first design partners".
 *     No fake urgency, no fake social proof, no AI-slop verbs.
 *   - Reply STOP triggers manual opt-out (operator sets optout_at on
 *     the row via SQL when they see the bounce in their inbox).
 *
 * Schedule: `0 14 * * *` (14:00 UTC = 9 AM CDT / 8 AM CST). Daily,
 * including weekends — prospects read email on weekends and a check-in
 * sent on a Sunday morning gets read at the right cadence relative to
 * when they ran the audit.
 *
 * Cooldown: 24h–72h. The 24h floor is the "let the audit breathe"
 * window the operator wants; the 72h ceiling prevents us from sending
 * a stale follow-up if cron missed a day. Past 72h the prospect has
 * already either replied to the audit or moved on; a second touch from
 * a different cadence (manual outreach) is more appropriate.
 *
 * Batch cap: 50 / run. Real volume is well under this — the cap is a
 * SES rate-limit / runaway-cost circuit breaker.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { safeNotify } from "@/lib/notifications/slack";
import { trackEvent } from "@/lib/analytics/track";
import type {
  AuditReport,
  PrimaryGap,
} from "@/components/workflow-audit/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 50;

// Same auth pattern as other cron routes (cold-send, follow-up-send, …).
function checkCronAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${expected}`) return true;
  // Vercel cron also injects x-vercel-cron when invoking from the
  // platform; accept that as a fallback so a manual rotation doesn't
  // break scheduled execution.
  return req.headers.get("x-vercel-cron") !== null;
}

interface WorkflowAuditRow {
  id: string;
  created_at: string;
  email: string;
  name: string | null;
  firm_name: string | null;
  firm_vertical: string | null;
  responses: unknown;
  report: AuditReport | null;
  follow_up_sent_at: string | null;
  optout_at: string | null;
}

const PRIMARY_GAP_LABELS: Record<PrimaryGap, string> = {
  source: "source preservation",
  review_state: "review state",
  client_context: "client context handoff",
  handoff: "handoff",
  multiple: "the layered handoff gaps",
};

function readableGap(gap: PrimaryGap | null | undefined): string {
  if (!gap) return "the workflow gap we flagged";
  return PRIMARY_GAP_LABELS[gap] ?? PRIMARY_GAP_LABELS.multiple;
}

function firstSentence(s: string): string {
  // Take the first natural sentence (or first 200 chars) so the
  // mail-merge stays one clean line, not a wall of text.
  const trimmed = s.trim();
  if (trimmed.length === 0) return "";
  const m = trimmed.match(/^[^.!?]+[.!?]/);
  const candidate = m ? m[0] : trimmed.slice(0, 200);
  return candidate.trim();
}

function pickSpecificExample(
  report: AuditReport | null,
  responses: unknown,
): string {
  // Prefer the first AI-extracted specific example. If the report
  // didn't surface one (rare — schema requires ≥2), fall back to the
  // first sentence of the firm's own engagement description.
  const examples = report?.specific_examples;
  if (Array.isArray(examples) && examples.length > 0) {
    const e = firstSentence(String(examples[0] ?? ""));
    if (e.length > 0) return e;
  }
  if (responses && typeof responses === "object") {
    const eng = (responses as { recent_engagement?: unknown })
      .recent_engagement;
    if (typeof eng === "string") {
      const s = firstSentence(eng);
      if (s.length > 0) return s;
    }
  }
  return "the engagement you described";
}

function buildSubject(firmName: string | null): string {
  const f = (firmName ?? "").trim();
  if (f.length === 0) return "Following up on your workflow audit";
  return `Following up on your workflow audit — ${f}`;
}

function renderFollowupText(args: {
  name: string;
  firmName: string;
  primaryGap: string;
  specificExample: string;
}): string {
  const greeting = args.name.trim().length > 0 ? `Hi ${args.name},` : "Hi,";
  const firmRef =
    args.firmName.trim().length > 0 ? args.firmName : "your firm";
  return [
    greeting,
    "",
    `You ran the workflow audit for ${firmRef} yesterday — the one that flagged ${args.primaryGap} as the main place reviewable AI is most likely to help.`,
    "",
    `A quick check-in: did that diagnosis match the actual day-to-day at your firm? If yes, I'd want to see the engagement you described in your own context — specifically how ${args.specificExample} plays out across the cycle.`,
    "",
    "If it's worth 15 minutes, reply to this email and I'll send three time options. If the audit missed the real bottleneck — also worth knowing. I'd rather hear that than waste your time.",
    "",
    "— Seungdo",
    "Practiq",
    "",
    "(Sent because you ran a workflow audit at https://practiq.dev/workflow-audit. Reply STOP to opt out.)",
  ].join("\n");
}

function renderFollowupHtml(args: {
  name: string;
  firmName: string;
  primaryGap: string;
  specificExample: string;
}): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const greeting =
    args.name.trim().length > 0 ? `Hi ${esc(args.name)},` : "Hi,";
  const firmRef =
    args.firmName.trim().length > 0 ? esc(args.firmName) : "your firm";
  const gap = esc(args.primaryGap);
  const example = esc(args.specificExample);
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f9fafb;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <tr><td style="color:#1f2937;font-size:14px;line-height:1.65;">
      <p style="margin:0 0 14px;">${greeting}</p>
      <p style="margin:0 0 14px;">You ran the workflow audit for ${firmRef} yesterday — the one that flagged ${gap} as the main place reviewable AI is most likely to help.</p>
      <p style="margin:0 0 14px;">A quick check-in: did that diagnosis match the actual day-to-day at your firm? If yes, I'd want to see the engagement you described in your own context — specifically how ${example} plays out across the cycle.</p>
      <p style="margin:0 0 14px;">If it's worth 15 minutes, reply to this email and I'll send three time options. If the audit missed the real bottleneck — also worth knowing. I'd rather hear that than waste your time.</p>
      <p style="margin:0 0 4px;">— Seungdo</p>
      <p style="margin:0 0 24px;color:#4b5563;">Practiq</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
        Sent because you ran a workflow audit at <a href="https://practiq.dev/workflow-audit" style="color:#6b7280;">practiq.dev/workflow-audit</a>. Reply STOP to opt out.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

interface SendOutcome {
  audit_id: string;
  email: string;
  outcome: "sent" | "error" | "skipped";
  note?: string;
}

async function sendOneFollowup(args: {
  ses: SESClient;
  fromEmail: string;
  row: WorkflowAuditRow;
}): Promise<{ outcome: SendOutcome; subject: string }> {
  const { row } = args;
  const firmName = row.firm_name ?? "";
  const name = row.name ?? "";
  const primaryGap = readableGap(row.report?.primary_gap);
  const specificExample = pickSpecificExample(row.report, row.responses);
  const subject = buildSubject(row.firm_name);
  const text = renderFollowupText({
    name,
    firmName,
    primaryGap,
    specificExample,
  });
  const html = renderFollowupHtml({
    name,
    firmName,
    primaryGap,
    specificExample,
  });

  try {
    await args.ses.send(
      new SendEmailCommand({
        Source: args.fromEmail,
        Destination: { ToAddresses: [row.email] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Text: { Data: text },
            Html: { Data: html },
          },
        },
        // Tag for SES analytics + Resend-style downstream classification.
        Tags: [
          { Name: "kind", Value: "workflow-audit-followup" },
          { Name: "audit_id", Value: row.id },
        ],
      }),
    );
    return {
      outcome: { audit_id: row.id, email: row.email, outcome: "sent" },
      subject,
    };
  } catch (err) {
    console.error(
      `[workflow-audit-followup] SES send failed for audit ${row.id}:`,
      err,
    );
    return {
      outcome: {
        audit_id: row.id,
        email: row.email,
        outcome: "error",
        note: err instanceof Error ? err.message : String(err),
      },
      subject,
    };
  }
}

export async function GET(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
  const fromEmail = process.env.SES_FROM_EMAIL || "hello@practiq.dev";
  if (!awsKey || !awsSecret) {
    return NextResponse.json(
      { error: "ses not configured" },
      { status: 500 },
    );
  }
  const ses = new SESClient({
    region: process.env.AWS_SES_REGION || "us-east-1",
    credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret },
  });

  const now = Date.now();
  const minAgeIso = new Date(now - 72 * 3600 * 1000).toISOString();
  const maxAgeIso = new Date(now - 24 * 3600 * 1000).toISOString();

  let rows: WorkflowAuditRow[] = [];
  try {
    const q = await supabase
      .from("workflow_audits")
      .select(
        "id, created_at, email, name, firm_name, firm_vertical, responses, report, follow_up_sent_at, optout_at",
      )
      .is("follow_up_sent_at", null)
      .is("optout_at", null)
      .gte("created_at", minAgeIso)
      .lte("created_at", maxAgeIso)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);
    if (q.error) {
      console.error(
        "[workflow-audit-followup] supabase select error:",
        q.error,
      );
      return NextResponse.json(
        { error: "supabase select failed", details: q.error.message },
        { status: 500 },
      );
    }
    rows = (q.data ?? []) as WorkflowAuditRow[];
  } catch (err) {
    console.error("[workflow-audit-followup] supabase exception:", err);
    return NextResponse.json(
      { error: "supabase exception" },
      { status: 500 },
    );
  }

  const summary = {
    window: { since: minAgeIso, until: maxAgeIso },
    attempted: rows.length,
    sent: 0,
    errors: 0,
    skipped: 0,
    details: [] as SendOutcome[],
  };

  for (const row of rows) {
    // Defensive: skip rows with no usable email. Supabase NOT NULL on
    // email should guarantee this, but belt-and-braces.
    if (!row.email || row.email.indexOf("@") < 1) {
      summary.skipped++;
      summary.details.push({
        audit_id: row.id,
        email: row.email ?? "(missing)",
        outcome: "skipped",
        note: "invalid email",
      });
      continue;
    }

    const { outcome, subject } = await sendOneFollowup({
      ses,
      fromEmail,
      row,
    });
    summary.details.push(outcome);
    if (outcome.outcome === "error") {
      summary.errors++;
      continue;
    }
    summary.sent++;

    // Mark the row only after a successful SES send so a transient
    // error retries on the next cron tick (still within the 72h
    // window).
    const updateRes = await supabase
      .from("workflow_audits")
      .update({ follow_up_sent_at: new Date().toISOString() })
      .eq("id", row.id);
    if (updateRes.error) {
      console.warn(
        `[workflow-audit-followup] follow_up_sent_at update failed for ${row.id}:`,
        updateRes.error,
      );
      // Don't roll back the send. The email already went out; the
      // worst case is a duplicate follow-up if this happens, which
      // is preferable to silently dropping the marker and re-sending.
    }

    const hoursSinceAudit = Math.round(
      (now - new Date(row.created_at).getTime()) / 3600 / 1000,
    );

    safeNotify("workflow_audit_followup_sent", {
      email: row.email,
      name: row.name ?? "(unknown)",
      firm_name: row.firm_name ?? "(unknown)",
      firm_vertical: row.firm_vertical ?? "(unknown)",
      primary_gap: row.report?.primary_gap ?? "(unknown)",
      audit_id: row.id,
      hours_since_audit: hoursSinceAudit,
      subject,
    });

    // Awaited — serverless freezes on response close, so fire-and-
    // forget gets dropped before the analytics row lands. (See
    // memory: serverless_analytics_must_await.md.)
    await trackEvent({
      type: "workflow_audit_followup_sent",
      properties: {
        audit_id: row.id,
        firm_vertical: row.firm_vertical,
        primary_gap: row.report?.primary_gap ?? null,
        hours_since_audit: hoursSinceAudit,
      },
    });
  }

  return NextResponse.json(summary);
}
