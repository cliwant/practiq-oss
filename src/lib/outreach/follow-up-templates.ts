/**
 * follow-up-templates.ts — Touch 2 / Touch 3 body generation for the
 * Practiq cold-outreach follow-up cron. Reads bespoke per-contact
 * research findings from `personalization/batch-{N}-output.jsonl` and
 * distills the original hook into a 2-3 word topic the Touch 2 body
 * leans on.
 */
import fs from "fs/promises";
import path from "path";
import { anthropic } from "@/lib/claude/client";

export type PersonalizationRecord = {
  contact_email: string;
  firm_name: string;
  contact_name: string;
  research_findings?: {
    hook?: string;
    services_observed?: string[];
    niches_observed?: string[];
    notes?: string;
  };
  hook?: string;
  subject?: string;
  body?: string;
};

function personalizationCandidates(): string[] {
  const baseRoots = [
    path.resolve(process.cwd(), ".cycle", "marketing", "personalization"),
    path.resolve(
      process.cwd(),
      "..",
      "..",
      "ventures",
      "fractional-ai-command-center",
      ".cycle",
      "marketing",
      "personalization"
    ),
  ];
  return baseRoots;
}

let _personalizationCache: PersonalizationRecord[] | null = null;

export async function loadAllPersonalization(): Promise<PersonalizationRecord[]> {
  if (_personalizationCache) return _personalizationCache;
  const out: PersonalizationRecord[] = [];
  for (const root of personalizationCandidates()) {
    try {
      const entries = await fs.readdir(root);
      for (const file of entries) {
        if (!/^batch-\d+-output\.jsonl$/.test(file)) continue;
        try {
          const text = await fs.readFile(path.join(root, file), "utf8");
          for (const line of text.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              out.push(JSON.parse(trimmed) as PersonalizationRecord);
            } catch {
              /* skip */
            }
          }
        } catch {
          /* skip individual file errors */
        }
      }
      if (out.length > 0) {
        _personalizationCache = out;
        return out;
      }
    } catch {
      continue;
    }
  }
  _personalizationCache = out;
  return out;
}

export async function findPersonalizationByEmail(
  email: string
): Promise<PersonalizationRecord | null> {
  const all = await loadAllPersonalization();
  const key = email.trim().toLowerCase();
  for (const r of all) {
    if (r.contact_email && r.contact_email.trim().toLowerCase() === key) {
      return r;
    }
  }
  return null;
}

function firstName(fullName: string): string {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

/**
 * Distill the original personalization hook into a 2-3 word topic phrase
 * the Touch 2 body can reference (e.g. "compilation memos", "AZ tax credit
 * stacking"). Falls back to a sensible default if the LLM call fails.
 */
export async function distillHookTopic(hook: string): Promise<string> {
  const fallback = "the redline-memo angle";
  if (!hook) return fallback;
  try {
    const message = await anthropic.messages.create({
      model: "anthropic/claude-sonnet-4.5",
      max_tokens: 60,
      system:
        "You distill a personalization hook for a cold-email follow-up. Return ONLY a 2 to 4 word topic phrase, no quotes, no punctuation, lowercase. Examples: 'compilation memos', 'estate-and-gift memos', 'tax credit stacking', 'closely-held s-corps'.",
      messages: [{ role: "user", content: `Hook:\n${hook}` }],
    });
    const text =
      message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join(" ")
        .trim() || "";
    // Sanity-check: should be short, no newlines.
    const cleaned = text.replace(/[\n\r"`]/g, "").trim().toLowerCase();
    if (cleaned.length < 2 || cleaned.length > 60) return fallback;
    return cleaned;
  } catch {
    return fallback;
  }
}

export async function buildTouch2Body({
  firstName: fName,
  hookTopic,
}: {
  firstName: string;
  hookTopic: string;
}): Promise<string> {
  return `Hi ${fName},

Quick bump on the ${hookTopic} angle — happy to send the redlined Word doc walkthrough on a real client memo if useful, or skip if the timing's off.

—
Seungdo Keum, Founder · Practiq
seungdo.keum@practiq.dev`;
}

export function buildTouch3Body({
  firstName: fName,
}: {
  firstName: string;
}): string {
  return `Hi ${fName},

Last note from me — if Practiq's wedge isn't the right fit, totally understood. If it might be 6-12 months from now, just reply "later" and I'll follow up then.

—
Seungdo Keum, Founder · Practiq
seungdo.keum@practiq.dev`;
}

export async function generateFollowupBody({
  touch,
  contactEmail,
  contactName,
  hookOverride,
}: {
  touch: 2 | 3;
  contactEmail: string;
  contactName: string;
  hookOverride?: string;
}): Promise<{ body: string; subject: string | null }> {
  const fName = firstName(contactName);
  if (touch === 3) {
    return { body: buildTouch3Body({ firstName: fName }), subject: null };
  }
  const personalization = await findPersonalizationByEmail(contactEmail);
  const hook =
    hookOverride ||
    personalization?.hook ||
    personalization?.research_findings?.hook ||
    "";
  const topic = await distillHookTopic(hook);
  const body = await buildTouch2Body({ firstName: fName, hookTopic: topic });
  return { body, subject: null };
}

// Exported for unit tests.
export const _internal = { firstName };
