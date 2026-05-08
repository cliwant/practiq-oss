import { describe, it, expect } from "vitest";
import { businessDaysBetween } from "@/lib/outreach/business-days";
import {
  applyAndDescribeUpdates,
  type TrackerRow,
  type TrackerUpdate,
} from "@/lib/outreach/tracker-csv";
import {
  statusForCategory,
  urgencyTier,
  type ReplyClassification,
} from "@/lib/outreach/reply-classifier";
import {
  buildInThreadRawReply,
  decodeBase64Url,
  encodeBase64Url,
  parseEmailAddress,
} from "@/lib/outreach/gmail-reply-helpers";

describe("businessDaysBetween", () => {
  it("counts weekdays only", () => {
    // 2026-05-08 (Fri) → 2026-05-12 (Tue) = 2 business days (Mon + Tue)
    const fri = new Date("2026-05-08T15:00:00Z");
    const tue = new Date("2026-05-12T15:00:00Z");
    expect(businessDaysBetween(fri, tue)).toBe(2);
  });

  it("excludes Memorial Day (2026-05-25)", () => {
    // 2026-05-22 (Fri) → 2026-05-27 (Wed) = 2 business days (Tue + Wed),
    // skipping Sat 23, Sun 24, Memorial Day Mon 25.
    const fri = new Date("2026-05-22T15:00:00Z");
    const wed = new Date("2026-05-27T15:00:00Z");
    expect(businessDaysBetween(fri, wed)).toBe(2);
  });

  it("returns 0 when end <= start", () => {
    const a = new Date("2026-05-15T00:00:00Z");
    const b = new Date("2026-05-15T00:00:00Z");
    expect(businessDaysBetween(a, b)).toBe(0);
    expect(businessDaysBetween(b, a)).toBe(0);
  });

  it("4 business days from a Monday is Friday", () => {
    const mon = new Date("2026-05-11T15:00:00Z");
    const fri = new Date("2026-05-15T15:00:00Z");
    expect(businessDaysBetween(mon, fri)).toBe(4);
  });
});

describe("statusForCategory", () => {
  it("maps interested → in_conversation", () => {
    expect(statusForCategory("interested", "new")).toBe("in_conversation");
    expect(statusForCategory("book_demo", "")).toBe("in_conversation");
    expect(statusForCategory("clarifying_q", "")).toBe("in_conversation");
  });
  it("maps soft pass → deprioritized", () => {
    expect(statusForCategory("not_now", "")).toBe("deprioritized");
  });
  it("maps hard pass / unsubscribe → closed_lost", () => {
    expect(statusForCategory("not_interested", "")).toBe("closed_lost");
    expect(statusForCategory("unsubscribe", "")).toBe("closed_lost");
  });
  it("maps bounced → bounced", () => {
    expect(statusForCategory("bounced", "")).toBe("bounced");
  });
  it("maps OOO → keeps current status", () => {
    expect(statusForCategory("out_of_office", "in_conversation")).toBe(
      "in_conversation"
    );
    expect(statusForCategory("out_of_office", "")).toBe("in_conversation");
  });
});

describe("urgencyTier", () => {
  const baseClassification = (overrides: Partial<ReplyClassification>): ReplyClassification => ({
    category: "other",
    summary: "",
    suggested_response: "",
    confidence: 0.9,
    ...overrides,
  });
  it("treats interested as hot", () => {
    expect(urgencyTier(baseClassification({ category: "interested" }))).toBe(
      "hot"
    );
  });
  it("treats book_demo as hot", () => {
    expect(urgencyTier(baseClassification({ category: "book_demo" }))).toBe(
      "hot"
    );
  });
  it("clarifying_q with high confidence is hot", () => {
    expect(
      urgencyTier(
        baseClassification({ category: "clarifying_q", confidence: 0.85 })
      )
    ).toBe("hot");
  });
  it("clarifying_q with low confidence is neutral", () => {
    expect(
      urgencyTier(
        baseClassification({ category: "clarifying_q", confidence: 0.5 })
      )
    ).toBe("neutral");
  });
  it("not_interested is negative", () => {
    expect(urgencyTier(baseClassification({ category: "not_interested" }))).toBe(
      "negative"
    );
  });
});

