#!/usr/bin/env node
/**
 * relabel-drafts-day1to17.mjs
 *
 * Redistributes the 47 active cold drafts from the original Day1..Day10 +
 * Buffer label scheme (5/day, 10 firing days, Tue/Wed/Thu only) to a new
 * Day1..Day17 scheme that matches the operator's "every weekday no gaps"
 * directive.
 *
 * New distribution (47 total, ramped for warmup):
 *   Day1  (Fri 5/8):   2 contacts (warmup)
 *   Day2  (Mon 5/11):  2 contacts (warmup)
 *   Day3-15 (5/12-5/29 weekdays, ex 5/25 Memorial Day): 3 contacts each (39)
 *   Day16 (Mon 6/1):   2 contacts (wind-down)
 *   Day17 (Tue 6/2):   2 contacts (wind-down)
 *
 * Ordering: HIGH confidence first → MEDIUM → LOW. This puts the strongest
 * verified hooks in the first few sending days so the brand-new domain
 * builds positive engagement signal early (better warmup).
 *
 * For each draft:
 *   1. Look up its current Practiq/Cold/* label IDs.
 *   2. Compute the new target Day label.
 *   3. Call gmail.users.messages.modify to remove the old per-day label
 *      and add the new one. The Practiq/Cold/All label is preserved.
 *
 * Idempotent: re-running with the same input + JSONL produces no change
 * (new label set already applied → Gmail's modify ignores no-op label
 * additions and removes only what was actually there).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VENTURE_ROOT = path.resolve(__dirname, '..');
const STUDIO_ROOT = path.resolve(__dirname, '../../..');
const PERSONALIZATION_DIR = path.join(VENTURE_ROOT, '.cycle/marketing/personalization');
const TOKEN_FILE = path.join(os.homedir(), '.cred', 'practiq-gmail-token.json');

// Load .env.local for OAuth client credentials.
function loadEnv() {
  const envFile = path.join(STUDIO_ROOT, '.env.local');
  const text = fs.readFileSync(envFile, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val[0] === '"' && val.endsWith('"')) || (val[0] === "'" && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');

// Day → number of contacts. Sums to 47.
const DAY_SIZES = [2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2];

function loadAllContacts() {
  const all = [];
  for (let i = 1; i <= 6; i++) {
    const p = path.join(PERSONALIZATION_DIR, `batch-${i}-output.jsonl`);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim());
    for (const l of lines) {
      const r = JSON.parse(l);
      if (r.skip) continue;
      all.push(r);
    }
  }
  return all;
}

// Confidence rank for sort: high < medium < low (ascending = first sent).
const CONF_RANK = { high: 0, medium: 1, low: 2 };

async function main() {
  const contacts = loadAllContacts();
  if (contacts.length !== 47) {
    console.warn(`Expected 47 active contacts, got ${contacts.length}. Continuing.`);
  }

  // Sort: confidence (high first), then alphabetical by firm_name for stability.
  contacts.sort((a, b) => {
    const ar = CONF_RANK[a.confidence] ?? 3;
    const br = CONF_RANK[b.confidence] ?? 3;
    if (ar !== br) return ar - br;
    return (a.firm_name || '').localeCompare(b.firm_name || '');
  });

  // Assign each contact to a day bucket.
  const assignments = []; // [{ contact, dayLabel: "Day1" }, ...]
  let cursor = 0;
  for (let d = 0; d < DAY_SIZES.length; d++) {
    const size = DAY_SIZES[d];
    const dayLabel = `Day${d + 1}`;
    for (let i = 0; i < size && cursor < contacts.length; i++) {
      assignments.push({ contact: contacts[cursor], dayLabel });
      cursor += 1;
    }
  }
  if (cursor !== contacts.length) {
    throw new Error(`Bucket capacity ${cursor} != contact count ${contacts.length}`);
  }

  // Plan summary.
  const planByDay = {};
  for (const a of assignments) {
    if (!planByDay[a.dayLabel]) planByDay[a.dayLabel] = [];
    planByDay[a.dayLabel].push(`${a.contact.firm_name} (${a.contact.confidence})`);
  }

  console.log(`\nPlan: ${contacts.length} contacts → 17 days\n`);
  for (let d = 1; d <= 17; d++) {
    const list = planByDay[`Day${d}`] || [];
    console.log(`  Day${d.toString().padStart(2)} (${list.length}): ${list.join(' | ')}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log('DRY RUN — exiting before any Gmail API call.');
    return;
  }

  // Connect to Gmail.
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')));
  const gmail = google.gmail({ version: 'v1', auth });

  // Build a label name → id cache. Create new Day11..Day17 labels as needed.
  const labelMap = new Map();
  for (const l of (await gmail.users.labels.list({ userId: 'me' })).data.labels || []) {
    labelMap.set(l.name, l.id);
  }
  for (let d = 1; d <= 17; d++) {
    const name = `Practiq/Cold/Day${d}`;
    if (!labelMap.has(name)) {
      const created = await gmail.users.labels.create({
        userId: 'me',
        requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
      });
      labelMap.set(name, created.data.id);
      console.log(`  + created label ${name}`);
    }
  }
  // IDs for old per-day labels (Day1..Day10) and Buffer.
  const OLD_DAY_LABELS = [];
  for (let d = 1; d <= 10; d++) {
    const id = labelMap.get(`Practiq/Cold/Day${d}`);
    if (id) OLD_DAY_LABELS.push({ name: `Practiq/Cold/Day${d}`, id });
  }
  const bufferId = labelMap.get('Practiq/Cold/Buffer');
  if (bufferId) OLD_DAY_LABELS.push({ name: 'Practiq/Cold/Buffer', id: bufferId });

  // For each contact's draft, find it by querying drafts that have the
  // contact's email as recipient. Faster: search with q=`to:{email}`.
  // We'll just iterate all drafts once and build a lookup table.
  const allDrafts = [];
  let pageToken;
  do {
    const r = await gmail.users.drafts.list({ userId: 'me', maxResults: 200, pageToken });
    if (r.data.drafts) allDrafts.push(...r.data.drafts);
    pageToken = r.data.nextPageToken;
  } while (pageToken);

  // Map draft → recipient email.
  const draftByEmail = new Map();
  for (const d of allDrafts) {
    const det = await gmail.users.drafts.get({
      userId: 'me',
      id: d.id,
      format: 'metadata',
      metadataHeaders: ['To'],
    });
    const headers = det.data.message?.payload?.headers || [];
    const toHeader = (headers.find(h => (h.name || '').toLowerCase() === 'to') || {}).value || '';
    if (toHeader) draftByEmail.set(toHeader.trim().toLowerCase(), {
      draftId: d.id,
      messageId: det.data.message?.id,
      labelIds: det.data.message?.labelIds || [],
    });
  }

  // Apply relabeling.
  let modified = 0;
  let alreadyOk = 0;
  let missing = 0;
  for (const a of assignments) {
    const email = a.contact.contact_email.toLowerCase();
    const draft = draftByEmail.get(email);
    if (!draft) {
      console.error(`  ! draft not found for ${email}`);
      missing += 1;
      continue;
    }
    const newDayLabelId = labelMap.get(`Practiq/Cold/${a.dayLabel}`);
    if (!newDayLabelId) {
      throw new Error(`Missing label id for Practiq/Cold/${a.dayLabel}`);
    }

    // Compute label diff.
    const labelIds = new Set(draft.labelIds);
    const oldDayLabelIds = OLD_DAY_LABELS.filter(l => l.id !== newDayLabelId && labelIds.has(l.id));
    const removeLabelIds = oldDayLabelIds.map(l => l.id);
    const addLabelIds = labelIds.has(newDayLabelId) ? [] : [newDayLabelId];

    if (removeLabelIds.length === 0 && addLabelIds.length === 0) {
      alreadyOk += 1;
      continue;
    }
    await gmail.users.messages.modify({
      userId: 'me',
      id: draft.messageId,
      requestBody: { addLabelIds, removeLabelIds },
    });
    modified += 1;
    if (modified % 10 === 0) console.log(`  relabeled ${modified}/${assignments.length}...`);
  }

  console.log(`\nRelabel summary: modified=${modified}, already-correct=${alreadyOk}, missing=${missing}`);
}

main().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); });
