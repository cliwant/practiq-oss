#!/usr/bin/env node
/**
 * CLI entry point for @practiq/mcp.
 *
 * Usage:
 *   practiq-mcp          — start the MCP server (stdio transport)
 *   practiq-mcp --help   — show usage
 *   practiq-mcp --version — show version
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, VERSION } from "../server.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  process.stderr.write(`
@practiq/mcp v${VERSION}
AI-native practice management context layer for small professional services firms.

Usage:
  practiq-mcp           Start the MCP server (stdio transport)
  practiq-mcp --help    Show this help message
  practiq-mcp --version Show version

Environment:
  PRACTIQ_DATA_DIR      Override data directory (default: ~/.practiq)

Data stored at: ~/.practiq/
  clients/              Client profiles (JSON)
  interactions/         Interaction logs (JSONL)
  deadlines/            Deadline tracking (JSON)

Add to Claude Desktop config:
  {
    "mcpServers": {
      "practiq": {
        "command": "npx",
        "args": ["-y", "@practiq/mcp"]
      }
    }
  }

Built by Cliwant | https://practiq.dev
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    `[practiq-mcp] v${VERSION} ready | data: ${process.env["PRACTIQ_DATA_DIR"] ?? "~/.practiq"}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[practiq-mcp] fatal: ${String(err)}\n`);
  process.exit(1);
});
