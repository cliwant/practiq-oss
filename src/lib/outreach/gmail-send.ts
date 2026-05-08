/**
 * gmail-send.ts — shared helpers for the cold-send + trade-press-send cron
 * routes. Keep the two route handlers thin: they map "today" to a label,
 * call findDraftsByLabel + sendOrSkipDraft, return a JSON summary, and
 * (optionally) post a Slack notification.
 *
 * OAuth: uses GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET from the studio
 * .env.local (already set in Vercel) plus GMAIL_REFRESH_TOKEN (uploaded
 * 2026-05-08 from ~/.cred/practiq-gmail-token.json after the operator
 * authorized the gmail.modify scope on the existing NextAuth OAuth client).
 *
 * Safety: every draft is body-checked for placeholder strings before send.
 * If `[ADD ONE SPECIFIC DETAIL HERE` or `[VERIFY EDITOR EMAIL VIA HUNTER.IO]`
 * is still present, the draft is skipped and reported in the summary.
 *
 * Dry run: when CRON_DRY_RUN=true, the handler discovers + body-checks
 * drafts but does NOT call drafts.send. Useful for the first cron tick
 * to confirm the scheduler is wired up correctly.
 */

import { google, type gmail_v1 } from 'googleapis';

const PLACEHOLDERS = [
  '[ADD ONE SPECIFIC DETAIL HERE',
  '[VERIFY EDITOR EMAIL VIA HUNTER.IO]',
  '[ADD PRIOR FIRM HERE',
  '[ADD QUOTE]',
  '>>> TO: [',
];

export type SendResult = {
  status: 'ok' | 'noop' | 'error';
  reason?: string;
  dryRun: boolean;
  label: string | null;
  attempted: number;
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{
    draftId: string;
    to: string;
    subject: string;
    outcome: 'sent' | 'dry-run' | 'skipped' | 'error';
    note?: string;
  }>;
};

export function todayInTz(now: Date, tz: string): string {
  // Returns YYYY-MM-DD in the given IANA tz, using Intl formatter.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now); // en-CA gives YYYY-MM-DD
}

export function isWeekdayInTz(now: Date, tz: string): boolean {
  // 1=Mon ... 7=Sun in 'iso' (Intl). Easier: derive day-of-week via formatter.
  const dow = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dow);
}

export function makeAuthorizedGmail(): gmail_v1.Gmail {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GMAIL_REFRESH_TOKEN');
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth2 });
}

async function getLabelIdByName(
  gmail: gmail_v1.Gmail,
  name: string
): Promise<string | null> {
  const list = await gmail.users.labels.list({ userId: 'me' });
  for (const l of list.data.labels || []) {
    if (l.name === name) return l.id || null;
  }
  return null;
}

async function listDraftsWithLabel(
  gmail: gmail_v1.Gmail,
  labelId: string
): Promise<Array<{ id: string; messageId: string }>> {
  // We need draft IDs (for drafts.send) AND each draft's label set.
  // Approach: list all drafts then filter by labelIds. Mailbox is small (~57).
  const out: Array<{ id: string; messageId: string }> = [];
  let pageToken: string | undefined;
  do {
    const r = await gmail.users.drafts.list({
      userId: 'me',
      maxResults: 200,
      pageToken,
    });
    for (const d of r.data.drafts || []) {
      const det = await gmail.users.drafts.get({
        userId: 'me',
        id: d.id || '',
        format: 'metadata',
      });
      const ids = det.data.message?.labelIds || [];
      if (ids.includes(labelId) && d.id && det.data.message?.id) {
        out.push({ id: d.id, messageId: det.data.message.id });
      }
    }
    pageToken = r.data.nextPageToken || undefined;
  } while (pageToken);
  return out;
}

function decodeBase64Url(data: string): string {
  const s = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

function extractTextBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  for (const p of payload.parts || []) {
    const inner = extractTextBody(p);
    if (inner) return inner;
  }
  return '';
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  if (!headers) return '';
  const h = headers.find((x) => (x.name || '').toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

export async function sendOrSkipDraftsForLabel({
  labelName,
  dryRun,
}: {
  labelName: string;
  dryRun: boolean;
}): Promise<SendResult> {
  const gmail = makeAuthorizedGmail();

  const labelId = await getLabelIdByName(gmail, labelName);
  if (!labelId) {
    return {
      status: 'noop',
      reason: `label not found: ${labelName}`,
      dryRun,
      label: labelName,
      attempted: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };
  }

  const drafts = await listDraftsWithLabel(gmail, labelId);
  if (drafts.length === 0) {
    return {
      status: 'noop',
      reason: `no drafts under label ${labelName}`,
      dryRun,
      label: labelName,
      attempted: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };
  }

  const details: SendResult['details'] = [];
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const d of drafts) {
    try {
      const full = await gmail.users.drafts.get({
        userId: 'me',
        id: d.id,
        format: 'full',
      });
      const headers = full.data.message?.payload?.headers;
      const to = getHeader(headers, 'To');
      const subject = getHeader(headers, 'Subject');
      const body = extractTextBody(full.data.message?.payload);

      const placeholderHit = PLACEHOLDERS.find((p) => body.includes(p));
      if (placeholderHit || !to) {
        skipped += 1;
        details.push({
          draftId: d.id,
          to: to || '(empty)',
          subject,
          outcome: 'skipped',
          note: placeholderHit
            ? `body still contains placeholder: ${placeholderHit}`
            : 'no To header (unverified recipient)',
        });
        continue;
      }

      if (dryRun) {
        details.push({
          draftId: d.id,
          to,
          subject,
          outcome: 'dry-run',
          note: 'CRON_DRY_RUN=true — would have sent',
        });
        continue;
      }

      await gmail.users.drafts.send({
        userId: 'me',
        requestBody: { id: d.id },
      });
      sent += 1;
      details.push({ draftId: d.id, to, subject, outcome: 'sent' });
    } catch (e) {
      errors += 1;
      const msg = e instanceof Error ? e.message : String(e);
      details.push({
        draftId: d.id,
        to: '(error)',
        subject: '(error)',
        outcome: 'error',
        note: msg.slice(0, 200),
      });
    }
  }

  return {
    status: errors > 0 ? 'error' : 'ok',
    dryRun,
    label: labelName,
    attempted: drafts.length,
    sent,
    skipped,
    errors,
    details,
  };
}

export function checkCronAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get('authorization') || '';
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>`.
  return auth === `Bearer ${expected}`;
}
