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
  | "practiq_signup"
  | "practiq_payment_success"
  | "practiq_payment_failed"
  | "practiq_subscription_canceled"
  | "practiq_chat_quota_exceeded"
  | "bot_first_hit"
  | "admin_login_ok"
  | "admin_login_fail"
  | "instantly_email_sent"
  | "instantly_email_opened"
  | "instantly_email_clicked"
  | "instantly_email_bounced"
  | "transactional_email_bounced"
  | "transactional_email_complained"
  | "transactional_email_delivery_delayed"
  | "instantly_reply"
  | "instantly_unsubscribed"
  | "instantly_campaign_completed"
  | "instantly_daily_summary"
  | "practiq_hourly_heartbeat"
  | "seo_submit_ok"
  | "seo_submit_fail"
  | "seo_fetch_fail"
  | "seo_weekly_summary"
  // RUN 24 audit fix #2: nightly-agent cron Slack alerts. _summary is
  // the all-clear (every run succeeded, no skips); _warning fires when
  // any failure / spend-ceiling skip / budget skip / >5% failure rate
  // is seen. Both go to the same channel so the operator sees agent
  // health alongside transactional email + Stripe events.
  | "agent_cron_summary"
  | "agent_cron_warning"
  // CSP violation report — fired by /api/csp-report on novel
  // (directive, blocked-uri, document-path) tuples so the operator
  // sees it before flipping CSP from Report-Only to Enforce. Heavy
  // in-route de-duplication keeps the channel quiet.
  | "csp_violation"
  | "workflow_audit_completed"
  | "workflow_audit_followup_sent"
  | "policy_generated"
  | "user_error_critical"
  | "stripe_webhook_failed"
  // Fires when the 5-minute Vercel cron at /api/cron/health-check
  // observes one of the 5 dependencies (db / resend / openrouter /
  // storage / stripe) flip ok → down vs. the prior recorded health
  // row. Critical severity — every flip is a real production
  // dependency outage. Dedupe is by comparison with the prior row's
  // checks_json, so this only fires on the transition, not on every
  // 5-minute tick while the dependency is down.
  | "system_health_failure"
  // Per-firm LLM spend ceiling hit (Wave-4 P0-02). Fires when a firm
  // exhausts its 30d $-budget on the public LLM hot paths
  // (workflow-audit, ai-policy-generator). Distinct from
  // user_error_critical so the operator can spot abuse patterns at a
  // glance rather than buried among genuine generation errors.
  | "system_spend_ceiling_hit"
  // Tier 3 lifecycle hardening — domain-meaningful billing events
  // surfaced from the Stripe webhook handler. Each one writes a row to
  // practiq.billing_incidents (the operator's audit ledger at
  // /admin/incidents/billing) AND fires a Slack ping with the customer
  // context the operator needs to triage without digging into Stripe.
  //
  // - billing_payment_failed: invoice charge declined / card bounced.
  //   First attempt = warning, subsequent attempts = critical (Stripe
  //   smart retries usually give up after 4 attempts).
  // - billing_subscription_canceled: customer churned. Warning.
  //   Distinguishes self-cancel (cancellation_details.reason set) from
  //   payment-failure cascade.
  // - billing_chargeback_filed: dispute filed. Always critical — rare
  //   but expensive and time-sensitive (Stripe due_by enforced).
  | "billing_payment_failed"
  | "billing_subscription_canceled"
  | "billing_chargeback_filed"
  // Wave 16 deliverability alerts — sit beside the legacy
  // `transactional_email_bounced` / `transactional_email_complained`
  // types. The new pipeline (src/lib/email/tracking.ts +
  // src/lib/email/suppressions.ts) dedupes on the
  // practiq.email_suppressions row's last_slack_at so we don't ping
  // ops for every send to a known-bad address. Severity escalates
  // from warning → critical when the recipient looks like a paying
  // customer (signed-up User row, or shares a firm domain with one).
  // Complaints are ALWAYS critical (sender-reputation risk overrides
  // dedupe).
  | "email_bounce"
  | "email_complaint"
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

function formatWorkflowAuditCompleted(
  p: Record<string, unknown>,
): SlackPayload {
  const email = str(p.email);
  const name = str(p.name);
  const firmName = str(p.firmName ?? p.firm_name);
  const firmVertical = str(p.firmVertical ?? p.firm_vertical);
  const firmSize = str(p.firmSize ?? p.firm_size);
  const clientCount = str(p.clientCount ?? p.client_count);
  const primaryGap = str(p.primaryGap ?? p.primary_gap);
  const landingSlug = str(p.landingSlug ?? p.landing_slug);
  const sourcePlatform = str(p.sourcePlatform ?? p.source_platform);
  const headline = str(p.headline);

  return {
    text: `🧭 워크플로 audit 완료 — ${email}`,
    blocks: [
      header("🧭 워크플로 audit 완료"),
      fieldsBlock([
        kv("이메일", email),
        kv("이름", name),
        kv("회사", firmName),
        kv("수직", firmVertical),
        kv("팀 규모", firmSize),
        kv("고객 수", clientCount),
        kv("Primary gap", primaryGap),
        kv("랜딩", landingSlug),
        kv("Source", sourcePlatform),
      ]),
      section(`*Headline:*\n${headline}`),
    ],
  };
}

