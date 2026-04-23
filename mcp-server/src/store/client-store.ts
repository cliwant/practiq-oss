/**
 * Client data store — reads/writes JSON files at ~/.practiq/clients/
 *
 * Each client is a single JSON file named by slug: {slug}.json
 * Human-readable, editable by hand, no database required.
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Client, Vertical, Contact, Engagement, ClientStatus } from "./types.js";
import { now } from "../utils/date-utils.js";

function getDataDir(): string {
  return process.env["PRACTIQ_DATA_DIR"] ?? path.join(os.homedir(), ".practiq");
}

function clientsDir(): string {
  return path.join(getDataDir(), "clients");
}

function clientPath(slug: string): string {
  return path.join(clientsDir(), `${slug}.json`);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function getAllClients(): Promise<Client[]> {
  await ensureDir(clientsDir());

  let entries: string[];
  try {
    entries = await fs.readdir(clientsDir());
  } catch {
    return [];
  }

  const clients: Client[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const data = await fs.readFile(path.join(clientsDir(), entry), "utf-8");
      clients.push(JSON.parse(data) as Client);
    } catch {
      // skip malformed files
    }
  }

  return clients.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClient(slugOrName: string): Promise<Client | null> {
  const slug = slugify(slugOrName);

  // Try direct slug match first
  try {
    const data = await fs.readFile(clientPath(slug), "utf-8");
    return JSON.parse(data) as Client;
  } catch {
    // not found by slug, try name search
  }

  // Fuzzy search by name
  const all = await getAllClients();
  const lower = slugOrName.toLowerCase();
  const match = all.find(
    (c) =>
      c.slug === slug ||
      c.name.toLowerCase() === lower ||
      c.name.toLowerCase().includes(lower) ||
      c.id === slugOrName,
  );
  return match ?? null;
}

export interface AddClientInput {
  name: string;
  vertical: Vertical;
  contacts?: Contact[];
  notes?: string;
  engagementType?: string;
  startDate?: string;
  value?: number;
  scope?: string;
  tags?: string[];
  status?: ClientStatus;
}

export async function addClient(input: AddClientInput): Promise<Client> {
  await ensureDir(clientsDir());

  const slug = slugify(input.name);
  const existing = await getClient(slug);
  if (existing) {
    throw new Error(`Client "${input.name}" already exists (slug: ${slug})`);
  }

  const timestamp = now();
  const client: Client = {
    id: randomUUID(),
    slug,
    name: input.name,
    vertical: input.vertical,
    status: input.status ?? "active",
    contacts: input.contacts ?? [],
    engagement: {
      type: input.engagementType ?? "retainer",
      startDate: input.startDate ?? timestamp.slice(0, 10),
      value: input.value,
      scope: input.scope,
    },
    notes: input.notes ?? "",
    tags: input.tags ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await fs.writeFile(clientPath(slug), JSON.stringify(client, null, 2), "utf-8");
  return client;
}

export async function updateClient(
  slug: string,
  updates: Partial<Client>,
): Promise<Client> {
  const client = await getClient(slug);
  if (!client) {
    throw new Error(`Client not found: ${slug}`);
  }

  const updated: Client = {
    ...client,
    ...updates,
    id: client.id, // never overwrite id
    slug: client.slug, // never overwrite slug
    createdAt: client.createdAt, // never overwrite creation
    updatedAt: now(),
  };

  await fs.writeFile(clientPath(client.slug), JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

export async function searchClients(query: string): Promise<Array<{ client: Client; matchContext: string }>> {
  const all = await getAllClients();
  const lower = query.toLowerCase();
  const results: Array<{ client: Client; matchContext: string }> = [];

  for (const client of all) {
    const searchableFields = [
      client.name,
      client.vertical,
      client.status,
      client.notes,
      client.tags.join(" "),
      client.contacts.map((c) => `${c.name} ${c.role} ${c.email ?? ""} ${c.notes ?? ""}`).join(" "),
      client.engagement.type,
      client.engagement.scope ?? "",
    ];

    const fullText = searchableFields.join(" ");
    if (fullText.toLowerCase().includes(lower)) {
      // Extract a snippet around the match
      const idx = fullText.toLowerCase().indexOf(lower);
      const start = Math.max(0, idx - 40);
      const end = Math.min(fullText.length, idx + query.length + 40);
      const matchContext = (start > 0 ? "..." : "") +
        fullText.slice(start, end) +
        (end < fullText.length ? "..." : "");

      results.push({ client, matchContext });
    }
  }

  return results;
}
