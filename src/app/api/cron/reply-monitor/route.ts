/**
 * /api/cron/reply-monitor — hourly Vercel cron during US business hours.
 *
 * Schedule: `0 14-22/1 * * 1-5` (9 AM – 5 PM CT, weekdays).
 *
 * Detects new reply threads to outbound cold/press emails, classifies
 * each via OpenRouter (anthropic/claude-sonnet-4.5), posts to Slack,
 * and reports tracker CSV updates. Idempotency is guaranteed via the
 * `Practiq/Reply/Processed` Gmail label — once applied, the thread is
 * excluded from the next scan.
 *
 * Vercel filesystem is read-only at runtime, so the tracker CSV is
 * NOT written. The route emits the CSV-fragment diff in the Slack
 * message and the operator hand-merges it into the canonical CSV.
 *
 * Auth: Bearer CRON_SECRET (same as cold-send / trade-press-send).
 *
 * Manual trigger: `?force=true` overrides the dry-run checks; pair with
 * `?dry_run=true` to classify+notify but skip tracker reporting and the
 * Practiq/Reply/Processed label apply.
 */
import { NextResponse } from "next/server";
import {
  makeAuthorizedGmail,
  checkCronAuth,
} from "@/lib/outreach/gmail-send";
import {
  classifyReply,
  statusForCategory,
  urgencyTier,
  type ReplyClassification,
} from "@/lib/outreach/reply-classifier";
import {
  ensureLabel,
  findCampaignSendInThread,
  findLatestInboundReply,
  loadLabels,
  PROCESSED_LABEL,
} from "@/lib/outreach/gmail-reply-helpers";
import {
  applyAndDescribeUpdates,
  findRowByEmail,
  readTracker,
  type TrackerKind,
  type TrackerUpdate,
} from "@/lib/outreach/tracker-csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type Outcome = {
  threadId: string;
  fromEmail: string;
  classification: ReplyClassification | null;
  campaignLabel: string | null;
  trackerKind: TrackerKind;
  firmName: string;
  contactName: string;
  threadUrl: string;
  reason?: string;
  outcome: "classified" | "skipped" | "error";
  error?: string;
};

async function notifyHotReply({
  outcome,
}: {
  outcome: Outcome;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url || !outcome.classification) return;
  const tier = urgencyTier(outcome.classification);
  const c = outcome.classification;
  const firm = outcome.firmName || "unknown sender";
  const contact = outcome.contactName ? ` (${outcome.contactName})` : "";
  let text: string;
  if (tier === "hot") {
    text = [
      `:fire: *Practiq REPLY — ${c.category}* — ${firm}${contact}`,
      c.summary,
      `Suggested response: ${c.suggested_response}`,
      `Open thread: ${outcome.threadUrl}`,
    ].join("\n");
  } else if (tier === "negative") {
    text = `:no_entry: ${firm} — ${c.category}: ${c.summary}`;
  } else {
    text = [`:incoming_envelope: Reply: ${firm} — ${c.category}`, c.summary].join(
      "\n"
    );
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    /* best-effort */
  }
}

