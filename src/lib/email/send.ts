import { getResend, getFromAddress, isEmailConfigured } from "./client";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional tag string for Resend analytics. */
  tag?: string;
  /** Reply-To override — default uses EMAIL_REPLY_TO or the from. */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  /** "resend" | "dev-logged" | "skipped" */
  provider: "resend" | "dev-logged" | "skipped";
  error?: string;
}

/**
 * Unified email send.
 *
 * Production: uses Resend when RESEND_API_KEY is set.
 * Dev / unconfigured: prints the payload to the server console with
 * a clear [email:dev-log] prefix so nothing silently vanishes and
 * developers can copy-paste the link to test without an inbox.
 *
 * Never throws — returns a result object the caller can log. Email
 * delivery failure should never block the underlying auth/billing
 * flow (password reset still succeeds even if the email can't send).
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const { to, subject, html, text, tag, replyTo } = input;

  if (!to || !to.includes("@")) {
    return {
      ok: false,
      provider: "skipped",
      error: "invalid recipient email",
    };
  }

  if (!isEmailConfigured()) {
    // Dev-mode: log the full payload so the operator can inspect
    // what would have been sent. Truncate html for readability.
    console.log(
      "\n" +
        "╭─ [email:dev-log] — RESEND_API_KEY not set, logging only\n" +
        `├─ To:      ${to}\n` +
        `├─ Subject: ${subject}\n` +
        `├─ From:    ${getFromAddress()}\n` +
        (tag ? `├─ Tag:     ${tag}\n` : "") +
        `├─ Text:\n${text
          .split("\n")
          .map((l) => `│  ${l}`)
          .join("\n")}\n` +
        "╰─ (html body omitted)\n",
    );
    return { ok: true, provider: "dev-logged" };
  }

  const resend = getResend();
  if (!resend) {
    return {
      ok: false,
      provider: "skipped",
      error: "Resend client init failed",
    };
  }

  try {
    const res = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject,
      html,
      text,
      replyTo: replyTo ?? process.env.EMAIL_REPLY_TO,
      tags: tag ? [{ name: "category", value: tag }] : undefined,
    });
    if (res.error) {
      console.error(`[email] resend error: ${res.error.message}`);
      return {
        ok: false,
        provider: "resend",
        error: res.error.message,
      };
    }
    // RUN 11 (P0-05): kick off the 60-second polling fallback so we
    // detect bounces / complaints even if the operator hasn't wired
    // the Resend webhook yet. Webhook (when configured) cancels the
    // poll early via the dedup set inside email/tracking.ts. Imported
    // dynamically so unit tests of `sendEmail` don't have to mock the
    // entire tracking module.
    const messageId = res.data?.id;
    if (messageId) {
      void import("./tracking").then(({ startDeliveryPolling }) => {
        startDeliveryPolling({
          messageId,
          to,
          tag,
          subject,
        });
      });
    }
    return { ok: true, provider: "resend", id: messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] send failed: ${msg}`);
    return { ok: false, provider: "resend", error: msg };
  }
}
