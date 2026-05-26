/**
 * Core type definitions for the Practiq MCP data model.
 *
 * All data is stored as human-readable JSON files at ~/.practiq/
 * (or %USERPROFILE%/.practiq/ on Windows).
 */

export type Vertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "agency"
  | "other";

export type ClientStatus = "active" | "onboarding" | "paused" | "churned";

export interface Contact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface Engagement {
  type: string; // "monthly retainer", "project", "advisory"
  startDate: string; // ISO date
  value?: number; // monthly $ value
  scope?: string; // brief scope description
}

export interface Client {
  id: string; // UUID
  slug: string; // kebab-case
  name: string; // "Smith & Associates LLC"
  vertical: Vertical;
  status: ClientStatus;
  contacts: Contact[];
  engagement: Engagement;
  notes: string; // freeform markdown notes
  tags: string[];
  healthScore?: number; // 0-100, computed
  lastInteraction?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

export type InteractionType = "meeting" | "email" | "call" | "note";

export interface Interaction {
  id: string;
  clientSlug: string;
  type: InteractionType;
  summary: string;
  actionItems: string[];
  date: string; // ISO date
  createdAt: string;
}

export interface Deadline {
  id: string;
  clientSlug: string;
  clientName: string;
  description: string;
  dueDate: string; // ISO date
  completed: boolean;
  completedAt?: string;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

export interface DeadlineStore {
  deadlines: Deadline[];
}

export interface PractiqConfig {
  firmName?: string;
  defaultVertical?: Vertical;
  dataDir?: string;
  createdAt: string;
}

export interface HealthDimensions {
  interactionRecency: number; // 0-100
  deadlineStatus: number; // 0-100
  engagementDepth: number; // 0-100
  riskSignals: number; // 0-100
}

export type HealthBand = "Healthy" | "Watch" | "At Risk" | "Critical";

export interface HealthResult {
  clientSlug: string;
  clientName: string;
  score: number;
  band: HealthBand;
  dimensions: HealthDimensions;
  summary: string;
}