function formatWorkflowAuditFollowupSent(
  p: Record<string, unknown>,
): SlackPayload {
  const email = str(p.email);
  const name = str(p.name);
  const firmName = str(p.firmName ?? p.firm_name);
  const firmVertical = str(p.firmVertical ?? p.firm_vertical);
  const primaryGap = str(p.primaryGap ?? p.primary_gap);
  const auditId = str(p.auditId ?? p.audit_id);
  const hoursSinceAudit = str(p.hoursSinceAudit ?? p.hours_since_audit);
  const subject = str(p.subject);

  return {
    text: `📨 워크플로 audit 후속 메일 발송 — ${email}`,
    blocks: [
      header("📨 워크플로 audit 후속 메일 발송 (+24h)"),
      fieldsBlock([
        kv("이메일", email),
        kv("이름", name),
        kv("회사", firmName),
        kv("수직", firmVertical),
        kv("Primary gap", primaryGap),
        kv("audit 이후 (h)", hoursSinceAudit),
        kv("Audit ID", auditId),
      ]),
      section(`*Subject:*\n${subject}`),
      context(
        "사용자가 회신하면 design-partner conversation 으로 발전 가능. " +
          "수동 답장은 hello@practiq.dev inbox 에서 처리.",
      ),
    ],
  };
}

function formatPolicyGenerated(
  p: Record<string, unknown>,
): SlackPayload {
  const email = str(p.email);
  const name = str(p.name);
  const firmName = str(p.firmName ?? p.firm_name);
  const firmVertical = str(p.firmVertical ?? p.firm_vertical);
  const firmSize = str(p.firmSize ?? p.firm_size);
  const states = str(p.states);
  const policyTitle = str(p.policyTitle ?? p.policy_title);
  const landingSlug = str(p.landingSlug ?? p.landing_slug);
  const sourcePlatform = str(p.sourcePlatform ?? p.source_platform);
  const pdfUrl = str(p.pdfUrl ?? p.pdf_url);

  return {
    text: `📄 AI 정책 생성 완료 — ${email}`,
    blocks: [
      header("📄 AI 정책 생성 완료"),
      fieldsBlock([
        kv("이메일", email),
        kv("이름", name),
        kv("회사", firmName),
        kv("수직", firmVertical),
        kv("팀 규모", firmSize),
        kv("주", states),
        kv("랜딩", landingSlug),
        kv("Source", sourcePlatform),
      ]),
      section(`*Policy title:*\n${policyTitle}`),
      section(`*PDF:*\n${pdfUrl}`),
    ],
  };
}

// ─── Practiq product events (실 회원가입 / 결제) ──────────────────────────

function formatPractiqSignup(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const name = str(p.name);
  const firmName = str(p.firmName ?? p.firm_name);
  const firmVertical = str(p.firmVertical ?? p.firm_vertical);
  const userId = str(p.userId ?? p.user_id);
  const provider = str(p.provider); // credentials | google | linkedin | microsoft-entra-id

  return {
    text: `✨ Practiq 신규 가입 — ${email}`,
    blocks: [
      header("✨ Practiq 신규 가입"),
      fieldsBlock([
        kv("이메일", email),
        kv("이름", name),
        kv("펌 이름", firmName),
        kv("버티컬", firmVertical),
        kv("로그인 방식", provider),
        kv("User ID", userId),
      ]),
      context(
        `<https://practiq.dev/admin?user=${userId}|관리자에서 보기> · ` +
          `welcome 메일은 fire-and-forget 으로 발송됨`,
      ),
    ],
  };
}

function formatPractiqPaymentSuccess(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const plan = str(p.plan);
  const amountUsd = str(p.amountUsd ?? p.amount_usd);
  const event = str(p.event); // checkout.session.completed | invoice.paid
  const subId = str(p.stripeSubscriptionId ?? p.stripe_subscription_id);
  const seats = str(p.seatCount ?? p.seat_count);

  return {
    text: `💰 Practiq 결제 성공 — ${email} · ${plan} ($${amountUsd})`,
    blocks: [
      header("💰 Practiq 결제 성공"),
      fieldsBlock([
        kv("이메일", email),
        kv("플랜", plan),
        kv("월 금액 (USD)", amountUsd),
        kv("좌석 수", seats),
        kv("이벤트", event),
        kv("Stripe Sub ID", subId),
      ]),
      context(
        `<https://dashboard.stripe.com/subscriptions/${subId}|Stripe 에서 열기>`,
      ),
    ],
  };
}

function formatPractiqPaymentFailed(p: Record<string, unknown>): SlackPayload {
  const email = str(p.email);
  const plan = str(p.plan);
  const subId = str(p.stripeSubscriptionId ?? p.stripe_subscription_id);
  const reason = str(p.reason);
  const attemptCount = str(p.attemptCount ?? p.attempt_count);

  return {
    text: `🔴 Practiq 결제 실패 — ${email} · ${plan}`,
    blocks: [
      header("🔴 Practiq 결제 실패"),
      section(
        "Stripe 가 결제 실패를 보고했습니다. 카드 만료/한도 초과/은행 거절 등이 가능. " +
          "고객에게 카드 업데이트 안내 메일이 자동 발송되어야 합니다.",
      ),
      fieldsBlock([
        kv("이메일", email),
        kv("플랜", plan),
        kv("사유", reason),
        kv("시도 회수", attemptCount),
        kv("Stripe Sub ID", subId),
      ]),
      context(
        `<https://dashboard.stripe.com/subscriptions/${subId}|Stripe 에서 열기>`,
      ),
    ],
  };
}

function formatPractiqSubscriptionCanceled(
  p: Record<string, unknown>,
): SlackPayload {
  const email = str(p.email);
  const plan = str(p.plan);
  const subId = str(p.stripeSubscriptionId ?? p.stripe_subscription_id);
  const cancelReason = str(p.cancelReason ?? p.cancel_reason);
  const periodEnd = str(p.currentPeriodEnd ?? p.current_period_end);

  return {
    text: `👋 Practiq 구독 해지 — ${email} · ${plan}`,
    blocks: [
      header("👋 Practiq 구독 해지"),
      fieldsBlock([
        kv("이메일", email),
        kv("플랜", plan),
        kv("기간 종료", periodEnd),
        kv("사유", cancelReason),
        kv("Stripe Sub ID", subId),
      ]),
      context("이탈 인터뷰 요청 메일을 14일 내 발송 권장."),
    ],
  };
}

