/**
 * /api/cron/follow-up-send — daily Vercel cron at 14:30 UTC, Mon-Fri.
 *
 * Schedule: `30 14 * * 1-5`. Fires 30 minutes after the cold-send cron
 * so the initial-day send-counts in the tracker have settled.
 *
 * Logic:
 *   For every contact in the cold + trade-press trackers that:
 *     - has sent_initial_at set ≥ 4 business days ago AND no Touch 2 yet
 *       AND status NOT in (closed_lost, bounced, unsubscribed, in_conversation)
 *       → send Touch 2 in-thread reply, log Practiq/Followup/Touch2Sent label
 *     - has sent_followup1_at set ≥ 5 business days ago AND no Touch 3 yet
 *       AND same status filter
 *       → send Touch 3 in-thread reply, log Practiq/Followup/Touch3Sent label
 *
 * Source of truth for "already sent": Gmail labels (idempotent + survives
 * across worktrees since the CSV can't be written from Vercel).
 *
 * Auth: Bearer CRON_SECRET. Manual: `?force=true&dry_run=true`.
 */
import { NextResponse } from "next/server";
import {
  makeAuthorizedGmail,
  checkCronAuth,
} from "@/lib/outreach/gmail-send";
import {
  buildInThreadRawReply,
  ensureLabel,
  findCampaignSendInThread,
  loadLabels,
  TOUCH2_LABEL,
  TOUCH3_LABEL,
} from "@/lib/outreach/gmail-reply-helpers";
import { readTracker, type TrackerKind } from "@/lib/outreach/tracker-csv";
import { generateFollowupBody } from "@/lib/outreach/follow-up-templates";
import { businessDaysBetween } from "@/lib/outreach/business-days";
import { type gmail_v1 } from "googleapis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const FROM_ALIAS = "Seungdo Keum <seungdo.keum@practiq.dev>";

const SKIPPED_STATUSES = new Set([
  "closed_lost",
  "bounced",
  "unsubscribed",
  "in_conversation",
]);

type FollowupCandidate = {
  contact_email: string;
  firm_name: string;
  contact_name: string;
  trackerKind: TrackerKind;
  touch: 2 | 3;
};

type SentRecord = {
  contact_email: string;
  firm_name: string;
  touch: 2 | 3;
  threadId: string | null;
  outcome: "sent" | "dry-run" | "skipped" | "error";
  note?: string;
};

