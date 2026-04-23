import { Resend } from "resend";

/**
 * Shared Resend client + configuration probes. Lazy singleton so we
 * don't construct the client in edge runtimes or pages that never
 * send email. Missing RESEND_API_KEY is non-fatal for the build —
 * sendEmail() falls back to a console log so dev without Resend
 * still works end-to-end (the operator just won't receive mail).
 */
let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key || !key.trim()) return null;
  _resend = new Resend(key.trim());
  return _resend;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim(),
  );
}

/**
 * Canonical "from" address. EMAIL_FROM overrides per-environment; the
 * default is a safe placeholder that Resend will reject if we forgot
 * to set it — better than silently sending from a non-verified domain.
 */
export function getFromAddress(): string {
  const fromName = process.env.EMAIL_FROM_NAME ?? "Practiq";
  const fromAddr = process.env.EMAIL_FROM ?? "hello@practiq.dev";
  return `${fromName} <${fromAddr}>`;
}

/**
 * URL that emails should link back to (for verify/reset/invite links).
 * Prefers NEXT_PUBLIC_SITE_URL, then VERCEL_URL, then localhost.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
