import { describe, it, expect } from "vitest";
import {
  welcomeEmail,
  teamInviteEmail,
  passwordResetEmail,
  verifyEmail,
  briefingSummaryEmail,
} from "./templates";

/**
 * Template tests cover: non-empty subject/html/text, CTA URL safety,
 * HTML escape of user-controlled fields, and critical copy correctness.
 */

describe("welcomeEmail", () => {
  it("renders subject with first name when provided", () => {
    const m = welcomeEmail({ firstName: "Jennifer", firmVertical: "accounting" });
    expect(m.subject).toBe("Welcome to Practiq, Jennifer");
    expect(m.html).toContain("Jennifer");
    expect(m.text).toContain("Jennifer");
  });

  it("falls back without a name", () => {
    const m = welcomeEmail({ firstName: "" });
    expect(m.subject).toBe("Welcome to Practiq");
  });

  it("customizes vertical phrasing", () => {
    const m = welcomeEmail({ firstName: "Alex", firmVertical: "law" });
    expect(m.text.toLowerCase()).toContain("legal");
  });

  it("emits both html and text bodies", () => {
    const m = welcomeEmail({ firstName: "X" });
    expect(m.html.length).toBeGreaterThan(200);
    expect(m.text.length).toBeGreaterThan(50);
  });
});

describe("teamInviteEmail", () => {
  it("uses inviter name + email when provided", () => {
    const m = teamInviteEmail({
      inviterName: "Jennifer",
      inviterEmail: "j@park.com",
      firmName: "Park Accounting",
      role: "member",
      acceptUrl: "https://practiq.dev/signup?invite=abc",
      expiresAt: new Date("2026-05-01T00:00:00Z"),
    });
    expect(m.subject).toContain("Jennifer");
    expect(m.subject).toContain("j@park.com");
    expect(m.html).toContain("Park Accounting");
    expect(m.html).toContain("https://practiq.dev/signup?invite=abc");
  });

  it("gracefully handles null name", () => {
    const m = teamInviteEmail({
      inviterName: null,
      inviterEmail: "sender@firm.com",
      firmName: null,
      role: "viewer",
      acceptUrl: "https://practiq.dev/signup?invite=xyz",
      expiresAt: new Date("2026-05-01"),
    });
    expect(m.subject).toContain("sender@firm.com");
    expect(m.html).toContain("viewer");
  });

  it("escapes HTML in firm name to prevent injection", () => {
    const m = teamInviteEmail({
      inviterName: "X",
      inviterEmail: "x@y.com",
      firmName: "<script>alert(1)</script>",
      role: "member",
      acceptUrl: "https://practiq.dev/signup?invite=t",
      expiresAt: new Date("2026-05-01"),
    });
    expect(m.html).not.toContain("<script>alert(1)</script>");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

describe("passwordResetEmail", () => {
  it("includes the reset URL as a CTA", () => {
    const m = passwordResetEmail({
      resetUrl: "https://practiq.dev/reset-password/abc123",
      expiresAt: new Date("2026-04-24T10:00:00Z"),
    });
    expect(m.html).toContain("https://practiq.dev/reset-password/abc123");
    expect(m.text).toContain("https://practiq.dev/reset-password/abc123");
  });

  it("subject is security-friendly", () => {
    const m = passwordResetEmail({
      resetUrl: "x",
      expiresAt: new Date(),
    });
    expect(m.subject).toMatch(/reset/i);
  });

  it("warns not to share the link", () => {
    const m = passwordResetEmail({
      resetUrl: "x",
      expiresAt: new Date(),
    });
    expect(m.text.toLowerCase()).toMatch(/never share|don't share/);
  });
});

describe("verifyEmail", () => {
  it("includes verification link", () => {
    const m = verifyEmail({
      verifyUrl: "https://practiq.dev/verify-email/tok_xyz",
      expiresAt: new Date("2026-04-25"),
    });
    expect(m.html).toContain("/verify-email/tok_xyz");
  });
});

describe("briefingSummaryEmail", () => {
  it("shows pending + high-priority counts", () => {
    const m = briefingSummaryEmail({
      firstName: "Jennifer",
      pendingCount: 7,
      highPriorityCount: 2,
      topItems: [
        { title: "Draft April investor update", clientName: "TechStart Inc." },
        { title: "Review A/P balance", clientName: "Kim's Restaurant" },
      ],
    });
    expect(m.subject).toContain("7");
    expect(m.text).toContain("TechStart Inc.");
    expect(m.text).toContain("Kim");
    expect(m.text).toContain("2");
  });

  it("truncates to top 5 items", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      title: `Item ${i}`,
      clientName: `Client ${i}`,
    }));
    const m = briefingSummaryEmail({
      firstName: "Op",
      pendingCount: 10,
      highPriorityCount: 3,
      topItems: many,
    });
    // Item 5-9 should NOT appear (zero-indexed top 5 = 0-4).
    expect(m.text).toContain("Item 0");
    expect(m.text).toContain("Item 4");
    expect(m.text).not.toContain("Item 5");
  });
});
