# @practiq/mcp

AI-native practice management context layer for small professional services firms managing 50-200 clients.

No database. No cloud. Just local JSON files and 10 practice intelligence tools that work inside Claude Desktop, Claude Code, or any MCP-compatible client.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "practiq": {
      "command": "npx",
      "args": ["-y", "@practiq/mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add practiq -- npx -y @practiq/mcp
```

### Global Install

```bash
npm install -g @practiq/mcp
practiq-mcp
```

## Tools

### 1. `morning_briefing`

Generate a prioritized daily briefing across all clients.

```
Input:  { vertical?: "accounting" | "law" | "hr" | "consulting" | "agency" | "other" }
Output: Overdue deadlines, upcoming items, stale clients, recent activity, at-risk clients
```

**Example prompt:** "Good morning, what do I need to focus on today?"

### 2. `client_context`

Full context dump for a specific client.

```
Input:  { client_name: "Smith & Associates" }
Output: Profile, contacts, engagement, interaction history, deadlines, health score, notes
```

**Example prompt:** "Tell me everything about Smith & Associates."

### 3. `add_client`

Add a new client to the practice roster.

```
Input:  {
  name: "Johnson Corp",
  vertical: "accounting",
  contacts: [{ name: "Sarah Johnson", role: "CEO", email: "sarah@johnson.com", isPrimary: true }],
  engagement_type: "monthly retainer",
  value: 2500,
  notes: "Referred by Kim's Restaurant"
}
```

**Example prompt:** "Add Johnson Corp as a new accounting client. Sarah Johnson is the CEO, email sarah@johnson.com. Monthly retainer at $2,500."

### 4. `log_interaction`

Log a client interaction (meeting, email, call, or note).

```
Input:  {
  client_name: "Smith & Associates",
  type: "meeting",
  summary: "Quarterly review. Revenue up 15%. Discussed tax planning for Q4.",
  action_items: ["Send updated tax projection", "Schedule follow-up in 2 weeks"]
}
```

**Example prompt:** "I just had a meeting with Smith & Associates. Revenue is up 15%. We discussed Q4 tax planning. I need to send them an updated projection and schedule a follow-up in 2 weeks."

### 5. `week_priorities`

Get a prioritized focus list for the week.

```
Input:  {}
Output: Ranked client list with priority scores and reasoning
```

**Example prompt:** "What should I focus on this week?"

### 6. `prepare_meeting`

Pre-meeting context bundle for a client.

```
Input:  { client_name: "Johnson Corp", meeting_purpose: "quarterly review" }
Output: Client snapshot, contacts, recent interactions, open items, deadlines, talking points
```

**Example prompt:** "I have a meeting with Johnson Corp in an hour. Prepare me."

### 7. `search_clients`

Full-text search across all client data.

```
Input:  { query: "tax planning" }
Output: Matching clients and interactions with relevant excerpts
```

**Example prompt:** "Which clients have we discussed tax planning with?"

### 8. `client_health`

Health score for one or all clients.

```
Input:  { client_name?: "Smith & Associates" }
Output: Score 0-100, band (Healthy/Watch/At Risk/Critical), dimension breakdown
```

**Example prompt:** "Show me the health of all my clients." or "How is Smith & Associates doing?"

### 9. `handoff_brief`

Generate a handoff document for transitioning a client.

```
Input:  {
  client_name: "Smith & Associates",
  outgoing_person: "Jennifer",
  incoming_person: "Emily"
}
Output: Complete handoff document with profile, contacts, history, deadlines, checklist
```

**Example prompt:** "Generate a handoff brief for Smith & Associates. I'm transitioning them from Jennifer to Emily."

### 10. `deadline_tracker`

Track and manage deadlines across the practice.

```
# List all deadlines
Input:  { action: "list" }

# Add a deadline
Input:  { action: "add", client_name: "Smith", description: "Q1 tax filing", due_date: "2026-04-15", priority: "high" }

# Complete a deadline
Input:  { action: "complete", deadline_id: "uuid-here" }
```

**Example prompt:** "What deadlines are coming up?" or "Add a deadline for Smith's Q1 tax filing, due April 15, high priority."

## Data Storage

All data is stored locally as human-readable JSON files:

```
~/.practiq/
  clients/
    smith-associates.json       # Client profile
    johnson-corp.json
  interactions/
    smith-associates.jsonl      # Append-only interaction log
    johnson-corp.jsonl
  deadlines/
    deadlines.json              # All deadlines across clients
```

### Custom data directory

Set the `PRACTIQ_DATA_DIR` environment variable:

```json
{
  "mcpServers": {
    "practiq": {
      "command": "npx",
      "args": ["-y", "@practiq/mcp"],
      "env": {
        "PRACTIQ_DATA_DIR": "/path/to/your/data"
      }
    }
  }
}
```

## Who This Is For

- **CPA firms** managing monthly closes, tax seasons, and 50-200 clients
- **Law firms** tracking client matters, deadlines, and team handoffs
- **HR advisory** managing employee relations across client organizations
- **Consulting firms** juggling multiple engagements and deliverables
- **Agencies** tracking client projects, contacts, and account health

## Why This Exists

Every existing MCP server is a data connector. They answer "give me X from Y system." None of them answer:

- "What needs my attention across ALL my clients right now?"
- "Brief me on Client X before my 2pm meeting"
- "Which clients need attention this week?"
- "Generate a handoff document for this client transition"

Practiq is a **practice intelligence layer**, not a pipe. It synthesizes client data into actionable briefings, priorities, and health scores.

## Development

```bash
cd mcp-server
npm install
npm run build        # Compile TypeScript
npm run type-check   # Type-check without emitting
npm run dev          # Run with tsx (development)
```

## License

MIT

---

Built by [Cliwant](https://cliwant.com) for small professional services firms managing 50-200 clients.