async function notifySummary({
  date,
  sent,
  dryRun,
}: {
  date: string;
  sent: SentRecord[];
  dryRun: boolean;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const realSent = sent.filter(
    (s) => s.outcome === "sent" || s.outcome === "dry-run"
  );
  if (realSent.length === 0) return; // suppress noop, same pattern as cold-send
  const t2 = realSent.filter((s) => s.touch === 2);
  const t3 = realSent.filter((s) => s.touch === 3);
  const lines: string[] = [];
  lines.push(`*Practiq follow-up cron* — ${date} | dryRun=${dryRun}`);
  lines.push(`Touch 2 sent: ${t2.length}`);
  lines.push(`Touch 3 sent: ${t3.length}`);
  lines.push("");
  for (const s of realSent) {
    lines.push(
      `• Touch ${s.touch} → ${s.firm_name} <${s.contact_email}> [${s.outcome}]${s.note ? ` (${s.note})` : ""}`
    );
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Find the campaign thread for a recipient. Searches both cold and
 * trade-press parent labels. Returns the first hit.
 */
async function findThreadForRecipient(
  gmail: gmail_v1.Gmail,
  recipientEmail: string
): Promise<string | null> {
  const q = `from:me to:${recipientEmail} (label:Practiq/Cold/All OR label:Practiq/Trade-Press/All)`;
  try {
    const r = await gmail.users.threads.list({
      userId: "me",
      q,
      maxResults: 5,
    });
    const list = r.data.threads || [];
    if (list.length > 0 && list[0].id) return list[0].id;
  } catch {
    /* fall through */
  }
  // Fallback: drop the parent-label gate.
  try {
    const r2 = await gmail.users.threads.list({
      userId: "me",
      q: `from:me to:${recipientEmail}`,
      maxResults: 5,
    });
    const list = r2.data.threads || [];
    if (list.length > 0 && list[0].id) return list[0].id;
  } catch {
    /* nope */
  }
  return null;
}

/** Returns true if the thread already carries the touch-N label. */
async function threadHasLabel(
  gmail: gmail_v1.Gmail,
  threadId: string,
  labelId: string
): Promise<boolean> {
  try {
    const t = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "minimal",
    });
    const messages = t.data.messages || [];
    for (const m of messages) {
      if ((m.labelIds || []).includes(labelId)) return true;
    }
  } catch {
    /* assume not */
  }
  return false;
}

export async function GET(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";
  const forceDryRun = url.searchParams.get("dry_run");
  const dryRun =
    forceDryRun !== null
      ? forceDryRun === "true"
      : process.env.CRON_DRY_RUN === "true";

  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  // Build candidate list from both trackers.
  const candidates: FollowupCandidate[] = [];
  for (const kind of ["cold", "trade-press"] as TrackerKind[]) {
    const rows = await readTracker(kind);
    for (const r of rows) {
      if (!r.contact_email) continue;
      if (SKIPPED_STATUSES.has((r.status || "").trim())) continue;

      const sentInitial = r.sent_initial_at
        ? new Date(r.sent_initial_at)
        : null;
      const sentFu1 = r.sent_followup1_at
        ? new Date(r.sent_followup1_at)
        : null;
      const sentFu2 = r.sent_followup2_at
        ? new Date(r.sent_followup2_at)
        : null;

      // Touch 2 candidate
      if (sentInitial && !sentFu1 && !isNaN(sentInitial.getTime())) {
        const bd = businessDaysBetween(sentInitial, now);
        if (bd >= 4) {
          candidates.push({
            contact_email: r.contact_email,
            firm_name: r.firm_name || "unknown",
            contact_name: r.contact_name || "",
            trackerKind: kind,
            touch: 2,
          });
          continue;
        }
      }
      // Touch 3 candidate
      if (sentFu1 && !sentFu2 && !isNaN(sentFu1.getTime())) {
        const bd = businessDaysBetween(sentFu1, now);
        if (bd >= 5) {
          candidates.push({
            contact_email: r.contact_email,
            firm_name: r.firm_name || "unknown",
            contact_name: r.contact_name || "",
            trackerKind: kind,
            touch: 3,
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      status: "noop",
      reason: "no follow-up candidates today",
      date,
      dryRun,
      candidates: 0,
    });
  }

  const gmail = makeAuthorizedGmail();
  const labels = await loadLabels(gmail);
  const touch2LabelId = await ensureLabel(gmail, TOUCH2_LABEL, labels);
  const touch3LabelId = await ensureLabel(gmail, TOUCH3_LABEL, labels);

  const sent: SentRecord[] = [];
  for (const c of candidates) {
    try {
      const threadId = await findThreadForRecipient(gmail, c.contact_email);
      if (!threadId) {
        sent.push({
          contact_email: c.contact_email,
          firm_name: c.firm_name,
          touch: c.touch,
          threadId: null,
          outcome: "skipped",
          note: "no original send thread found in mailbox",
        });
        continue;
      }

      // Idempotency: skip if the touch-N label is already on the thread.
      const targetLabelId = c.touch === 2 ? touch2LabelId : touch3LabelId;
      const already = await threadHasLabel(gmail, threadId, targetLabelId);
      if (already) {
        sent.push({
          contact_email: c.contact_email,
          firm_name: c.firm_name,
          touch: c.touch,
          threadId,
          outcome: "skipped",
          note: `already labeled ${c.touch === 2 ? TOUCH2_LABEL : TOUCH3_LABEL}`,
        });
        continue;
      }

      const send = await findCampaignSendInThread(gmail, threadId, labels);
      if (!send) {
        sent.push({
          contact_email: c.contact_email,
          firm_name: c.firm_name,
          touch: c.touch,
          threadId,
          outcome: "skipped",
          note: "could not locate campaign send within thread",
        });
        continue;
      }

      const { body } = await generateFollowupBody({
        touch: c.touch,
        contactEmail: c.contact_email,
        contactName: c.contact_name,
      });

      if (dryRun) {
        sent.push({
          contact_email: c.contact_email,
          firm_name: c.firm_name,
          touch: c.touch,
          threadId,
          outcome: "dry-run",
          note: "CRON_DRY_RUN=true — would have sent",
        });
        continue;
      }

      const raw = buildInThreadRawReply({
        to: c.contact_email,
        fromAlias: FROM_ALIAS,
        subject: send.subject,
        bodyText: body,
        inReplyToMessageIdHeader: send.rfc822MessageIdHeader,
        referencesHeader: send.referencesHeader,
      });
      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw, threadId },
      });

      // Apply the touch-N label to mark the thread.
      try {
        await gmail.users.threads.modify({
          userId: "me",
          id: threadId,
          requestBody: { addLabelIds: [targetLabelId] },
        });
      } catch {
        /* label apply is best-effort; the send already happened */
      }

      sent.push({
        contact_email: c.contact_email,
        firm_name: c.firm_name,
        touch: c.touch,
        threadId,
        outcome: "sent",
      });
    } catch (e) {
      sent.push({
        contact_email: c.contact_email,
        firm_name: c.firm_name,
        touch: c.touch,
        threadId: null,
        outcome: "error",
        note: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
      });
    }
  }

  if (!dryRun || force) {
    await notifySummary({ date, sent, dryRun });
  }

  return NextResponse.json({
    status: "ok",
    date,
    dryRun,
    forced: force,
    candidates: candidates.length,
    touch2_sent: sent.filter((s) => s.touch === 2 && s.outcome === "sent").length,
    touch3_sent: sent.filter((s) => s.touch === 3 && s.outcome === "sent").length,
    skipped: sent.filter((s) => s.outcome === "skipped").length,
    errors: sent.filter((s) => s.outcome === "error").length,
    sent,
  });
}
