#!/usr/bin/env node
/**
 * @practiq/mcp — AI-native practice management context layer
 *
 * MCP server that provides practice management intelligence tools
 * for small professional services firms (CPA, law, HR advisory,
 * consulting, agency) managing 50-200 clients.
 *
 * Tools:
 *   - morning_briefing    — daily prioritized client briefing
 *   - client_context      — full context dump for one client
 *   - add_client          — add a new client to the roster
 *   - log_interaction     — log a meeting/email/call/note
 *   - week_priorities     — prioritized focus list for the week
 *   - prepare_meeting     — pre-meeting context bundle
 *   - search_clients      — full-text search across all data
 *   - client_health       — health score (single or all clients)
 *   - handoff_brief       — client transition document
 *   - deadline_tracker    — track deadlines across the practice
 *
 * Data: stored locally at ~/.practiq/ as human-readable JSON files.
 * Zero cloud dependencies. Works offline.
 *
 * Built by Cliwant for small professional services firms.
 * https://practiq.dev
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, VERSION } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Use stderr — MCP uses stdout for protocol frames
  process.stderr.write(
    `[practiq-mcp] v${VERSION} ready | data: ${process.env["PRACTIQ_DATA_DIR"] ?? "~/.practiq"}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[practiq-mcp] fatal: ${String(err)}\n`);
  process.exit(1);
});
