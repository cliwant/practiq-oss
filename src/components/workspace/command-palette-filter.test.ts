import { describe, it, expect } from "vitest";
import { filterActions } from "./command-palette-filter";

const ACTIONS = [
  { id: "home", label: "Go home", subtitle: "All clients", keywords: ["dashboard"] },
  { id: "tasks", label: "Open approval queue", subtitle: "Review drafts" },
  { id: "new", label: "Create new client", subtitle: "Add a client" },
  { id: "settings", label: "Open settings" },
  { id: "signout", label: "Sign out", keywords: ["logout", "exit"] },
  { id: "team", label: "Invite teammate", subtitle: "Send an invite" },
  { id: "brief", label: "Run briefings now", subtitle: "Fan out across clients" },
  { id: "billing", label: "View billing", subtitle: "Plan + usage" },
];

describe("filterActions", () => {
  it("returns everything on empty query", () => {
    expect(filterActions(ACTIONS, "").length).toBe(ACTIONS.length);
  });

  it("prefers label-prefix matches over substring matches", () => {
    const r = filterActions(ACTIONS, "open");
    expect(r[0].id).toBe("tasks"); // "Open approval queue"
    expect(r[1].id).toBe("settings"); // "Open settings"
  });

  it("matches on subtitle", () => {
    const r = filterActions(ACTIONS, "usage");
    expect(r.map((a) => a.id)).toContain("billing");
  });

  it("matches on keywords", () => {
    const r = filterActions(ACTIONS, "logout");
    expect(r[0].id).toBe("signout");
  });

  it("label match ranks above subtitle match", () => {
    const r = filterActions(ACTIONS, "client");
    // "Create new client" (label hit) should come before "All clients"
    // (subtitle hit in 'home').
    expect(r[0].id).toBe("new");
  });

  it("returns empty for no matches", () => {
    expect(filterActions(ACTIONS, "xyznonexistent")).toEqual([]);
  });

  it("case-insensitive", () => {
    const r = filterActions(ACTIONS, "BRIEFINGS");
    expect(r.map((a) => a.id)).toContain("brief");
  });

  it("preserves original order among ties", () => {
    const r = filterActions(ACTIONS, "open"); // both tasks + settings are prefix matches
    // Tasks comes first in the input array, so it ranks first on tie.
    expect(r[0].id).toBe("tasks");
    expect(r[1].id).toBe("settings");
  });
});
