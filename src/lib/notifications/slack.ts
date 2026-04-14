/**
 * Unified Slack notification client.
 *
 * Every meaningful business/ops event flows through this module and gets
 * posted to the single SLACK_WEBHOOK_URL. Each notification type has its
 * own formatter that produces emoji-prefixed, category-labeled messages,
 * using Block Kit where it aids legibility.
 *
 * Design rules:
 *   - Fire-and-forget: callers MAY `await notifySlack(...)` for ordering,
 *     but `safeNotify(...)` kicks off without awaiting.
 *   - Swallow all errors internally — ops signal must never crash business
 *     logic. Errors go to `console.warn`.
 *   - If SLACK_WEBHOOK_URL is missing, silently no-op.
 *   - Don't embed timestamps in messages — Slack renders delivery time.
 */

export type NotificationType =
  | "early_access"
  | "newsletter"
  | "bot_first_hit"
  | "admin_login_ok"
  | "admin_login_fail"
  | "instantly_email_sent"
  | "instantly_email_opened"
  | "instantly_email_clicked"
  | "instantly_email_bounced"
  | "instantly_reply"
  | "instantly_unsubscribed"
  | "instantly_campaign_completed"
  | "instantly_daily_summary"
  | "seo_submit_ok"
  | "seo_submit_fail"
  | "seo_fetch_fail"
  | "seo_weekly_summary"
  | "error";

// ─────────────────────────────────────────────────────────────────────────
// Block Kit type shims (minimal — we only use what we need)
// ─────────────────────────────────────────────────────────────────────────

interface SlackField {
  type: "mrkdwn" | "plain_text";
  text: string;
}

interface SlackBlock {
  type: "header" | "section" | "context" | "divider";
  text?: SlackField;
  fields?: SlackField[];
  elements?: SlackField[];
}

interface SlackPayload {
  text: string; // fallback for notifications / email previews
  blocks?: SlackBlock[];
}

// ─────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "string") return v.length === 0 ? "—" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "—";
  }
}

function kv(label: string, value: unknown): SlackField {
  return { type: "mrkdwn", text: `*${label}*\n${str(value)}` };
}

