/**
 * Interaction log store — append-only JSONL files at ~/.practiq/interactions/
 *
 * Each client has one file: {slug}.jsonl
 * One JSON object per line, newest appended at the bottom.
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Interaction, InteractionType } from "./types.js";
import { now } from "../utils/date-utils.js";
import { updateClient, getClient } from "./client-store.js";

function getDataDir(): string {
  return process.env["PRACTIQ_DATA_DIR"] ?? path.join(os.homedir(), ".practiq");
}

function interactionsDir(): string {
  return path.join(getDataDir(), "interactions");
}

function interactionPath(clientSlug: string): string {
  return path.join(interactionsDir(), `${clientSlug}.jsonl`);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function getInteractions(clientSlug: string): Promise<Interaction[]> {
  await ensureDir(interactionsDir());

  let content: string;
  try {
    content = await fs.readFile(interactionPath(clientSlug), "utf-8");
  } catch {
    return [];
  }

  const interactions: Interaction[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      interactions.push(JSON.parse(trimmed) as Interaction);
    } catch {
      // skip malformed lines
    }
  }

  return interactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getAllInteractions(): Promise<Interaction[]> {
  await ensureDir(interactionsDir());

  let entries: string[];
  try {
    entries = await fs.readdir(interactionsDir());
  } catch {
    return [];
  }

  const all: Interaction[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".jsonl")) continue;
    const slug = entry.replace(".jsonl", "");
    const interactions = await getInteractions(slug);
    all.push(...interactions);
  }

  return all.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export interface LogInteractionInput {
  clientSlug: string;
  type: InteractionType;
  summary: string;
  actionItems?: string[];
  date?: string;
}

export async function logInteraction(input: LogInteractionInput): Promise<Interaction> {
  await ensureDir(interactionsDir());

  const interaction: Interaction = {
    id: randomUUID(),
    clientSlug: input.clientSlug,
    type: input.type,
    summary: input.summary,
    actionItems: input.actionItems ?? [],
    date: input.date ?? now().slice(0, 10),
    createdAt: now(),
  };

  const line = JSON.stringify(interaction) + "\n";
  await fs.appendFile(interactionPath(input.clientSlug), line, "utf-8");

  // Update client's lastInteraction
  const client = await getClient(input.clientSlug);
  if (client) {
    await updateClient(input.clientSlug, { lastInteraction: interaction.date });
  }

  return interaction;
}

export async function searchInteractions(
  query: string,
  clientSlug?: string,
): Promise<Array<{ interaction: Interaction; matchContext: string }>> {
  const lower = query.toLowerCase();
  const interactions = clientSlug
    ? await getInteractions(clientSlug)
    : await getAllInteractions();

  const results: Array<{ interaction: Interaction; matchContext: string }> = [];

  for (const interaction of interactions) {
    const searchText = [
      interaction.summary,
      ...interaction.actionItems,
      interaction.type,
    ].join(" ");

    if (searchText.toLowerCase().includes(lower)) {
      const idx = searchText.toLowerCase().indexOf(lower);
      const start = Math.max(0, idx - 40);
      const end = Math.min(searchText.length, idx + query.length + 40);
      const matchContext =
        (start > 0 ? "..." : "") +
        searchText.slice(start, end) +
        (end < searchText.length ? "..." : "");

      results.push({ interaction, matchContext });
    }
  }

  return results;
}
