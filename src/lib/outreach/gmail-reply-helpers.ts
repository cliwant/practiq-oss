/**
 * gmail-reply-helpers.ts — additional Gmail helpers for the
 * /api/cron/reply-monitor and /api/cron/follow-up-send routes.
 *
 * Kept separate from `gmail-send.ts` so that the proven cold-send +
 * trade-press-send paths are not perturbed.
 */
import { type gmail_v1 } from "googleapis";

export const PROCESSED_LABEL = "Practiq/Reply/Processed";
export const TOUCH2_LABEL = "Practiq/Followup/Touch2Sent";
export const TOUCH3_LABEL = "Practiq/Followup/Touch3Sent";
export const COLD_PARENT_PREFIX = "Practiq/Cold/";
export const TRADE_PRESS_PREFIX = "Practiq/Trade-Press/";

export type LabelMap = Map<string, string>; // name -> id

/** Return a name->id Map for every label in the mailbox. Cached per call. */
export async function loadLabels(gmail: gmail_v1.Gmail): Promise<LabelMap> {
  const r = await gmail.users.labels.list({ userId: "me" });
  const map: LabelMap = new Map();
  for (const l of r.data.labels || []) {
    if (l.name && l.id) map.set(l.name, l.id);
  }
  return map;
}

/** Idempotently create the named label if it doesn't exist. Returns its id. */
export async function ensureLabel(
  gmail: gmail_v1.Gmail,
  name: string,
  cache?: LabelMap
): Promise<string> {
  if (cache && cache.has(name)) return cache.get(name)!;
  const list = await gmail.users.labels.list({ userId: "me" });
  for (const l of list.data.labels || []) {
    if (l.name === name && l.id) {
      if (cache) cache.set(name, l.id);
      return l.id;
    }
  }
  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });
  const id = created.data.id || "";
  if (cache && id) cache.set(name, id);
  return id;
}

export function decodeBase64Url(data: string): string {
  const s = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, "base64").toString("utf8");
}

