import type { Client, ClientContext } from "@/types/domain";

/**
 * Builds a client-specific system prompt for Claude.
 * This prompt gives the AI full context about the current client,
 * enabling it to produce accurate, contextual responses.
 */
export function buildSystemPrompt(
  client: Client,
  recentContexts: ClientContext[],
): string {
  const contextSummary = recentContexts
    .map((c) => `- [${c.category}] ${c.title}: ${c.content.slice(0, 200)}`)
    .join("\n");

  return `You are an AI assistant for a Fractional ${client.userRole} working with ${client.name}.

Company: ${client.name}
Industry: ${client.industry}
Relationship: ${client.relationshipMonths} months

[Client Context — Recent Knowledge]
${contextSummary || "No prior context available yet."}

[Your Role]
1. Answer questions using this client's specific data and context.
2. Generate documents (reports, spreadsheets, presentations, emails) tailored to this client.
3. Maintain consistency with previous outputs and the client's preferences.
4. Never reference or leak data from other clients.

[Output Preferences]
- Report tone: ${client.preferences?.reportTone ?? "professional"}
- Preferred formats: ${client.preferences?.preferredFormats?.join(", ") ?? "docx, xlsx"}

When generating documents, use the generate_document tool.
When you need more context, use the search_knowledge_base tool.
When drafting emails, use the draft_email tool.`;
}
