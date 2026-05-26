/**
 * Deadline store — single JSON file at ~/.practiq/deadlines/deadlines.json
 *
 * All deadlines across all clients live in one file for easy cross-client
 * queries (e.g., "what's due this week across the practice?").
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Deadline, DeadlineStore } from "./types.js";
import { now } from "../utils/date-utils.js";

function getDataDir(): string {
  return process.env["PRACTIQ_DATA_DIR"] ?? path.join(os.homedir(), ".practiq");
}

function deadlinesDir(): string {
  return path.join(getDataDir(), "deadlines");
}

function deadlinesPath(): string {
  return path.join(deadlinesDir(), "deadlines.json");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readStore(): Promise<DeadlineStore> {
  await ensureDir(deadlinesDir());
  try {
    const data = await fs.readFile(deadlinesPath(), "utf-8");
    return JSON.parse(data) as DeadlineStore;
  } catch {
    return { deadlines: [] };
  }
}

async function writeStore(store: DeadlineStore): Promise<void> {
  await ensureDir(deadlinesDir());
  await fs.writeFile(deadlinesPath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function getAllDeadlines(): Promise<Deadline[]> {
  const store = await readStore();
  return store.deadlines.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
}

export async function getDeadlinesForClient(clientSlug: string): Promise<Deadline[]> {
  const all = await getAllDeadlines();
  return all.filter((d) => d.clientSlug === clientSlug);
}

export async function getActiveDeadlines(): Promise<Deadline[]> {
  const all = await getAllDeadlines();
  return all.filter((d) => !d.completed);
}

export async function getOverdueDeadlines(): Promise<Deadline[]> {
  const active = await getActiveDeadlines();
  return active.filter((d) => new Date(d.dueDate).getTime() < Date.now());
}

export async function getUpcomingDeadlines(withinDays: number = 7): Promise<Deadline[]> {
  const active = await getActiveDeadlines();
  const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  return active.filter(
    (d) => {
      const due = new Date(d.dueDate).getTime();
      return due >= Date.now() && due <= cutoff;
    },
  );
}

export interface AddDeadlineInput {
  clientSlug: string;
  clientName: string;
  description: string;
  dueDate: string;
  priority?: "low" | "medium" | "high" | "critical";
}

export async function addDeadline(input: AddDeadlineInput): Promise<Deadline> {
  const store = await readStore();

  const deadline: Deadline = {
    id: randomUUID(),
    clientSlug: input.clientSlug,
    clientName: input.clientName,
    description: input.description,
    dueDate: input.dueDate,
    completed: false,
    priority: input.priority ?? "medium",
    createdAt: now(),
  };

  store.deadlines.push(deadline);
  await writeStore(store);
  return deadline;
}

export async function completeDeadline(deadlineId: string): Promise<Deadline> {
  const store = await readStore();
  const idx = store.deadlines.findIndex((d) => d.id === deadlineId);
  if (idx === -1) {
    throw new Error(`Deadline not found: ${deadlineId}`);
  }

  store.deadlines[idx] = {
    ...store.deadlines[idx],
    completed: true,
    completedAt: now(),
  };

  await writeStore(store);
  return store.deadlines[idx];
}