function formatPractiqChatQuotaExceeded(
  p: Record<string, unknown>,
): SlackPayload {
  const email = str(p.email);
  const userId = str(p.userId ?? p.user_id);
  const window = str(p.window);
  const usage = str(p.usage);
  const limit = str(p.limit);

  return {
    text: `⚠️ Chat quota 초과 — ${email}`,
    blocks: [
      header("⚠️ Chat quota 초과"),
      section(
        "사용자가 chat 요청 한도를 초과해 429 응답을 받았습니다. " +
          "정상 사용 패턴인지 abuse 인지 확인 권장.",
      ),
      fieldsBlock([
        kv("이메일", email),
        kv("User ID", userId),
        kv("기간", window),
        kv("사용량 / 한도", `${usage} / ${limit}`),
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

/**
 * RUN 11 (P0-05): transactional email lifecycle alerts. Fires when a
 * Resend webhook reports a hard failure on something we sent (welcome
 * email, password reset, billing receipt, etc.). The "complained"
 * variant is highest priority — recipients hitting "Mark as spam"
 * directly damages our sender reputation.
 */
function formatTransactionalEmailBounced(
  p: Record<string, unknown>,
): SlackPayload {
  const to = str(p.to);
  const subject = str(p.subject);
  const tag = str(p.tag);
  const bounceType = str(p.bounceType ?? "unknown");
  const messageId = str(p.messageId);
  return {
    text: `⚠️ 트랜잭션 메일 반송 (${tag}) — ${to}`,
    blocks: [
      header("⚠️ 트랜잭션 메일 반송"),
      fieldsBlock([
        kv("수신자", to),
        kv("제목", subject),
        kv("태그", tag || "(none)"),
        kv("반송 유형", bounceType),
        kv("Message ID", messageId),
      ]),
    ],
  };
}

/**
 * Wave 16 deliverability alerts — paired with practiq.email_suppressions.
 * The ledger handles dedupe (first alert per address, plus a 24h re-fire
 * for persistent issues). These formatters mask the recipient,
 * surface the paying-customer flag, and link to the admin triage view.
 */
function maskRecipient(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "(masked)";
  return `${trimmed[0]}***${trimmed.slice(at)}`;
}

function formatEmailBounce(p: Record<string, unknown>): SlackPayload {
  const recipientRaw = str(p.recipient ?? p.to);
  const recipient = maskRecipient(recipientRaw);
  const subject = str(p.subject);
  const tag = str(p.tag);
  const bounceType = str(p.bounceType ?? "unknown");
  const messageId = str(p.messageId);
  const isPaying = Boolean(p.isPayingCustomer);
  const bounceCount = str(p.bounceCount ?? 1);
  const customerHint = isPaying
    ? "🔴 *paying customer 도메인*"
    : "🟡 non-customer";

  return {
    text: `${isPaying ? "🚨" : "⚠️"} 메일 반송 (${tag}) — ${recipient}`,
    blocks: [
      header(
        isPaying
          ? "🚨 메일 반송 — 유료 고객 도메인"
          : "⚠️ 메일 반송",
      ),
      fieldsBlock([
        kv("수신자", recipient),
        kv("고객 분류", customerHint),
        kv("제목", subject),
        kv("태그", tag || "(none)"),
        kv("반송 유형", bounceType),
        kv("누적 반송", bounceCount),
        kv("Message ID", messageId),
      ]),
      context(
        "이 주소는 자동으로 suppression 목록에 추가됩니다. " +
          "다음 24h 내 반복 반송은 Slack 알림을 건너뜁니다. " +
          "<https://practiq.dev/admin/incidents/email-deliverability|/admin/incidents/email-deliverability>",
      ),
    ],
  };
}

function formatEmailComplaint(p: Record<string, unknown>): SlackPayload {
  const recipientRaw = str(p.recipient ?? p.to);
  const recipient = maskRecipient(recipientRaw);
  const subject = str(p.subject);
  const tag = str(p.tag);
  const messageId = str(p.messageId);
  const isPaying = Boolean(p.isPayingCustomer);

  return {
    text: `🚨 스팸 신고 — ${recipient} (${tag})`,
    blocks: [
      header("🚨 스팸 신고 — sender reputation 위험"),
      fieldsBlock([
        kv("수신자", recipient),
        kv("고객 분류", isPaying ? "🔴 paying customer" : "🟡 non-customer"),
        kv("제목", subject),
        kv("태그", tag || "(none)"),
        kv("Message ID", messageId),
      ]),
      section(
        "*조치 필요:* sender reputation 직접 영향. " +
          "해당 주소를 즉시 suppression 처리하고, 같은 태그의 다른 발송을 " +
          "검토하세요. /admin/incidents/email-deliverability 에서 추가 추적.",
      ),
    ],
  };
}

function formatTransactionalEmailComplained(
  p: Record<string, unknown>,
): SlackPayload {
  const to = str(p.to);
  const subject = str(p.subject);
  const tag = str(p.tag);
  const messageId = str(p.messageId);
  return {
    text: `🚨 스팸 신고 — ${to} (${tag})`,
    blocks: [
      header("🚨 스팸 신고 — sender reputation 위험"),
      fieldsBlock([
        kv("수신자", to),
        kv("제목", subject),
        kv("태그", tag || "(none)"),
        kv("Message ID", messageId),
      ]),
    ],
  };
}

function formatTransactionalEmailDelayed(
  p: Record<string, unknown>,
): SlackPayload {
  const to = str(p.to);
  const tag = str(p.tag);
  const messageId = str(p.messageId);
  return {
    text: `⏱ 메일 발송 지연 — ${to} (${tag})`,
    blocks: [
      header("⏱ 메일 발송 지연"),
      fieldsBlock([
        kv("수신자", to),
        kv("태그", tag || "(none)"),
        kv("Message ID", messageId),
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

// ─── Agent cron summary / warning (RUN 24 audit fix #2) ───────────────

function formatAgentCronSummary(
  p: Record<string, unknown>,
  isWarning: boolean,
): SlackPayload {
  const cron = str(p.cron);
  const eligibleUsers = Number(p.eligibleUsers ?? 0);
  const processedUsers = Number(p.processedUsers ?? 0);
  const totalRuns = Number(p.totalRuns ?? 0);
  const succeeded = Number(p.succeeded ?? 0);
  const failed = Number(p.failed ?? 0);
  const retried = Number(p.retried ?? 0);
  const approvals = Number(p.approvals ?? 0);
  const usdCost = Number(p.usdCost ?? 0);
  const skippedDuplicate = Number(p.skippedDuplicate ?? 0);
  const skippedSpendCeiling = Number(p.skippedSpendCeiling ?? 0);
  const skippedBudget = Number(p.skippedBudget ?? 0);
  const elapsedSec = Number(p.elapsedSec ?? 0);
  const failureRatePct = Number(p.failureRatePct ?? 0);
  const emoji = isWarning ? "⚠️" : "✅";
  const heading = isWarning
    ? `${emoji} 에이전트 크론 경보 — ${cron}`
    : `${emoji} 에이전트 크론 정상 — ${cron}`;

  return {
    text: `${heading} · 실행 ${totalRuns} · 성공 ${succeeded} · 실패 ${failed} · $${usdCost.toFixed(2)}`,
    blocks: [
      header(heading),
      fieldsBlock([
        kv("크론", cron),
        kv("적격 사용자", eligibleUsers),
        kv("처리된 사용자", processedUsers),
        kv("총 실행", totalRuns),
        kv("성공", succeeded),
        kv("실패", failed),
        kv("재시도 사용", retried),
        kv("승인 항목 생성", approvals),
        kv("총 비용 USD", `$${usdCost.toFixed(4)}`),
        kv("중복 스킵", skippedDuplicate),
        kv("Spend ceiling 스킵", skippedSpendCeiling),
        kv("Token budget 스킵", skippedBudget),
        kv("소요 시간 (초)", elapsedSec),
        kv("실패율 (%)", failureRatePct),
      ]),
    ],
  };
}

// ─── User-facing error (production triage) ─────────────────────────────
//
// Fires when a real visitor hits an error on a user-facing surface
// (workflow audit, policy generator, early-access form, client JS,
// etc.). Designed so the operator can triage in <30s without opening
// Vercel logs — the message must carry route, step, sanitized user
// context, and a deep link into /admin/incidents.
//
// Severity emoji is chosen by the caller via `options.severity` and
// the payload's `severity` hint (5xx → critical, 4xx → warning, 429 →
// info). See `reportUserError` in src/lib/notifications/user-error.ts.

function formatUserErrorCritical(p: Record<string, unknown>): SlackPayload {
  const severity = (typeof p.severity === "string" ? p.severity : "warning") as
    | "critical"
    | "warning"
    | "info";
  const emoji =
    severity === "critical" ? "🚨" : severity === "info" ? "ℹ️" : "⚠️";
  const surface = str(p.surface);
  const endpoint = str(p.endpoint);
  const stepLabel = str(p.step);
  const statusLabel = str(p.status);
  const errorMessage = str(p.errorMessage ?? p.error_message);
  const stackHead = str(p.stackHead ?? p.error_stack ?? "");
  const userEmailMasked = str(p.userEmailMasked);
  const userCountry = str(p.userCountry);
  const userAgentShort = str(p.userAgentShort);
  const surfaceLink = str(p.surfaceLink);
  const adminLink = str(p.adminLink);
  const firstTimeNote = str(p.firstTimeNote ?? "First time this hour.");
  const requestBodyShape = str(p.requestBodyShape);

  const blocks: SlackBlock[] = [
    header(`${emoji} 사용자 오류 — ${surface}`),
    section(
      `Endpoint: \`${endpoint}\`\n` +
        `Step: ${stepLabel}\n` +
        `Status: ${statusLabel}\n` +
        `Error: \`${errorMessage.slice(0, 600)}\``,
    ),
    fieldsBlock([
      kv("사용자", userEmailMasked),
      kv("국가", userCountry),
      kv("User-Agent", userAgentShort),
      kv("요청 필드", requestBodyShape),
    ]),
  ];
  if (stackHead && stackHead !== "—") {
    blocks.push(
      section(`*Stack (head)*\n\`\`\`${stackHead.slice(0, 600)}\`\`\``),
    );
  }
  blocks.push(
    context(
      `${firstTimeNote}` +
        (surfaceLink && surfaceLink !== "—"
          ? ` · <${surfaceLink}|Surface 열기>`
          : "") +
        (adminLink && adminLink !== "—"
          ? ` · <${adminLink}|Admin incidents>`
          : ""),
    ),
  );

  return {
    text: `${emoji} ${surface} — ${errorMessage.slice(0, 120)}`,
    blocks,
  };
}

// ─── Stripe webhook reliability ─────────────────────────────────────────
//
// Fires when an inbound Stripe webhook delivery fails — signature
// mismatch, DB write error, business-logic exception. Critical
// severity (always) because each failure can mean a churned customer
// still being billed or a paying customer locked out of the app. The
// admin link drops the operator straight into /admin/incidents/stripe
// where they can inspect the failing row, and stripeLink opens the
// event in the Stripe dashboard for full payload inspection.

function formatStripeWebhookFailed(p: Record<string, unknown>): SlackPayload {
  const eventId = str(p.eventId);
  const eventType = str(p.eventType);
  const livemode = p.livemode === true;
  const errorStep = str(p.errorStep);
  const errorMessage = str(p.errorMessage);
  const adminLink = str(p.adminLink);
  const stripeLink = str(p.stripeLink);
  const modeBadge = livemode ? "LIVE" : "TEST";

  return {
    text: `🚨 Stripe webhook 실패 (${modeBadge}) — ${eventType} · ${errorStep}`,
    blocks: [
      header(`🚨 Stripe webhook 실패 — ${modeBadge}`),
      section(
        `Event: \`${eventType}\`\n` +
          `Step: ${errorStep}\n` +
          `Event ID: \`${eventId}\`\n` +
          `Error: \`${errorMessage.slice(0, 600)}\``,
      ),
      fieldsBlock([
        kv("Event type", eventType),
        kv("Mode", modeBadge),
        kv("Step", errorStep),
        kv("Event ID", eventId),
      ]),
      context(
        (adminLink && adminLink !== "—"
          ? `<${adminLink}|Admin · Stripe incidents>`
          : "") +
          (stripeLink && stripeLink !== "—"
            ? ` · <${stripeLink}|Stripe dashboard event>`
            : "") +
          " · Stripe 는 자동 재시도하므로 처리 로직만 고치면 다음 delivery 에 복구됨.",
      ),
    ],
  };
}

// ─── System health failure (cron-detected dependency outage) ──────────
//
// Fires once per ok → down transition for each of the 5 dependencies
// (db / resend / openrouter / storage / stripe). The cron handler
// dedupes by comparing the new probe result to the prior row's
// checks_json — when status[checkName] flips from "ok" to "down" we
// fire; when it stays "down" tick after tick we do NOT re-fire. This
// keeps the channel quiet during a multi-hour outage while still
// surfacing the start of the incident immediately.

function formatSystemHealthFailure(p: Record<string, unknown>): SlackPayload {
  const checkName = str(p.checkName ?? p.check_name);
  const durationMs = str(p.durationMs ?? p.duration_ms);
  const errorDetail = str(p.errorDetail ?? p.error_detail);
  const overallStatus = str(p.overallStatus ?? p.overall_status);
  const env = str(p.env);
  const adminLink = str(p.adminLink);
  const commit = str(p.commit);

  return {
    text: `🚨 Practiq health check failed — ${checkName} (${env})`,
    blocks: [
      header("🚨 Practiq health check failed"),
      section(
        `*Check:* \`${checkName}\` flipped *ok → down*\n` +
          `*Overall status:* \`${overallStatus}\`\n` +
          `*Environment:* ${env}\n` +
          `*Duration:* ${durationMs}ms\n` +
          `*Error:* \`${errorDetail.slice(0, 600)}\``,
      ),
      fieldsBlock([
        kv("Check", checkName),
        kv("Overall", overallStatus),
        kv("Environment", env),
        kv("Duration (ms)", durationMs),
        kv("Commit", commit),
      ]),
      context(
        (adminLink && adminLink !== "—"
          ? `<${adminLink}|Admin · health dashboard>`
          : "") +
          " · 5분 단위 cron 이 prior row 와 비교해 이 알림을 발사. " +
          "복구되면 자동으로 ok 상태가 다시 기록되며 별도 알림은 없음.",
      ),
    ],
  };
}

// ─── Per-firm LLM spend ceiling (Wave-4 P0-02) ──────────────────────────
//
// Fires when a firm exhausts its 30d $-budget on the public LLM hot
// paths (workflow-audit, ai-policy-generator). Distinct from
// user_error_critical so the operator can scan abuse patterns at a
// glance — each row is "this firm_identity ran out of budget", and a
// cluster of these from new emails inside the same hour is the
// signature of a scripted abuse run.

function formatSystemSpendCeilingHit(
  p: Record<string, unknown>,
): SlackPayload {
  const firmIdentity = str(p.firm_identity ?? p.firmIdentity);
  const endpoint = str(p.endpoint);
  const kind = str(p.kind);
  const spentUsd = Number(p.spent_usd ?? p.spentUsd ?? 0);
  const ceilingUsd = Number(p.ceiling_usd ?? p.ceilingUsd ?? 0);
  const windowDays = str(p.window_days ?? p.windowDays);
  const pct =
    ceilingUsd > 0 ? Math.round((spentUsd / ceilingUsd) * 1000) / 10 : 0;

  return {
    text: `🛑 Spend ceiling 도달 — ${firmIdentity} ($${spentUsd.toFixed(2)} / $${ceilingUsd.toFixed(2)})`,
    blocks: [
      header("🛑 LLM Spend ceiling 도달"),
      section(
        `한 firm 이 30일 $-budget 을 모두 사용했습니다. 사용자는 429 + fair-use 안내를 받았습니다.\n` +
          `정상 사용자라면 hello@practiq.dev 으로 회신 → ceiling 상향. 이상한 패턴이면 abuse 가능성.`,
      ),
      fieldsBlock([
        kv("Firm identity", firmIdentity),
        kv("Endpoint", endpoint),
        kv("Identity kind", kind),
        kv("사용 USD", `$${spentUsd.toFixed(4)}`),
        kv("Ceiling USD", `$${ceilingUsd.toFixed(2)}`),
        kv("사용률", `${pct}%`),
        kv("Window (days)", windowDays),
      ]),
      context(
        `<https://admin.grindworks.ai/admin/analytics|/admin/analytics 에서 30d Top 스펜더 확인>`,
      ),
    ],
  };
}

// ─── Billing lifecycle (Tier 3) ─────────────────────────────────────────
//
// Triggered from the Stripe webhook handler's new event arms
// (invoice.payment_failed, customer.subscription.deleted,
// charge.dispute.created). Each formatter masks the customer email so
// it doesn't sit in plaintext in #ops, and includes the matching
// admin link (/admin/incidents/billing) + Stripe dashboard link for
// one-click triage.

function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "—";
  const at = email.indexOf("@");
  if (at < 2) return "***" + email.slice(at);
  return email.slice(0, 2) + "***" + email.slice(at);
}

function formatBillingPaymentFailed(
  p: Record<string, unknown>,
): SlackPayload {
  const email = maskEmail(p.email as string | null | undefined);
  const invoiceId = str(p.invoiceId ?? p.invoice_id);
  const stripeSubId = str(p.stripeSubscriptionId ?? p.stripe_subscription_id);
  const attemptCount = Number(p.attemptCount ?? p.attempt_count ?? 0);
  const amountUsd = str(p.amountUsd ?? p.amount_usd);
  const reason = str(p.reason);
  const nextRetry = str(p.nextRetry ?? p.next_retry);
  const livemode = p.livemode === true;
  const adminLink = str(p.adminLink);
  const stripeLink = str(p.stripeLink);
  const modeBadge = livemode ? "LIVE" : "TEST";
  const urgent = attemptCount >= 2;
  const headerEmoji = urgent ? "🚨" : "⚠️";

  return {
    text: `${headerEmoji} 결제 실패 (${modeBadge}) — ${email} · 시도 ${attemptCount} · $${amountUsd}`,
    blocks: [
      header(`${headerEmoji} 결제 실패 — ${modeBadge}`),
      section(
        urgent
          ? "Stripe smart-retry가 진행 중이며 곧 포기될 수 있습니다 (보통 4회 시도 후). 즉시 고객에게 카드 업데이트 안내가 필요."
          : "첫 결제 시도 실패. Stripe가 자동으로 재시도하지만, 카드 만료/한도 등 명확한 사유면 고객에게 알림 권장.",
      ),
      fieldsBlock([
        kv("Customer (masked)", email),
        kv("Invoice", invoiceId),
        kv("Subscription", stripeSubId),
        kv("Attempt #", attemptCount),
        kv("Amount USD", `$${amountUsd}`),
        kv("Mode", modeBadge),
        kv("Failure reason", reason),
        kv("Next retry", nextRetry),
      ]),
      context(
        (adminLink && adminLink !== "—"
          ? `<${adminLink}|Admin · billing incidents>`
          : "") +
          (stripeLink && stripeLink !== "—"
            ? ` · <${stripeLink}|Stripe invoice>`
            : "") +
          " · billing_incidents 테이블에 row가 기록됨.",
      ),
    ],
  };
}

function formatBillingSubscriptionCanceled(
  p: Record<string, unknown>,
): SlackPayload {
  const email = maskEmail(p.email as string | null | undefined);
  const stripeSubId = str(p.stripeSubscriptionId ?? p.stripe_subscription_id);
  const plan = str(p.plan);
  const mrrLost = str(p.mrrLost ?? p.mrr_lost);
  const reason = str(p.cancelReason ?? p.cancel_reason);
  const cancelType = str(p.cancelType ?? p.cancel_type); // 'self_canceled' | 'payment_failure_cascade' | 'unknown'
  const livemode = p.livemode === true;
  const adminLink = str(p.adminLink);
  const stripeLink = str(p.stripeLink);
  const modeBadge = livemode ? "LIVE" : "TEST";

  const cascadeNote =
    cancelType === "payment_failure_cascade"
      ? "⚠️ 결제 실패 후 자동 해지로 추정됨 (이전 invoice.payment_failed → 재시도 한도 도달). 카드 업데이트 권유 가능."
      : cancelType === "self_canceled"
        ? "고객이 직접 해지함 (Stripe Customer Portal 또는 지원 채널). 이탈 인터뷰 검토 권장."
        : "해지 유형 미상.";

  return {
    text: `👋 구독 해지 (${modeBadge}) — ${email} · ${plan} · MRR 손실 $${mrrLost}`,
    blocks: [
      header(`👋 구독 해지 — ${modeBadge}`),
      section(cascadeNote),
      fieldsBlock([
        kv("Customer (masked)", email),
        kv("Plan", plan),
        kv("MRR lost (USD)", `$${mrrLost}`),
        kv("Cancel type", cancelType),
        kv("Reason", reason),
        kv("Subscription", stripeSubId),
        kv("Mode", modeBadge),
      ]),
      context(
        (adminLink && adminLink !== "—"
          ? `<${adminLink}|Admin · billing incidents>`
          : "") +
          (stripeLink && stripeLink !== "—"
            ? ` · <${stripeLink}|Stripe subscription>`
            : "") +
          " · billing_incidents 테이블에 row가 기록됨.",
      ),
    ],
  };
}

function formatBillingChargebackFiled(
  p: Record<string, unknown>,
): SlackPayload {
  const email = maskEmail(p.email as string | null | undefined);
  const disputeId = str(p.disputeId ?? p.dispute_id);
  const chargeId = str(p.chargeId ?? p.charge_id);
  const amountUsd = str(p.amountUsd ?? p.amount_usd);
  const reason = str(p.reason);
  const dueBy = str(p.dueBy ?? p.due_by);
  const livemode = p.livemode === true;
  const adminLink = str(p.adminLink);
  const stripeLink = str(p.stripeLink);
  const modeBadge = livemode ? "LIVE" : "TEST";

  return {
    text: `🚨 분쟁(chargeback) 발생 (${modeBadge}) — ${email} · $${amountUsd} · due ${dueBy}`,
    blocks: [
      header(`🚨 Chargeback 발생 — ${modeBadge}`),
      section(
        "고객이 카드사를 통해 결제를 분쟁(dispute)했습니다. 즉시 대응 필요 — Stripe due_by 까지 증거(invoice, 사용 로그, 약관 동의 기록)를 제출하지 않으면 자동 패배 + 금액 + 분쟁 수수료(보통 $15). 매우 드물지만 매우 비쌈.",
      ),
      fieldsBlock([
        kv("Customer (masked)", email),
        kv("Dispute reason", reason),
        kv("Amount USD", `$${amountUsd}`),
        kv("Due by", dueBy),
        kv("Dispute ID", disputeId),
        kv("Charge ID", chargeId),
        kv("Mode", modeBadge),
      ]),
      context(
        (adminLink && adminLink !== "—"
          ? `<${adminLink}|Admin · billing incidents>`
          : "") +
          (stripeLink && stripeLink !== "—"
            ? ` · <${stripeLink}|Stripe dispute>`
            : "") +
          " · billing_incidents에 status='open'으로 기록됨. 처리 완료 시 admin UI 에서 resolved로 마킹.",
      ),
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
    case "practiq_signup":
      return formatPractiqSignup(payload);
    case "practiq_payment_success":
      return formatPractiqPaymentSuccess(payload);
    case "practiq_payment_failed":
      return formatPractiqPaymentFailed(payload);
    case "practiq_subscription_canceled":
      return formatPractiqSubscriptionCanceled(payload);
    case "practiq_chat_quota_exceeded":
      return formatPractiqChatQuotaExceeded(payload);
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
    case "transactional_email_bounced":
      return formatTransactionalEmailBounced(payload);
    case "transactional_email_complained":
      return formatTransactionalEmailComplained(payload);
    case "transactional_email_delivery_delayed":
      return formatTransactionalEmailDelayed(payload);
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
    case "agent_cron_summary":
      return formatAgentCronSummary(payload, false);
    case "agent_cron_warning":
      return formatAgentCronSummary(payload, true);
    case "csp_violation":
      // CSP violations route through formatError with a stable prefix
      // so the existing Slack threading still works. Payload includes
      // directive / blockedUri / documentPath / sourceFile / lineNumber.
      return formatError({ where: "csp_violation", ...payload });
    case "workflow_audit_completed":
      return formatWorkflowAuditCompleted(payload);
    case "workflow_audit_followup_sent":
      return formatWorkflowAuditFollowupSent(payload);
    case "policy_generated":
      return formatPolicyGenerated(payload);
    case "user_error_critical":
      return formatUserErrorCritical(payload);
    case "stripe_webhook_failed":
      return formatStripeWebhookFailed(payload);
    case "system_health_failure":
      return formatSystemHealthFailure(payload);
    case "system_spend_ceiling_hit":
      return formatSystemSpendCeilingHit(payload);
    case "billing_payment_failed":
      return formatBillingPaymentFailed(payload);
    case "billing_subscription_canceled":
      return formatBillingSubscriptionCanceled(payload);
    case "billing_chargeback_filed":
      return formatBillingChargebackFiled(payload);
    case "email_bounce":
      return formatEmailBounce(payload);
    case "email_complaint":
      return formatEmailComplaint(payload);
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

// ─── Severity tiers + noise gates (Round 12 — launch hygiene) ──────────
//
// Background: 2026-04-29 channel audit found three noise patterns that
// drowned out real alerts:
//   1. csp_violation flood (~150 messages in 30s when a single page
//      tripped multiple directives — the source endpoint is now
//      log-only, but the type-key is preserved as a defense in depth)
//   2. transactional_email_* bounces firing for E2E test addresses
//      that we know aren't real recipients (practiq-test.cliwant.com)
//   3. agent_cron_summary firing repeatedly with "all-skipped due to
//      dedupe" which is technically OK but visually noisy
//
// Two layered defenses:
//   - Severity tier (critical/warning/info). Each NotificationType has
//     a default severity. Callers may override per-call. The webhook is
//     skipped when severity < SLACK_MIN_SEVERITY (default: warning).
//   - Test-recipient suppression: when payload.to looks like an E2E
//     test address, skip the webhook entirely. The AnalyticsEvent row
//     is still written upstream — only the Slack ping is dropped.

export type Severity = "critical" | "warning" | "info";

const DEFAULT_SEVERITY: Record<NotificationType, Severity> = {
  // Critical — operator must look NOW.
  practiq_payment_failed: "critical",
  practiq_subscription_canceled: "critical",
  transactional_email_bounced: "warning", // bounces per address are warning, not critical
  transactional_email_complained: "critical", // complaint = sender reputation risk
  agent_cron_warning: "critical",
  admin_login_fail: "critical",
  bot_first_hit: "critical",
  practiq_chat_quota_exceeded: "warning",

  // Warning — review within 24h.
  early_access: "warning",
  workflow_audit_completed: "warning",
  workflow_audit_followup_sent: "warning",
  policy_generated: "warning",
  newsletter: "warning",
  practiq_signup: "warning",
  practiq_payment_success: "warning",
  transactional_email_delivery_delayed: "warning",
  instantly_email_bounced: "warning",
  instantly_unsubscribed: "warning",
  seo_submit_fail: "warning",
  seo_fetch_fail: "warning",
  csp_violation: "warning",
  // user_error_critical default is `warning`; callers escalate to
  // `critical` for 5xx via the options.severity override.
  user_error_critical: "warning",
  // Stripe webhook failures are always critical — each one can mean
  // billing or subscription state diverges from Stripe's source of
  // truth. Callers do not need to override.
  stripe_webhook_failed: "critical",
  // Health check transitions are always critical — operator must know
  // about a dependency outage immediately. Cron dedupe ensures we
  // don't re-fire on persistent down state.
  system_health_failure: "critical",
  // Spend ceiling = abuse pattern OR legitimate heavy user — operator
  // looks within minutes to decide. Critical because the alternative
  // (warning) buries it under workflow_audit_completed signups.
  system_spend_ceiling_hit: "critical",
  // Billing lifecycle defaults (Tier 3). billing_payment_failed
  // defaults to warning — first attempt is recoverable. Callers
  // (the Stripe webhook handler) escalate to critical when
  // attempt_count >= 2 because Stripe smart-retry gives up after
  // ~4 attempts. billing_subscription_canceled = warning (churn is
  // important but rarely urgent within the same hour).
  // billing_chargeback_filed = critical always — Stripe due_by is
  // typically <14d and unanswered disputes auto-lose.
  billing_payment_failed: "warning",
  billing_subscription_canceled: "warning",
  billing_chargeback_filed: "critical",
  // Wave 16 deliverability alerts. email_bounce defaults to warning;
  // the caller in src/lib/email/tracking.ts escalates to critical when
  // the recipient is a paying customer. email_complaint is always
  // critical — a Mark-as-Spam click damages sender reputation
  // regardless of who clicked it.
  email_bounce: "warning",
  email_complaint: "critical",
  error: "warning",

  // Info — silent under default config; visible only when
  // SLACK_MIN_SEVERITY=info (e.g. for daily debugging).
  admin_login_ok: "info",
  instantly_email_sent: "info",
  instantly_email_opened: "info",
  instantly_email_clicked: "info",
  instantly_reply: "info",
  instantly_campaign_completed: "info",
  instantly_daily_summary: "info",
  practiq_hourly_heartbeat: "info",
  seo_submit_ok: "info",
  seo_weekly_summary: "info",
  agent_cron_summary: "info",
};

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

function resolveMinSeverity(): Severity {
  const raw = (process.env.SLACK_MIN_SEVERITY ?? "warning").toLowerCase();
  if (raw === "critical" || raw === "warning" || raw === "info") return raw;
  return "warning";
}

/**
 * Returns true when the recipient / actor looks like an E2E test
 * address — we generate `e2e-persona-<ts>@practiq-test.cliwant.com`
 * style addresses during Playwright runs and `eval-ai-quality-<ts>@`
 * style addresses during AI quality eval runs.
 *
 * 2026-04-29: extended to check `email` and `userEmail` fields too,
 * not just `to`. The original implementation only caught
 * `transactional_email_*` payloads (which use `to`); chat-quota,
 * rate-limit, and admin-event payloads use `email` / `userEmail`
 * and were leaking through. Surfaced when the AI quality eval
 * sub-agent flooded #us-market-validation with 50 quota-exceeded
 * pings under `eval-ai-quality-...@practiq-test.cliwant.com`.
 */
function isTestRecipient(payload: Record<string, unknown>): boolean {
  const candidates = [
    payload.to,
    payload.email,
    payload.userEmail,
    payload.recipient,
  ];
  for (const c of candidates) {
    if (typeof c !== "string" || c.length === 0) continue;
    const lower = c.toLowerCase();
    if (
      lower.includes("@practiq-test.") ||
      lower.includes("@e2e-test.") ||
      lower.endsWith(".test")
    ) {
      return true;
    }
  }
  return false;
}

// Per-type rolling dedupe — drop bursts of the same type within a short
// window. Keyed by type + a stable signature derived from payload. This
// is per-Vercel-instance (cold start resets) which is OK for "stop a
// stampede" but not for "alert exactly once across the fleet."
const NOISE_WINDOW_MS = 60_000;
const NOISE_WINDOW_MAX_PER_TYPE = 5;
const noiseWindow = new Map<string, number[]>();

function noiseGate(type: NotificationType, payload: Record<string, unknown>): boolean {
  // Only gate types known to be high-volume. Others pass through.
  //
  // Wave 16: email_bounce / email_complaint deliberately NOT in this
  // set — they dedupe on the practiq.email_suppressions row's
  // last_slack_at, which survives cold starts (unlike this in-memory
  // noiseWindow). Adding them here would double-suppress and could
  // drop legitimate first-bounce alerts during burst traffic.
  const gated = new Set<NotificationType>([
    "csp_violation",
    "transactional_email_bounced",
    "transactional_email_delivery_delayed",
    "error",
  ]);
  if (!gated.has(type)) return false;

  const sig = `${type}:${str(payload.where ?? payload.directive ?? payload.bounceType ?? "*")}`;
  const now = Date.now();
  const stamps = (noiseWindow.get(sig) ?? []).filter(
    (t) => now - t < NOISE_WINDOW_MS,
  );
  stamps.push(now);
  noiseWindow.set(sig, stamps);
  // suppress when we've already sent NOISE_WINDOW_MAX_PER_TYPE in window
  return stamps.length > NOISE_WINDOW_MAX_PER_TYPE;
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
  options?: { severity?: Severity },
): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook) {
    console.warn(
      `[slack] SLACK_WEBHOOK_URL not set — skipping notification (${type})`,
    );
    return;
  }

  // 1. Severity gate — skip below threshold.
  const severity = options?.severity ?? DEFAULT_SEVERITY[type] ?? "warning";
  const minSeverity = resolveMinSeverity();
  if (SEVERITY_RANK[severity] < SEVERITY_RANK[minSeverity]) {
    return;
  }

  // 2. Test-recipient gate — drop E2E test traffic.
  if (isTestRecipient(payload)) {
    return;
  }

  // 3. Noise window — drop stampedes.
  if (noiseGate(type, payload)) {
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
 *
 * The optional `severity` argument overrides the default tier baked into
 * `DEFAULT_SEVERITY`. Use it when a single call site needs to escalate
 * (e.g. a known-sensitive endpoint wants its `error` to fire as critical)
 * or to demote (e.g. an experimental feature's noise → info).
 */
export function safeNotify(
  type: NotificationType,
  payload: Record<string, unknown>,
  options?: { severity?: Severity },
): void {
  void notifySlack(type, payload, options).catch(() => {
    // notifySlack already swallows errors internally, but belt-and-braces:
    // never let a rejected promise escape.
  });
}
