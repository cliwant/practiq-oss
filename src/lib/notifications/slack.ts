/**
 * Unified Slack notification client.
 *
 * Every meaningful business/ops event flows through this module and gets
 * posted to the single SLACK_WEBHOOK_URL. Each notification type has its
 * own formatter that produces emoji-prefixed, category-labeled messages,
 * using Block Kit where it aids legibility.
 *
 * Language policy (studio-wide): all user-visible Slack content is Korean.
 * Exceptions preserved as-is: email addresses, domain names, URLs, user
 * agents, campaign/lead IDs, venture slugs, and other code identifiers.
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
  | "practiq_hourly_heartbeat"
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
// Per-type formatters (사용자 노출 텍스트 전부 한국어)
// ─────────────────────────────────────────────────────────────────────────

function formatEarlyAccess(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const vertical = str(p.vertical);
  const firmSize = str(p.firmSize ?? p.firm_size);
  const clientCount = str(p.clientCount ?? p.client_count);
  const source = str(p.source);

  return {
    text: `🎯 새 가입 — ${email}`,
    blocks: [
      header("🎯 새 가입"),
      fieldsBlock([
        kv("이메일", email),
        kv("수직", vertical),
        kv("펌 규모", firmSize),
        kv("고객 수", clientCount),
        kv("소스", source),
      ]),
    ],
  };
}

function formatNewsletter(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const source = str(p.source);
  const postSlug = str(p.postSlug ?? p.post_slug);

  return {
    text: `📬 뉴스레터 구독 — ${email}`,
    blocks: [
      header("📬 뉴스레터 구독"),
      fieldsBlock([
        kv("이메일", email),
        kv("소스", source),
        kv("출처 포스트", postSlug),
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
    text: `🤖 첫 크롤 — ${botName} @ ${path}`,
    blocks: [
      header("🤖 첫 크롤"),
      section("봇이 사이트를 처음 방문했습니다."),
      fieldsBlock([
        kv("봇", botName),
        kv("분류", category),
        kv("경로", path),
        kv("국가", country),
      ]),
    ],
  };
}

function formatAdminLoginOk(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const ipHash = str(p.ipHash ?? p.ip_hash);
  const ua = str(p.userAgent ?? p.user_agent);

  return {
    text: `🔒 관리자 로그인 — ${email}`,
    blocks: [
      header("🔒 관리자 로그인"),
      fieldsBlock([
        kv("이메일", email),
        kv("IP 해시", ipHash),
        kv("User Agent", ua.length > 200 ? ua.slice(0, 200) + "…" : ua),
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
    text: `🚨 관리자 로그인 실패 — ${email}`,
    blocks: [
      header("🚨 관리자 로그인 실패"),
      fieldsBlock([
        kv("시도 이메일", email),
        kv("IP 해시", ipHash),
        kv("사유", reason),
        kv("Rate limit 걸림", rateLimited ? "예" : "아니오"),
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
    text: `📤 콜드메일 발송 — ${lead}`,
    blocks: [
      header("📤 콜드메일 발송"),
      fieldsBlock([
        kv("리드", lead),
        kv("캠페인", campaign),
        kv("단계", step),
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
    text: `👀 콜드메일 열람 — ${lead}`,
    blocks: [
      header("👀 콜드메일 열람"),
      fieldsBlock([kv("리드", lead), kv("캠페인", campaign)]),
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
    text: `🔗 콜드메일 링크 클릭 — ${lead}`,
    blocks: [
      header("🔗 콜드메일 링크 클릭"),
      fieldsBlock([
        kv("리드", lead),
        kv("캠페인", campaign),
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
    text: `⚠️ 콜드메일 반송 — ${lead}`,
    blocks: [
      header("⚠️ 콜드메일 반송"),
      fieldsBlock([
        kv("리드", lead),
        kv("캠페인", campaign),
        kv("사유", reason),
      ]),
    ],
  };
}

function formatInstantlyReply(p: Record<string, unknown>): SlackPayload {
  const lead = str(p.lead);
  const campaign = str(p.campaign);
  const subject = str(p.subject);
  const replyRaw = p.replyText;
  // Strip HTML tags + collapse whitespace + cap length so Slack stays readable.
  // Instantly sometimes sends HTML reply bodies; a simple strip beats leaking
  // tag soup into ops messages.
  const replyClean =
    typeof replyRaw === "string" && replyRaw.trim().length > 0
      ? replyRaw
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 600)
      : null;

  const blocks: SlackBlock[] = [
    header("💬 콜드메일 회신"),
    fieldsBlock([
      kv("리드", lead),
      kv("캠페인", campaign),
      kv("제목", subject),
    ]),
  ];

  if (replyClean) {
    blocks.push(section(`*회신 본문*\n> ${replyClean.replace(/\n/g, "\n> ")}`));
  }

  return {
    text: `💬 콜드메일 회신 — ${lead}`,
    blocks,
  };
}

function formatInstantlyUnsubscribed(
  p: Record<string, unknown>,
): SlackPayload {
  const lead = str(p.lead);
  const campaign = str(p.campaign);

  return {
    text: `🚫 리드 수신거부 — ${lead}`,
    blocks: [
      header("🚫 리드 수신거부"),
      fieldsBlock([kv("리드", lead), kv("캠페인", campaign)]),
    ],
  };
}

function formatInstantlyCampaignCompleted(
  p: Record<string, unknown>,
): SlackPayload {
  const campaign = str(p.campaign);
  const stats = str(p.stats);

  return {
    text: `🏁 캠페인 완료 — ${campaign}`,
    blocks: [
      header("🏁 캠페인 완료"),
      fieldsBlock([kv("캠페인", campaign), kv("통계", stats)]),
    ],
  };
}

function formatInstantlyDailySummary(
  p: Record<string, unknown>,
): SlackPayload {
  const windowLabel = str(p.window ?? "최근 24시간");
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
      campaignLines.push(`• *${name}* — 발송 ${s}, 열람 ${o} (${r})`);
    }
  }

  const blocks: SlackBlock[] = [
    header("📊 콜드메일 일일 요약"),
    section(`기간: *${windowLabel}*`),
    fieldsBlock([
      kv("발송", sent),
      kv("열람", opened),
      kv("열람률", openRate),
      kv("회신", replies),
      kv("클릭", clicks),
      kv("반송", bounces),
      kv("수신거부", unsubs),
    ]),
  ];
  if (campaignLines.length > 0) {
    blocks.push(section(campaignLines.join("\n")));
  }

  return {
    text: `📊 콜드메일 일일 — 발송 ${sent}, 열람 ${opened} (${openRate})`,
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
    text: `🟢 SEO 제출 OK — URL ${totalUrls}개`,
    blocks: [
      header("🟢 SEO 제출 요약"),
      section(`*총 URL:* ${totalUrls}`),
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
    text: "⚠️ SEO 제출 실패",
    blocks: [
      header("⚠️ SEO 제출 실패"),
      section(
        failures.length > 0
          ? failures.map((l) => `• ${l}`).join("\n")
          : "하나 이상의 엔진이 실패를 반환했습니다. 요약을 확인하세요.",
      ),
      context(
        `전체 요약: \`${str(summary).slice(0, 1500)}\``,
      ),
    ],
  };
}

function formatSeoFetchFail(p: Record<string, unknown>): SlackPayload {
  const summary = p.summary as Record<string, unknown> | undefined;
  const googleErr = summary?.google_error ?? null;
  const bingErr = summary?.bing_error ?? null;

  return {
    text: "⚠️ SEO 수집 실패",
    blocks: [
      header("⚠️ SEO 수집 실패"),
      fieldsBlock([
        kv("Google 오류", googleErr),
        kv("Bing 오류", bingErr),
      ]),
    ],
  };
}

function formatPractiqHourlyHeartbeat(
  p: Record<string, unknown>,
): SlackPayload {
  const windowLabel = str(p.window ?? "최근 1시간");
  const eventsTotal = Number(p.events_total ?? 0);
  const sent = Number(p.sent ?? 0);
  const opened = Number(p.opened ?? 0);
  const clicks = Number(p.clicks ?? 0);
  const replies = Number(p.replies ?? 0);
  const bounces = Number(p.bounces ?? 0);
  const unsubs = Number(p.unsubscribes ?? 0);
  const campaigns = p.campaigns as
    | Array<{
        name: string;
        leads: number;
        contacted: number;
        sent: number;
        delta_contacted?: number;
        delta_sent?: number;
      }>
    | undefined;

  const campaignLines: string[] = [];
  if (campaigns && Array.isArray(campaigns)) {
    for (const c of campaigns) {
      const deltaLabel =
        (c.delta_contacted ?? 0) > 0
          ? ` (+${c.delta_contacted} 접촉, +${c.delta_sent ?? 0} 발송)`
          : "";
      campaignLines.push(
        `• *${c.name}* — ${c.contacted}/${c.leads} 접촉, ${c.sent} 발송${deltaLabel}`,
      );
    }
  }

  const summary = [
    eventsTotal > 0 ? `이벤트 ${eventsTotal}건` : "조용함",
    sent > 0 ? `발송 ${sent}` : null,
    opened > 0 ? `열람 ${opened}` : null,
    replies > 0 ? `회신 ${replies}` : null,
    bounces > 0 ? `반송 ${bounces}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const blocks: SlackBlock[] = [
    header("⏱️ 시간당 상태"),
    section(`기간: *${windowLabel}* · ${summary}`),
  ];
  if (eventsTotal > 0) {
    blocks.push(
      fieldsBlock([
        kv("발송", sent),
        kv("열람", opened),
        kv("클릭", clicks),
        kv("회신", replies),
        kv("반송", bounces),
        kv("수신거부", unsubs),
      ]),
    );
  }
  if (campaignLines.length > 0) {
    blocks.push(section(campaignLines.join("\n")));
  }

  return {
    text: `⏱️ 시간당 — ${summary}`,
    blocks,
  };
}

function formatSeoWeeklySummary(p: Record<string, unknown>): SlackPayload {
  const windowLabel = str(p.window ?? "최근 7일");
  const runs = Number(p.runs ?? 0);
  const totalUrls = Number(p.total_urls ?? 0);
  const googleOk = Number(p.google_ok ?? 0);
  const googleFail = Number(p.google_fail ?? 0);
  const bingOk = Number(p.bing_ok ?? 0);
  const bingFail = Number(p.bing_fail ?? 0);
  const indexnowOk = Number(p.indexnow_ok ?? 0);
  const indexnowFail = Number(p.indexnow_fail ?? 0);

  return {
    text: `📈 SEO 주간 — 실행 ${runs}회, URL 제출 ${totalUrls}건`,
    blocks: [
      header("📈 SEO 주간 요약"),
      section(`기간: *${windowLabel}* · 실행: *${runs}회*`),
      fieldsBlock([
        kv("총 URL 제출", totalUrls),
        kv("Google 성공/실패", `${googleOk} / ${googleFail}`),
        kv("Bing 성공/실패", `${bingOk} / ${bingFail}`),
        kv("IndexNow 성공/실패", `${indexnowOk} / ${indexnowFail}`),
      ]),
    ],
  };
}

// ─── Generic error ──────────────────────────────────────────────────────

function formatError(p: Record<string, unknown>): SlackPayload {
  const where = str(p.where);
  const message = str(p.message);

  return {
    text: `🔴 오류 — ${where}: ${message}`,
    blocks: [
      header("🔴 오류"),
      fieldsBlock([kv("위치", where), kv("메시지", message)]),
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
    case "practiq_hourly_heartbeat":
      return formatPractiqHourlyHeartbeat(payload);
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
