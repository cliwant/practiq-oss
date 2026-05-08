#!/usr/bin/env node
/**
 * fix-fabricated-claims.mjs
 *
 * BACKGROUND
 * ----------
 * 117 cold + press drafts were generated with the (false) claim:
 *   "5 boutique firms in pilot, 1 design partner is a 140-client CPA firm"
 * Operator confirmed (2026-05-08) that Practiq is pre-launch with ZERO
 * real customers / pilots / design partners. Those numbers are forward-
 * looking aspirations.
 *
 * Cold-mail cron is currently halted (CRON_DRY_RUN=true). This script
 * (a) LLM-rewrites the body of every JSONL record to replace fabricated
 *     proof claims with honest pre-launch / design-partner-search framing,
 *     (b) pushes the corrected body to the corresponding Gmail draft via
 *     gmail.users.drafts.update — drafts are edited IN PLACE, never
 *     deleted (per operator constraint "한 번 만들어진 컨텐츠는 절대
 *     삭제는 해서는 안 됩니다").
 *
 * Sources of truth: the JSONL files. After this script runs, the JSONL
 * files contain the canonical corrected bodies, and the Gmail drafts
 * mirror them.
 *
 * USAGE
 * -----
 *   node scripts/fix-fabricated-claims.mjs --dry-run   # rewrite JSONL,
 *                                                       no Gmail calls,
 *                                                       prints summary
 *   node scripts/fix-fabricated-claims.mjs             # rewrite JSONL +
 *                                                       update Gmail drafts
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const studioRoot = path.resolve(__dirname, '../../..');
  const envFile = path.join(studioRoot, '.env.local');
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
const RESUME = process.argv.includes('--resume'); // re-run; skip JSONL records already marked clean

const VENTURE_ROOT = path.resolve(__dirname, '..');
const PERS_DIR = path.join(VENTURE_ROOT, '.cycle/marketing/personalization');
const PIPELINE_DIR = path.join(VENTURE_ROOT, '.cycle/marketing/lead-pipeline-v2');
const TOKEN_FILE = path.join(os.homedir(), '.cred', 'practiq-gmail-token.json');

const FROM_ALIAS = 'seungdo.keum@practiq.dev';
const FROM_NAME = 'Seungdo Keum';

// JSONL files to process (cold first, press last for safety).
const JSONL_FILES = [
  { path: path.join(PERS_DIR, 'batch-1-output.jsonl'), kind: 'cold' },
  { path: path.join(PERS_DIR, 'batch-2-output.jsonl'), kind: 'cold' },
  { path: path.join(PERS_DIR, 'batch-3-output.jsonl'), kind: 'cold' },
  { path: path.join(PERS_DIR, 'batch-4-output.jsonl'), kind: 'cold' },
  { path: path.join(PERS_DIR, 'batch-5-output.jsonl'), kind: 'cold' },
  { path: path.join(PERS_DIR, 'batch-6-output.jsonl'), kind: 'cold' },
  { path: path.join(PIPELINE_DIR, 'cpa-output.jsonl'), kind: 'cold' },
  { path: path.join(PIPELINE_DIR, 'law-output.jsonl'), kind: 'cold' },
  { path: path.join(PIPELINE_DIR, 'hr-output.jsonl'), kind: 'cold' },
  { path: path.join(PIPELINE_DIR, 'marketing-output.jsonl'), kind: 'cold' },
  { path: path.join(PERS_DIR, 'trade-press-output.jsonl'), kind: 'press' },
];

// Heuristic: does this body still contain a fabricated claim?
// Expanded after first pass missed phrasings like "piloting with five firms now",
// "Five boutique firms piloting today", "our pilot cohort", "inside our pilot".
const FABRICATED_PATTERNS = [
  // any X-firms-in-pilot phrasing
  /\b(?:five|5|four|three|2|two)\s+(?:boutique\s+)?(?:firms?|professional\s+firms?|pro-services\s+firms?)\s+(?:in\s+pilot|piloting|now|today)/i,
  /\bpiloting\s+with\s+(?:five|5|four|three|2|two)\s+firms?/i,
  /\b(?:five|5|four|three)\s+(?:boutique\s+)?firms?\s+now\b/i,
  /\b(?:5|five)\s+pilots?\b/i,
  // any "design partner is/runs" claim or specific N-client firm
  /\b(?:design\s+partner\s+is|design\s+partner\s+runs)/i,
  /\b\d{2,3}-client\s+(?:CPA\s+)?(?:design\s+partner|firm|practice|shop|customer)/i,
  /\b(?:one|1|a)\s+(?:live\s+)?design\s+partner\b/i,
  /\bour\s+design\s+partner/i,
  /\bthe\s+design\s+partner/i,
  /\bcurrently\s+piloting\b/i,
  /\b140[-\s]?client\b/i,
  /\bpilot\s+cohort\b/i,
  /\binside\s+our\s+pilot\b/i,
  /\bour\s+(?:current\s+)?pilots?\b/i,
  /\bin\s+our\s+pilot\b/i,
  // proof-via-customer claims
  /\bbuilt\s+with\s+\d+\s+firms?/i,
  /\b\d+\s+customers?\s+already\b/i,
];

function hasFabrication(body) {
  return FABRICATED_PATTERNS.some(p => p.test(body));
}

const SYSTEM_PROMPT = `You correct cold sales emails to remove FABRICATED proof claims.

PRACTIQ STATUS (REAL): pre-launch, ZERO customers, ZERO firms in pilot,
ZERO design partners, NO 140-client CPA firm, NO pilot cohort. The wedge
(Word doc → tracked-changes Word doc, firm's voice, cites prior memos) IS
REAL. Pricing ($15/client/month, no annual contract) IS REAL (price
commitment).

You will receive a body. Your job:

1. REMOVE ANY phrase that claims customer proof. The output MUST NOT
   contain ANY of these patterns (matched case-insensitively):
   - "5 firms / five firms / four firms / three firms" + (in pilot, piloting, now, today, already)
   - "piloting with N firms"
   - "currently piloting"
   - "pilot cohort" / "our pilot" / "inside our pilot" / "in our pilot"
   - "design partner is" / "design partner runs"
   - "one design partner" / "live design partner" / "the design partner" / "our design partner"
   - "140-client" or any "<N>-client design partner / firm / shop"
   - "built with N firms" / "N customers already"
   - Any specific count of customers / pilots / partners

2. REPLACE removed sentences with HONEST pre-launch framing. Pick the
   natural choice for context:
   - "I'm pre-launch and looking for 2-3 design partners now."
   - "Pre-launch — looking for boutique firms in the 50-200 client range to be the first design partners."
   - For non-CPA verticals: "Starting with CPA firms but the wedge is identical for [vertical]. Looking for the first [vertical] design partner now."
   Do NOT say "we have 5 firms" or "our 140-client design partner" — those don't exist.

3. PRESERVE THESE PARTS UNCHANGED (verbatim, do not rephrase):
   - Opening greeting + firm-specific hook paragraph
   - The wedge mechanics paragraph (Word doc, tracked changes, w:ins/w:del,
     firm's voice, prior memos)
   - "$15/client/month" or "$15 per client per month" + "no annual contract"
   - "Karbon / ProConnect / TaxDome / Drake / QuickBooks" or "replaces nothing"
   - Closing low-bar ask ("15 min on Zoom", "60-sec Loom", "yes/no")
   - Signature block (the "—" line, "Seungdo Keum, Founder · Practiq", email)

4. Word count: within ±15 words of the original.

5. Tone: builder-to-builder, plain English. NO marketing fluff. NO new
   adjectives like "powerful", "industry-leading", "revolutionary".

CRITICAL: read the output once before returning. If it contains ANY of
the BANNED phrases in step 1, rewrite again. Output ONLY the corrected
body — no preamble, no explanation, no markdown fences.`;

async function rewriteBody(client, body) {
  const resp = await client.messages.create({
    model: 'anthropic/claude-sonnet-4.5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: body }],
  });
  const out = resp.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
  return out;
}

function rfc2822Build({ to, subject, body, isPlaceholderTo = false }) {
  const finalBody = isPlaceholderTo
    ? `>>> TO: ${to || '[FILL RECIPIENT BEFORE SENDING]'}\n\n${body}`
    : body;
  const bodyB64 = Buffer.from(finalBody, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
  const lines = [];
  lines.push(`From: ${FROM_NAME} <${FROM_ALIAS}>`);
  if (!isPlaceholderTo) lines.push(`To: ${to}`);
  lines.push(`Subject: ${encodeHeaderIfNeeded(subject)}`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(bodyB64);
  return lines.join('\r\n');
}

function encodeHeaderIfNeeded(value) {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function base64UrlEncode(s) {
  return Buffer.from(s, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY missing — falling back to ANTHROPIC_API_KEY');
  }
  // OpenRouter exposes Anthropic's /v1/messages endpoint. The Anthropic SDK
  // already appends /v1/messages — so baseURL must be the API root, NOT
  // /api/v1. See ventures/.../src/lib/claude/client.ts for the canonical
  // pattern.
  const llmClient = new Anthropic({
    apiKey: process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.OPENROUTER_API_KEY
      ? 'https://openrouter.ai/api'
      : undefined,
    defaultHeaders: process.env.OPENROUTER_API_KEY
      ? { 'HTTP-Referer': 'https://practiq.dev', 'X-Title': 'Practiq fix-fabricated-claims' }
      : {},
  });

  // Phase 1: rewrite JSONL files
  console.log(`\n=== Phase 1: rewriting JSONL bodies ${DRY_RUN ? '(dry-run)' : ''} ===`);
  let totalScanned = 0;
  let totalRewritten = 0;
  let totalSkipped = 0;

  for (const file of JSONL_FILES) {
    if (!fs.existsSync(file.path)) {
      console.log(`  ! ${path.basename(file.path)}: not found`);
      continue;
    }
    const lines = fs.readFileSync(file.path, 'utf8').split(/\r?\n/).filter(l => l.trim());
    const out = [];
    let rewritten = 0;
    for (const l of lines) {
      const r = JSON.parse(l);
      totalScanned++;
      if (r.skip) { out.push(l); continue; }
      if (RESUME && !hasFabrication(r.body || '')) {
        totalSkipped++;
        out.push(l);
        continue;
      }
      if (!hasFabrication(r.body || '')) {
        // Already clean (defensive — shouldn't happen on first run)
        totalSkipped++;
        out.push(l);
        continue;
      }
      try {
        const newBody = await rewriteBody(llmClient, r.body);
        if (!newBody || newBody.length < 100) {
          throw new Error(`Rewrite returned suspiciously short body: ${newBody.length} chars`);
        }
        if (hasFabrication(newBody)) {
          throw new Error('Rewrite still contains fabrication patterns');
        }
        r.body = newBody;
        rewritten++;
        totalRewritten++;
        if (rewritten % 5 === 0) console.log(`    ${path.basename(file.path)}: rewrote ${rewritten}/${lines.length}...`);
      } catch (e) {
        console.error(`  ✗ ${r.firm_name || r.publication}: ${e.message}`);
      }
      out.push(JSON.stringify(r));
    }
    if (!DRY_RUN) {
      fs.writeFileSync(file.path, out.join('\n') + '\n', 'utf8');
    }
    console.log(`  ${path.basename(file.path)}: ${rewritten} rewritten / ${lines.length} total`);
  }

  console.log(`\nPhase 1 done: scanned ${totalScanned}, rewritten ${totalRewritten}, already-clean ${totalSkipped}`);

  if (DRY_RUN) {
    console.log('\n--dry-run: no Gmail API calls. JSONL files NOT written.');
    return;
  }

  // Phase 2: push corrected bodies to Gmail
  console.log(`\n=== Phase 2: updating Gmail drafts ===`);
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')));
  const gmail = google.gmail({ version: 'v1', auth });

  // Build map: email → { draftId, messageId, labelIds }
  const allDraftsByTo = new Map();
  let pageToken;
  do {
    const r = await gmail.users.drafts.list({ userId: 'me', maxResults: 200, pageToken });
    if (r.data.drafts) {
      for (const d of r.data.drafts) {
        const det = await gmail.users.drafts.get({
          userId: 'me', id: d.id, format: 'metadata', metadataHeaders: ['To', 'Subject'],
        });
        const headers = det.data.message?.payload?.headers || [];
        const toHeader = (headers.find(h => (h.name || '').toLowerCase() === 'to') || {}).value || '';
        const subject = (headers.find(h => (h.name || '').toLowerCase() === 'subject') || {}).value || '';
        const key = toHeader.trim().toLowerCase() || `(no-to)|${subject}`;
        allDraftsByTo.set(key, {
          draftId: d.id,
          messageId: det.data.message?.id,
          labelIds: det.data.message?.labelIds || [],
        });
      }
    }
    pageToken = r.data.nextPageToken;
  } while (pageToken);
  console.log(`  Found ${allDraftsByTo.size} existing drafts in mailbox.`);

  // Walk every JSONL record, update the corresponding draft.
  let updated = 0;
  let pressUpdated = 0;
  let notFound = 0;
  let updateErrors = 0;
  for (const file of JSONL_FILES) {
    if (!fs.existsSync(file.path)) continue;
    const lines = fs.readFileSync(file.path, 'utf8').split(/\r?\n/).filter(l => l.trim());
    for (const l of lines) {
      const r = JSON.parse(l);
      if (r.skip) continue;
      let key;
      let isPlaceholderTo = false;
      if (file.kind === 'press') {
        // Trade press uses verified email field, not contact_email
        const to = r.email_verified;
        if (!to) {
          // press v1 had placeholder; skip for now (already corrected in v2)
          continue;
        }
        key = to.toLowerCase();
      } else {
        if (!r.contact_email) continue;
        key = r.contact_email.toLowerCase();
      }
      const draft = allDraftsByTo.get(key);
      if (!draft) {
        console.error(`  ! draft not found for ${key} (${r.firm_name || r.publication})`);
        notFound++;
        continue;
      }
      try {
        const subject = r.subject;
        const to = file.kind === 'press' ? r.email_verified : r.contact_email;
        const raw = base64UrlEncode(rfc2822Build({ to, subject, body: r.body, isPlaceholderTo }));
        await gmail.users.drafts.update({
          userId: 'me',
          id: draft.draftId,
          requestBody: { message: { raw } },
        });
        // Verify the labels are still on the message; re-apply if dropped
        const after = await gmail.users.drafts.get({
          userId: 'me', id: draft.draftId, format: 'metadata',
        });
        const newMsgId = after.data.message?.id;
        const currentLabels = new Set(after.data.message?.labelIds || []);
        const wantLabels = draft.labelIds;
        const missing = wantLabels.filter(lid => !currentLabels.has(lid));
        if (newMsgId && missing.length > 0) {
          await gmail.users.messages.modify({
            userId: 'me', id: newMsgId, requestBody: { addLabelIds: missing },
          });
        }
        updated++;
        if (file.kind === 'press') pressUpdated++;
        if (updated % 10 === 0) console.log(`    updated ${updated}...`);
      } catch (e) {
        console.error(`  ✗ ${r.firm_name || r.publication}: ${e.message}`);
        updateErrors++;
      }
    }
  }

  console.log(`\nPhase 2 done: ${updated} updated (${pressUpdated} press), ${notFound} not found, ${updateErrors} errors`);
}

main().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); });
