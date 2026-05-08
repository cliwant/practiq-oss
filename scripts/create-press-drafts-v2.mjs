#!/usr/bin/env node
// One-shot: create 5 trade press drafts from trade-press-output.jsonl,
// using email_verified field as the actual To: header (no placeholder).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load studio env
function loadEnv() {
  const studioRoot = path.resolve(__dirname, '../../..');
  const envFile = path.join(studioRoot, '.env.local');
  const text = fs.readFileSync(envFile, 'utf8');
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line || /^\s*#/.test(line)) { i++; continue; }
    const eq = line.indexOf('=');
    if (eq === -1) { i++; continue; }
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1);
    const q = val[0];
    if (q === '"' || q === "'") {
      let acc = val.slice(1);
      const ci = acc.indexOf(q);
      if (ci !== -1) { acc = acc.slice(0, ci); i++; }
      else {
        i++;
        while (i < lines.length) {
          const next = lines[i];
          const nci = next.indexOf(q);
          if (nci !== -1) { acc += '\n' + next.slice(0, nci); i++; break; }
          else { acc += '\n' + next; i++; }
        }
      }
      val = acc;
    } else {
      const h = val.indexOf(' #');
      if (h !== -1) val = val.slice(0, h);
      val = val.trim();
      i++;
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

function encodeHeaderIfNeeded(value) {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function buildRfc2822({ to, subject, body }) {
  const isPlaceholder = !to || /^\s*\[/.test(to) || !to.includes('@');
  const finalBody = isPlaceholder
    ? `>>> TO: ${to || '[FILL RECIPIENT]'}\n\n${body}`
    : body;
  const bodyB64 = Buffer.from(finalBody, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
  const lines = [];
  lines.push('From: Seungdo Keum <seungdo.keum@practiq.dev>');
  if (!isPlaceholder) lines.push(`To: ${to}`);
  lines.push(`Subject: ${encodeHeaderIfNeeded(subject)}`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(bodyB64);
  return lines.join('\r\n');
}

function base64UrlEncode(s) {
  return Buffer.from(s, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const VENTURE_ROOT = path.resolve(__dirname, '..');
const JSONL_PATH = path.join(VENTURE_ROOT, '.cycle/marketing/personalization/trade-press-output.jsonl');
const TOKEN_FILE = path.join(os.homedir(), '.cred', 'practiq-gmail-token.json');

async function main() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')));
  const gmail = google.gmail({ version: 'v1', auth });

  const labelCache = new Map();
  for (const l of (await gmail.users.labels.list({ userId: 'me' })).data.labels) {
    labelCache.set(l.name, l.id);
  }
  async function ensureLabel(name) {
    if (labelCache.has(name)) return labelCache.get(name);
    const c = await gmail.users.labels.create({
      userId: 'me',
      requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
    });
    labelCache.set(name, c.data.id);
    return c.data.id;
  }

  const lines = fs.readFileSync(JSONL_PATH, 'utf8').split(/\r?\n/).filter(l => l.trim());
  let created = 0;
  for (const line of lines) {
    const r = JSON.parse(line);
    if (r.skip) continue;
    const to = r.email_verified || null;
    const labelNames = [`Practiq/Trade-Press/${r.label_slug}`, 'Practiq/Trade-Press/All'];
    const labelIds = [];
    for (const n of labelNames) labelIds.push(await ensureLabel(n));
    const raw = base64UrlEncode(buildRfc2822({ to, subject: r.subject, body: r.body }));
    const draft = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } });
    await gmail.users.messages.modify({
      userId: 'me',
      id: draft.data.message.id,
      requestBody: { addLabelIds: labelIds },
    });
    console.log(`  ✓ ${r.publication.padEnd(22)} ${r.editor_name.padEnd(20)} → ${to || '(empty)'} [${r.email_confidence}]`);
    created += 1;
  }
  console.log(`\nTotal: ${created} trade press drafts created.`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