async function notifySummary({
  date,
  outcomes,
  trackerDescribe,
  unmatched,
  dryRun,
}: {
  date: string;
  outcomes: Outcome[];
  trackerDescribe: string;
  unmatched: string[];
  dryRun: boolean;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const classified = outcomes.filter((o) => o.outcome === "classified").length;
  if (classified === 0) return; // suppress silent ticks
  const lines: string[] = [];
  lines.push(`*Practiq reply-monitor* — ${date} | dryRun=${dryRun}`);
  lines.push(`Classified ${classified} new repl${classified === 1 ? "y" : "ies"}`);
  if (trackerDescribe) {
    lines.push("");
    lines.push("Tracker updates (hand-merge into outreach-tracker.csv):");
    lines.push("```");
    lines.push(trackerDescribe);
    lines.push("```");
  }
  if (unmatched.length > 0) {
    lines.push("");
    lines.push(
      `:warning: ${unmatched.length} reply email(s) not in tracker (likely trade-press or out-of-list): ${unmatched.join(", ")}`
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

const SEARCH_QUERY =
  "(to:seungdo.keum@practiq.dev OR to:seungdo.keum@cliwant.com OR deliveredto:seungdo.keum@practiq.dev) newer_than:2d -from:me -label:Practiq/Reply/Processed";

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

  const date = new Date().toISOString();
  const outcomes: Outcome[] = [];
  const trackerUpdatesCold: TrackerUpdate[] = [];
  const trackerUpdatesPress: TrackerUpdate[] = [];

  try {
    const gmail = makeAuthorizedGmail();
    const labels = await loadLabels(gmail);
    const processedLabelId = await ensureLabel(gmail, PROCESSED_LABEL, labels);

    const threadList = await gmail.users.threads.list({
      userId: "me",
      q: SEARCH_QUERY,
      maxResults: 50,
    });
    const threads = threadList.data.threads || [];

    for (const t of threads) {
      const threadId = t.id || "";
      if (!threadId) continue;
      const threadUrl = `https://mail.google.com/mail/u/0/#all/${threadId}`;
      try {
        const send = await findCampaignSendInThread(gmail, threadId, labels);
        if (!send) {
          outcomes.push({
            threadId,
            fromEmail: "",
            classification: null,
            campaignLabel: null,
            trackerKind: "cold",
            firmName: "unknown sender",
            contactName: "",
            threadUrl,
            outcome: "skipped",
            reason: "no campaign-send found in thread",
          });
          continue;
        }
        const reply = await findLatestInboundReply(gmail, threadId);
        if (!reply) {
          outcomes.push({
            threadId,
            fromEmail: "",
            classification: null,
            campaignLabel: send.campaignLabelName,
            trackerKind: send.campaignLabelName.startsWith("Practiq/Trade-Press/")
              ? "trade-press"
              : "cold",
            firmName: "unknown sender",
            contactName: "",
            threadUrl,
            outcome: "skipped",
            reason: "no inbound reply yet",
          });
          continue;
        }

        const classification = await classifyReply({
          fromEmail: reply.fromEmail,
          subject: reply.subject,
          bodyText: reply.bodyText,
        });

        const trackerKind: TrackerKind = send.campaignLabelName.startsWith(
          "Practiq/Trade-Press/"
        )
          ? "trade-press"
          : "cold";
        const trackerRows = await readTracker(trackerKind);
        const matched = findRowByEmail(trackerRows, reply.fromEmail);
        const firmName = matched?.firm_name ?? "unknown sender";
        const contactName = matched?.contact_name ?? "";

        const outcome: Outcome = {
          threadId,
          fromEmail: reply.fromEmail,
          classification,
          campaignLabel: send.campaignLabelName,
          trackerKind,
          firmName,
          contactName,
          threadUrl,
          outcome: "classified",
        };
        outcomes.push(outcome);

        // Per-reply Slack ping (so hot replies surface immediately).
        await notifyHotReply({ outcome });

        // Build tracker update.
        const replyTs = new Date(parseInt(reply.internalDate, 10) || Date.now())
          .toISOString();
        const update: TrackerUpdate = {
          contact_email: reply.fromEmail,
          fields: {
            last_response_at: replyTs,
            response_type: classification.category,
            status: statusForCategory(
              classification.category,
              matched?.status ?? ""
            ),
          },
        };
        if (trackerKind === "cold") {
          trackerUpdatesCold.push(update);
        } else {
          trackerUpdatesPress.push(update);
        }

        // Mark the thread as processed (unless dry-run).
        if (!dryRun) {
          try {
            await gmail.users.threads.modify({
              userId: "me",
              id: threadId,
              requestBody: { addLabelIds: [processedLabelId] },
            });
          } catch (e) {
            outcome.error =
              e instanceof Error ? e.message : String(e);
          }
        }
      } catch (e) {
        outcomes.push({
          threadId,
          fromEmail: "",
          classification: null,
          campaignLabel: null,
          trackerKind: "cold",
          firmName: "unknown sender",
          contactName: "",
          threadUrl,
          outcome: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Apply + describe tracker updates against the in-memory rows for
    // the Slack diff. (No filesystem write.)
    const coldRows = await readTracker("cold");
    const pressRows = await readTracker("trade-press");
    const coldDiff = applyAndDescribeUpdates(coldRows, trackerUpdatesCold);
    const pressDiff = applyAndDescribeUpdates(pressRows, trackerUpdatesPress);
    const describe = [coldDiff.describe, pressDiff.describe]
      .filter((s) => s.length > 0)
      .join("\n");
    const unmatched = [...coldDiff.unmatched, ...pressDiff.unmatched];

    if (!dryRun || force) {
      await notifySummary({
        date,
        outcomes,
        trackerDescribe: describe,
        unmatched,
        dryRun,
      });
    }

    return NextResponse.json({
      status: "ok",
      date,
      dryRun,
      forced: force,
      processed: outcomes.length,
      classified: outcomes.filter((o) => o.outcome === "classified").length,
      skipped: outcomes.filter((o) => o.outcome === "skipped").length,
      errors: outcomes.filter((o) => o.outcome === "error").length,
      outcomes,
      tracker_updates: {
        cold: trackerUpdatesCold,
        trade_press: trackerUpdatesPress,
        unmatched,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