export function encodeBase64Url(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function extractTextBody(
  payload: gmail_v1.Schema$MessagePart | undefined
): string {
  if (!payload) return "";
  // Prefer text/plain over text/html when both are present.
  const plain = findPart(payload, "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  const html = findPart(payload, "text/html");
  if (html?.body?.data) {
    const raw = decodeBase64Url(html.body.data);
    // Strip tags + collapse whitespace for the LLM. Crude but adequate.
    return raw
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}

function findPart(
  payload: gmail_v1.Schema$MessagePart,
  mime: string
): gmail_v1.Schema$MessagePart | null {
  if (payload.mimeType === mime) return payload;
  for (const p of payload.parts || []) {
    const found = findPart(p, mime);
    if (found) return found;
  }
  return null;
}

export function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  if (!headers) return "";
  const h = headers.find((x) => (x.name || "").toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

export function parseEmailAddress(raw: string): string {
  // "Name <email@host.com>" → "email@host.com"; bare → unchanged.
  const m = raw.match(/<([^>]+)>/);
  if (m) return m[1].trim().toLowerCase();
  return raw.trim().toLowerCase();
}

/**
 * Build an RFC 5322 message that replies in-thread. Preserves
 * In-Reply-To + References headers from the parent message so Gmail
 * threads the reply correctly.
 */
export function buildInThreadRawReply({
  to,
  fromAlias,
  subject,
  bodyText,
  inReplyToMessageIdHeader,
  referencesHeader,
}: {
  to: string;
  fromAlias: string; // "Seungdo Keum <seungdo.keum@practiq.dev>"
  subject: string;
  bodyText: string;
  inReplyToMessageIdHeader: string; // value of the parent's RFC822 Message-ID header
  referencesHeader: string; // existing References header (may be empty)
}): string {
  const replySubject = subject.toLowerCase().startsWith("re:")
    ? subject
    : `Re: ${subject}`;
  const newReferences = [referencesHeader, inReplyToMessageIdHeader]
    .filter((s) => s && s.trim().length > 0)
    .join(" ")
    .trim();
  const headerLines = [
    `To: ${to}`,
    `From: ${fromAlias}`,
    `Subject: ${replySubject}`,
    `In-Reply-To: ${inReplyToMessageIdHeader}`,
    `References: ${newReferences}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 7bit",
  ];
  const raw = headerLines.join("\r\n") + "\r\n\r\n" + bodyText;
  return encodeBase64Url(raw);
}

/**
 * Find the most recent message in the thread that was sent BY us with
 * the campaign label slug (cold or trade-press). Returns its full
 * message metadata so the reply can preserve threading.
 */
export type CampaignSendInfo = {
  threadId: string;
  messageId: string;
  rfc822MessageIdHeader: string; // "<...@mail.gmail.com>"
  referencesHeader: string;
  toEmail: string;
  subject: string;
  campaignLabelName: string; // "Practiq/Cold/Day3" or "Practiq/Trade-Press/AccountingToday"
};

export async function findCampaignSendInThread(
  gmail: gmail_v1.Gmail,
  threadId: string,
  labels: LabelMap
): Promise<CampaignSendInfo | null> {
  const t = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
  // Scan the messages oldest -> newest. The first SENT message that has
  // a Cold/Day* or Trade-Press/* label is what we want to reply to.
  const idToName = new Map<string, string>();
  for (const [name, id] of labels.entries()) idToName.set(id, name);

  const messages = (t.data.messages || []).slice();
  for (const m of messages) {
    const labelIds = m.labelIds || [];
    if (!labelIds.includes("SENT")) continue;
    const campaignLabelId = labelIds.find((id) => {
      const name = idToName.get(id);
      return (
        !!name &&
        (name.startsWith(COLD_PARENT_PREFIX) ||
          name.startsWith(TRADE_PRESS_PREFIX))
      );
    });
    if (!campaignLabelId) continue;
    const campaignLabelName = idToName.get(campaignLabelId)!;
    const headers = m.payload?.headers;
    const messageIdHeader = getHeader(headers, "Message-ID") || getHeader(headers, "Message-Id");
    const referencesHeader = getHeader(headers, "References");
    const toRaw = getHeader(headers, "To");
    const subject = getHeader(headers, "Subject");
    return {
      threadId,
      messageId: m.id || "",
      rfc822MessageIdHeader: messageIdHeader,
      referencesHeader,
      toEmail: parseEmailAddress(toRaw),
      subject,
      campaignLabelName,
    };
  }
  return null;
}

export type LatestReplyInfo = {
  messageId: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  internalDate: string; // unix ms as string
};

/**
 * Walk a thread and return the latest message NOT sent by us. Returns
 * null if there is no inbound reply yet.
 */
export async function findLatestInboundReply(
  gmail: gmail_v1.Gmail,
  threadId: string
): Promise<LatestReplyInfo | null> {
  const t = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
  const messages = (t.data.messages || []).slice().reverse();
  for (const m of messages) {
    const labelIds = m.labelIds || [];
    if (labelIds.includes("SENT")) continue;
    const headers = m.payload?.headers;
    const fromRaw = getHeader(headers, "From");
    const subject = getHeader(headers, "Subject");
    const bodyText = extractTextBody(m.payload);
    return {
      messageId: m.id || "",
      fromEmail: parseEmailAddress(fromRaw),
      subject,
      bodyText,
      internalDate: m.internalDate || String(Date.now()),
    };
  }
  return null;
}

/**
 * Identify whether a thread contains one of OUR campaign sends.
 * Returns the campaign label name (e.g. "Practiq/Cold/Day3") or null.
 */
export async function getThreadCampaignLabel(
  gmail: gmail_v1.Gmail,
  threadId: string,
  labels: LabelMap
): Promise<string | null> {
  const send = await findCampaignSendInThread(gmail, threadId, labels);
  return send?.campaignLabelName ?? null;
}
