/**
 * Shared HTML email layout helpers.
 *
 * We render emails as plain string templates rather than React Email
 * components — keeps the dep tree minimal and avoids the extra build
 * step. Each template returns { subject, html, text }.
 *
 * The layout matches the Practiq design system in inline-CSS form:
 *   - Plus Jakarta Sans (system-ui fallback for mail clients)
 *   - Dark-on-light palette inverted from the app (emails are still
 *     readable in sender previews and light-mode inboxes)
 *   - Narrow 560px container, generous padding, strong typographic
 *     hierarchy
 */

export interface EmailBodyPart {
  /** Heading + preview (first ~80 chars in inbox). */
  subject: string;
  /** Preheader text (hidden, shown in inbox previews). */
  preheader?: string;
  /** Main visible copy chunks. */
  intro: string;
  /** Optional primary CTA. */
  cta?: { label: string; href: string };
  /** Copy below the CTA. */
  body?: string;
  /** Footer note (small, muted). */
  footer?: string;
  /**
   * Optional operator signature block. Rendered between body and footer
   * as raw HTML — caller is responsible for safety. Pair with
   * `signatureText` so the plain-text body matches.
   */
  signature?: string;
  /** Plain-text version of the signature, appended after `body`. */
  signatureText?: string;
}

const BRAND_MARK_SVG = `
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
  <tr>
    <td style="background:#111827;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
      <span style="font-family:Arial,Helvetica,sans-serif;font-weight:900;color:#ffffff;font-size:18px;line-height:40px;">P</span>
    </td>
    <td style="padding-left:10px;vertical-align:middle;">
      <span style="font-family:Arial,Helvetica,sans-serif;font-weight:700;color:#111827;font-size:16px;letter-spacing:-0.01em;">Practiq</span>
    </td>
  </tr>
</table>
`;

export function renderEmail(body: EmailBodyPart): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    subject,
    preheader,
    intro,
    cta,
    body: mainBody,
    footer,
    signature,
    signatureText,
  } = body;

  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(
        preheader,
      )}</div>`
    : "";

  const ctaBlock = cta
    ? `
<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:#111827;border-radius:10px;">
      <a href="${escapeAttr(cta.href)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        ${escapeHtml(cta.label)}
      </a>
    </td>
  </tr>
</table>
`
    : "";

  const mainBodyBlock = mainBody
    ? `<p style="margin:16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">${linkify(
        mainBody,
      )}</p>`
    : "";

  const footerBlock = footer
    ? `<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">${linkify(
        footer,
      )}</p>`
    : "";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;">
  ${preheaderBlock}
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;">
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              ${BRAND_MARK_SVG}
              <h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#111827;">${escapeHtml(
                subject,
              )}</h1>
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">${linkify(
                intro,
              )}</p>
              ${ctaBlock}
              ${mainBodyBlock}
              ${signature ?? ""}
              ${footerBlock}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;">
          Practiq · AI workspace for boutique professional services firms
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    "",
    intro,
    cta ? `\n${cta.label}:\n${cta.href}\n` : "",
    mainBody ?? "",
    signatureText ? `\n${signatureText}` : "",
    footer ? `\n\n${footer}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/**
 * Auto-link URLs in a copy string. Keeps escape-html safety then
 * promotes bare http(s):// URLs to <a> tags.
 */
function linkify(s: string): string {
  const escaped = escapeHtml(s);
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#2563eb;text-decoration:underline;">$1</a>',
  );
}
