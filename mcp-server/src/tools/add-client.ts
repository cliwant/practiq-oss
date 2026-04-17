/**
 * add_client — Add a new client to the practice.
 */

import { addClient, type AddClientInput } from "../store/client-store.js";
import type { Vertical, ClientStatus, Contact } from "../store/types.js";

export interface AddClientToolInput {
  name: string;
  vertical: string;
  contacts?: Array<{
    name: string;
    role: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    notes?: string;
  }>;
  notes?: string;
  engagement_type?: string;
  start_date?: string;
  value?: number;
  scope?: string;
  tags?: string;
  status?: string;
}

const VALID_VERTICALS: Vertical[] = [
  "accounting",
  "law",
  "hr",
  "consulting",
  "agency",
  "other",
];

const VALID_STATUSES: ClientStatus[] = [
  "active",
  "onboarding",
  "paused",
  "churned",
];

export async function addClientTool(input: AddClientToolInput): Promise<string> {
  // Validate vertical
  const vertical = input.vertical.toLowerCase() as Vertical;
  if (!VALID_VERTICALS.includes(vertical)) {
    return `Invalid vertical: "${input.vertical}". Must be one of: ${VALID_VERTICALS.join(", ")}`;
  }

  // Validate status
  let status: ClientStatus = "active";
  if (input.status) {
    const s = input.status.toLowerCase() as ClientStatus;
    if (!VALID_STATUSES.includes(s)) {
      return `Invalid status: "${input.status}". Must be one of: ${VALID_STATUSES.join(", ")}`;
    }
    status = s;
  }

  // Parse contacts
  const contacts: Contact[] = (input.contacts ?? []).map((c) => ({
    name: c.name,
    role: c.role,
    email: c.email,
    phone: c.phone,
    isPrimary: c.isPrimary ?? false,
    notes: c.notes,
  }));

  // Parse tags
  const tags = input.tags
    ? input.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const addInput: AddClientInput = {
    name: input.name,
    vertical,
    contacts,
    notes: input.notes,
    engagementType: input.engagement_type,
    startDate: input.start_date,
    value: input.value,
    scope: input.scope,
    tags,
    status,
  };

  try {
    const client = await addClient(addInput);
    const lines = [
      `Client added successfully.`,
      "",
      `  Name: ${client.name}`,
      `  Slug: ${client.slug}`,
      `  ID: ${client.id}`,
      `  Vertical: ${client.vertical}`,
      `  Status: ${client.status}`,
      `  Engagement: ${client.engagement.type} starting ${client.engagement.startDate}`,
    ];
    if (client.engagement.value) {
      lines.push(`  Monthly value: $${client.engagement.value.toLocaleString()}`);
    }
    if (client.contacts.length > 0) {
      lines.push(`  Contacts: ${client.contacts.map((c) => c.name).join(", ")}`);
    }
    if (client.tags.length > 0) {
      lines.push(`  Tags: ${client.tags.join(", ")}`);
    }
    lines.push("");
    lines.push(`Data stored at: ~/.practiq/clients/${client.slug}.json`);
    return lines.join("\n");
  } catch (err) {
    return `Error adding client: ${err instanceof Error ? err.message : String(err)}`;
  }
}