describe("applyAndDescribeUpdates", () => {
  const blankRow = (overrides: Partial<TrackerRow>): TrackerRow => ({
    firm_name: "",
    contact_name: "",
    contact_role: "",
    contact_email: "",
    linkedin_url: "",
    firm_size: "",
    city: "",
    state: "",
    vertical: "",
    signal: "",
    scored_priority: "",
    batch_assigned: "",
    sent_initial_at: "",
    sent_followup1_at: "",
    sent_followup2_at: "",
    last_response_at: "",
    response_type: "",
    status: "new",
    zoom_booked_at: "",
    zoom_held_at: "",
    zoom_outcome: "",
    design_partner_decision: "",
    notes: "",
    ...overrides,
  });

  it("matches by lower-cased email and reports diff lines", () => {
    const rows = [
      blankRow({
        firm_name: "Acme",
        contact_email: "Owner@Acme.com",
        status: "new",
      }),
    ];
    const updates: TrackerUpdate[] = [
      {
        contact_email: "owner@acme.com",
        fields: {
          last_response_at: "2026-05-10T12:00:00Z",
          response_type: "interested",
          status: "in_conversation",
        },
      },
    ];
    const out = applyAndDescribeUpdates(rows, updates);
    expect(out.unmatched).toEqual([]);
    expect(out.updatedRows).toHaveLength(1);
    expect(out.updatedRows[0].status).toBe("in_conversation");
    expect(out.describe).toContain("Acme");
    expect(out.describe).toContain('status: "new" → "in_conversation"');
  });

  it("reports unmatched emails", () => {
    const rows = [blankRow({ contact_email: "owner@acme.com" })];
    const updates: TrackerUpdate[] = [
      { contact_email: "ghost@nowhere.com", fields: { status: "bounced" } },
    ];
    const out = applyAndDescribeUpdates(rows, updates);
    expect(out.unmatched).toEqual(["ghost@nowhere.com"]);
    expect(out.updatedRows).toHaveLength(0);
  });
});

describe("gmail-reply-helpers utilities", () => {
  it("parseEmailAddress strips name + lowercases", () => {
    expect(parseEmailAddress("Patrick Thomas <Patrick@TZLcpas.com>")).toBe(
      "patrick@tzlcpas.com"
    );
    expect(parseEmailAddress("plain@example.com")).toBe("plain@example.com");
  });

  it("base64url roundtrips utf-8", () => {
    const s = "Hi 안녕 — this is a test reply, friend!";
    const enc = encodeBase64Url(s);
    expect(enc).not.toContain("+");
    expect(enc).not.toContain("/");
    expect(enc).not.toContain("=");
    expect(decodeBase64Url(enc)).toBe(s);
  });

  it("buildInThreadRawReply preserves Re: + sets In-Reply-To/References", () => {
    const raw = buildInThreadRawReply({
      to: "patrick@tzlcpas.com",
      fromAlias: "Seungdo Keum <seungdo.keum@practiq.dev>",
      subject: "tracked-changes memos for tzl tax positions",
      bodyText: "Hi Patrick,\n\nQuick bump on the compilation memos angle…",
      inReplyToMessageIdHeader: "<abc123@mail.gmail.com>",
      referencesHeader: "<old@mail.gmail.com>",
    });
    const decoded = decodeBase64Url(raw);
    expect(decoded).toContain("To: patrick@tzlcpas.com");
    expect(decoded).toContain("From: Seungdo Keum <seungdo.keum@practiq.dev>");
    expect(decoded).toContain(
      "Subject: Re: tracked-changes memos for tzl tax positions"
    );
    expect(decoded).toContain("In-Reply-To: <abc123@mail.gmail.com>");
    expect(decoded).toContain(
      "References: <old@mail.gmail.com> <abc123@mail.gmail.com>"
    );
    expect(decoded).toContain("Quick bump on the compilation memos angle");
  });

  it("buildInThreadRawReply does not double-prefix Re:", () => {
    const raw = buildInThreadRawReply({
      to: "x@y.com",
      fromAlias: "Me <me@me.com>",
      subject: "Re: hello",
      bodyText: "hi",
      inReplyToMessageIdHeader: "<a@b>",
      referencesHeader: "",
    });
    const decoded = decodeBase64Url(raw);
    expect(decoded).toContain("Subject: Re: hello");
    expect(decoded).not.toContain("Subject: Re: Re: hello");
    // Empty References header is acceptable but should still be a single line.
    expect(decoded).toMatch(/References:\s*<a@b>/);
  });
});