function section(text: string): SlackBlock {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function header(text: string): SlackBlock {
  return { type: "header", text: { type: "plain_text", text } };
}

function context(text: string): SlackBlock {
  return { type: "context", elements: [{ type: "mrkdwn", text }] };
}

function fieldsBlock(fields: SlackField[]): SlackBlock {
  // Slack caps at 10 fields per block; chunk if needed
  return { type: "section", fields: fields.slice(0, 10) };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-type formatters
// ─────────────────────────────────────────────────────────────────────────

function formatEarlyAccess(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const vertical = str(p.vertical);
  const firmSize = str(p.firmSize ?? p.firm_size);
  const clientCount = str(p.clientCount ?? p.client_count);
  const source = str(p.source);

  return {
    text: `🎯 New signup — ${email}`,
    blocks: [
      header("🎯 New signup"),
      fieldsBlock([
        kv("Email", email),
        kv("Vertical", vertical),
        kv("Firm size", firmSize),
        kv("Client count", clientCount),
        kv("Source", source),
      ]),
    ],
  };
}

function formatNewsletter(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const source = str(p.source);
  const postSlug = str(p.postSlug ?? p.post_slug);

  return {
    text: `📬 Newsletter subscribe — ${email}`,
    blocks: [
      header("📬 Newsletter subscribe"),
      fieldsBlock([
        kv("Email", email),
        kv("Source", source),
        kv("From post", postSlug),
      ]),
    ],
  };
}

function formatBotFirstHit(p: Record<string, unknown>): SlackPayload {
  const botName = str(p.botName ?? p.bot_name);
  const category = str(p.category);
  const path = str(p.path);
  const country = str(p.country);

  return {
    text: `🤖 First crawl — ${botName} on ${path}`,
    blocks: [
      header("🤖 First crawl"),
      section(
        `New bot visited the site for the first time.`,
      ),
      fieldsBlock([
        kv("Bot", botName),
        kv("Category", category),
        kv("Path", path),
        kv("Country", country),
      ]),
    ],
  };
}

function formatAdminLoginOk(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const ipHash = str(p.ipHash ?? p.ip_hash);
  const ua = str(p.userAgent ?? p.user_agent);

  return {
    text: `🔒 Admin signed in — ${email}`,
    blocks: [
      header("🔒 Admin signed in"),
      fieldsBlock([
        kv("Email", email),
        kv("IP hash", ipHash),
        kv("User agent", ua.length > 200 ? ua.slice(0, 200) + "…" : ua),
      ]),
    ],
  };
}

function formatAdminLoginFail(p: Record<string, unknown>): SlackPayload {
  const email = str(p.attemptedEmail ?? p.email);
  const ipHash = str(p.ipHash ?? p.ip_hash);
  const reason = str(p.reason);
  const rateLimited = p.rateLimited === true || p.rate_limited === true;

  return {
    text: `🚨 Admin login FAILED — ${email}`,
    blocks: [
      header("🚨 Admin login FAILED"),
      fieldsBlock([
        kv("Attempted email", email),
        kv("IP hash", ipHash),
        kv("Reason", reason),
        kv("Rate limited", rateLimited ? "yes" : "no"),
      ]),
    ],
  };
}

// ─── Instantly events ───────────────────────────────────────────────────

function formatInstantlyEmailSent(p: Record<string, unknown>): SlackPayload {
  const lead = str(p.lead);
  const campaign = str(p.campaign);
  const step = str(p.step);

  return {
    text: `📤 Cold-email sent — ${lead}`,
    blocks: [
      header("📤 Cold-email sent"),
      fieldsBlock([
        kv("Lead", lead),
        kv("Campaign", campaign),
        kv("Step", step),
      ]),
    ],
  };
}

function formatInstantlyEmailOpened(
  p: Record<string, unknown>,
): SlackPayload {
  const lead = str(p.lead);
  const campaign = str(p.campaign);

  return {
    text: `👀 Cold-email opened — ${lead}`,
    blocks: [
      header("👀 Cold-email opened"),
      fieldsBlock([kv("Lead", lead), kv("Campaign", campaign)]),
    ],
  };
}

function formatInstantlyEmailClicked(
  p: Record<string, unknown>,
): SlackPayload {
  const lead = str(p.lead);
  const url = str(p.url);
  const campaign = str(p.campaign);

  return {
    text: `🔗 Cold-email link click — ${lead}`,
    blocks: [
      header("🔗 Cold-email link click"),
      fieldsBlock([
        kv("Lead", lead),
        kv("Campaign", campaign),
        kv("URL", url),
      ]),
    ],
  };
}

function formatInstantlyEmailBounced(
  p: Record<string, unknown>,
): SlackPayload {
  const lead = str(p.lead);
  const reason = str(p.reason);
  const campaign = str(p.campaign);

  return {
    text: `⚠️ Cold-email bounced — ${lead}`,
    blocks: [
      header("⚠️ Cold-email bounced"),
      fieldsBlock([
        kv("Lead", lead),
        kv("Campaign", campaign),
        kv("Reason", reason),
      ]),
    ],
  };
}

function formatInstantlyReply(p: Record<string, unknown>): SlackPayload {
  const lead = str(p.lead);
  const campaign = str(p.campaign);
  const subject = str(p.subject);

  return {
    text: `💬 Cold-email REPLY — ${lead}`,
    blocks: [
      header("💬 Cold-email REPLY"),
      fieldsBlock([
        kv("Lead", lead),
        kv("Campaign", campaign),
        kv("Subject", subject),
      ]),
    ],
  };
}

function formatInstantlyUnsubscribed(
  p: Record<string, unknown>,
): SlackPayload {
  const lead = str(p.lead);
  const campaign = str(p.campaign);

  return {
    text: `🚫 Lead unsubscribed — ${lead}`,
    blocks: [
      header("🚫 Lead unsubscribed"),
      fieldsBlock([kv("Lead", lead), kv("Campaign", campaign)]),
    ],
  };
}

function formatInstantlyCampaignCompleted(
  p: Record<string, unknown>,
): SlackPayload {
  const campaign = str(p.campaign);
  const stats = str(p.stats);

  return {
    text: `🏁 Campaign completed — ${campaign}`,
    blocks: [
      header("🏁 Campaign completed"),
      fieldsBlock([kv("Campaign", campaign), kv("Stats", stats)]),
    ],
  };
}

function formatInstantlyDailySummary(
  p: Record<string, unknown>,
): SlackPayload {
  const windowLabel = str(p.window ?? "last 24h");
  const sent = Number(p.sent ?? 0);
  const opened = Number(p.opened ?? 0);
  const openRate =
    sent > 0 ? `${Math.round((opened / sent) * 1000) / 10}%` : "—";
  const replies = Number(p.replies ?? 0);
  const clicks = Number(p.clicks ?? 0);
  const bounces = Number(p.bounces ?? 0);
  const unsubs = Number(p.unsubscribes ?? 0);

  // Per-campaign breakdown (optional)
  const byCampaign = p.by_campaign as
    | Record<string, { sent?: number; opened?: number }>
    | undefined;
  const campaignLines: string[] = [];
  if (byCampaign && typeof byCampaign === "object") {
    for (const [name, v] of Object.entries(byCampaign)) {
      const s = Number(v?.sent ?? 0);
      const o = Number(v?.opened ?? 0);
      const r = s > 0 ? `${Math.round((o / s) * 1000) / 10}%` : "—";
      campaignLines.push(`• *${name}* — sent ${s}, opened ${o} (${r})`);
    }
  }

  const blocks: SlackBlock[] = [
    header("📊 Cold email daily summary"),
    section(`Window: *${windowLabel}*`),
    fieldsBlock([
      kv("Sent", sent),
      kv("Opened", opened),
      kv("Open rate", openRate),
      kv("Replies", replies),
      kv("Clicks", clicks),
      kv("Bounces", bounces),
      kv("Unsubscribes", unsubs),
    ]),
  ];
  if (campaignLines.length > 0) {
    blocks.push(section(campaignLines.join("\n")));
  }

  return {
    text: `📊 Cold email daily — sent ${sent}, opened ${opened} (${openRate})`,
    blocks,
  };
}

// ─── SEO events ─────────────────────────────────────────────────────────

function formatSeoSubmitOk(p: Record<string, unknown>): SlackPayload {
  const totalUrls = str(p.total_urls ?? p.totalUrls);
  const summary = p.summary as Record<string, unknown> | undefined;
  const lines: string[] = [];
  if (summary && typeof summary === "object") {
    for (const [engine, val] of Object.entries(summary)) {
      const v = val as { ok?: boolean; status?: number; count?: number } | undefined;
      if (!v) continue;
      const ok = v.ok === true ? "✅" : "❌";
      const parts: string[] = [`${ok} ${engine}`];
      if (typeof v.status === "number") parts.push(`status=${v.status}`);
      if (typeof v.count === "number") parts.push(`count=${v.count}`);
      lines.push(parts.join(" · "));
    }
  }

  return {
    text: `🟢 SEO submit OK — ${totalUrls} URLs`,
    blocks: [
      header("🟢 SEO submit summary"),
      section(`*Total URLs:* ${totalUrls}`),
      ...(lines.length > 0
        ? [section(lines.map((l) => `• ${l}`).join("\n"))]
        : []),
    ],
  };
}

function formatSeoSubmitFail(p: Record<string, unknown>): SlackPayload {
  const summary = p.summary as Record<string, unknown> | undefined;
  const failures: string[] = [];
  if (summary && typeof summary === "object") {
    for (const [engine, val] of Object.entries(summary)) {
      const v = val as { ok?: boolean; status?: number } | undefined;
      if (v && v.ok === false) {
        failures.push(`❌ ${engine} (status=${v?.status ?? "?"})`);
      }
    }
  }

  return {
    text: "⚠️ SEO submit failures",
    blocks: [
      header("⚠️ SEO submit failure"),
      section(
        failures.length > 0
          ? failures.map((l) => `• ${l}`).join("\n")
          : "One or more engines returned failure. See summary.",
      ),
      context(
        `Full summary: \`${str(summary).slice(0, 1500)}\``,
      ),
    ],
  };
}

function formatSeoFetchFail(p: Record<string, unknown>): SlackPayload {
  const summary = p.summary as Record<string, unknown> | undefined;
  const googleErr = summary?.google_error ?? null;
  const bingErr = summary?.bing_error ?? null;

  return {
    text: "⚠️ SEO fetch failure",
    blocks: [
      header("⚠️ SEO fetch failure"),
      fieldsBlock([
        kv("Google error", googleErr),
        kv("Bing error", bingErr),
      ]),
    ],
  };
}

function formatSeoWeeklySummary(p: Record<string, unknown>): SlackPayload {
  const windowLabel = str(p.window ?? "last 7d");
  const runs = Number(p.runs ?? 0);
  const totalUrls = Number(p.total_urls ?? 0);
  const googleOk = Number(p.google_ok ?? 0);
  const googleFail = Number(p.google_fail ?? 0);
  const bingOk = Number(p.bing_ok ?? 0);
  const bingFail = Number(p.bing_fail ?? 0);
  const indexnowOk = Number(p.indexnow_ok ?? 0);
  const indexnowFail = Number(p.indexnow_fail ?? 0);

  return {
    text: `📈 SEO weekly — ${runs} runs, ${totalUrls} URL submissions`,
    blocks: [
      header("📈 SEO weekly summary"),
      section(`Window: *${windowLabel}* · Runs: *${runs}*`),
      fieldsBlock([
        kv("Total URL submissions", totalUrls),
        kv("Google ok / fail", `${googleOk} / ${googleFail}`),
        kv("Bing ok / fail", `${bingOk} / ${bingFail}`),
        kv("IndexNow ok / fail", `${indexnowOk} / ${indexnowFail}`),
      ]),
    ],
  };
}

// ─── Generic error ──────────────────────────────────────────────────────

function formatError(p: Record<string, unknown>): SlackPayload {
  const where = str(p.where);
  const message = str(p.message);

  return {
    text: `🔴 Error — ${where}: ${message}`,
    blocks: [
      header("🔴 Error"),
      fieldsBlock([kv("Where", where), kv("Message", message)]),
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────

function buildPayload(
  type: NotificationType,
  payload: Record<string, unknown>,
): SlackPayload {
  switch (type) {
    case "early_access":
      return formatEarlyAccess(payload);
    case "newsletter":
      return formatNewsletter(payload);
    case "bot_first_hit":
      return formatBotFirstHit(payload);
    case "admin_login_ok":
      return formatAdminLoginOk(payload);
    case "admin_login_fail":
      return formatAdminLoginFail(payload);
    case "instantly_email_sent":
      return formatInstantlyEmailSent(payload);
    case "instantly_email_opened":
      return formatInstantlyEmailOpened(payload);
    case "instantly_email_clicked":
      return formatInstantlyEmailClicked(payload);
    case "instantly_email_bounced":
      return formatInstantlyEmailBounced(payload);
    case "instantly_reply":
      return formatInstantlyReply(payload);
    case "instantly_unsubscribed":
      return formatInstantlyUnsubscribed(payload);
    case "instantly_campaign_completed":
      return formatInstantlyCampaignCompleted(payload);
    case "instantly_daily_summary":
      return formatInstantlyDailySummary(payload);
    case "seo_submit_ok":
      return formatSeoSubmitOk(payload);
    case "seo_submit_fail":
      return formatSeoSubmitFail(payload);
    case "seo_fetch_fail":
      return formatSeoFetchFail(payload);
    case "seo_weekly_summary":
      return formatSeoWeeklySummary(payload);
    case "error":
      return formatError(payload);
    default: {
      // exhaustiveness — fall back to a generic error format
      const _exhaustive: never = type;
      void _exhaustive;
      return formatError({ where: "unknown_type", message: String(type) });
    }
  }
}

/**
 * Post the formatted message to the Slack webhook.
 *
 * Never throws. If the webhook is missing or the request fails, logs a
 * warning and returns. Caller may or may not `await` — the internal fetch
 * is awaited here so a `void` caller still completes within the function.
 */
export async function notifySlack(
  type: NotificationType,
  payload: Record<string, unknown>,
): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook) {
    console.warn(
      `[slack] SLACK_WEBHOOK_URL not set — skipping notification (${type})`,
    );
    return;
  }

  let body: SlackPayload;
  try {
    body = buildPayload(type, payload);
  } catch (e) {
    console.warn(`[slack] payload build failed for ${type}:`, e);
    return;
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // fire-and-forget friendly: short-circuit if the platform wants
      keepalive: true,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(
        `[slack] webhook non-200 for ${type}: ${res.status} ${txt.slice(0, 200)}`,
      );
    }
  } catch (e) {
    console.warn(`[slack] webhook error for ${type}:`, e);
  }
}

/**
 * Fire-and-forget wrapper. Kicks off the notification without returning a
 * pending Promise to the caller. Use at call sites where we can't await
 * (middleware-adjacent handlers, early-return code paths, etc.).
 */
export function safeNotify(
  type: NotificationType,
  payload: Record<string, unknown>,
): void {
  void notifySlack(type, payload).catch(() => {
    // notifySlack already swallows errors internally, but belt-and-braces:
    // never let a rejected promise escape.
  });
}
