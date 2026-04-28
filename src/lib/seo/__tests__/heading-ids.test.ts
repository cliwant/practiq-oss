/**
 * Unit tests for the auto-id heading slugifier (RUN 22 Phase 2).
 *
 * Pure function lives inline in src/app/blog/[slug]/page.tsx, but
 * the same shape is reusable across other markdown surfaces (vs
 * pages, vertical pages). This test pins the shape so a refactor
 * that extracts it doesn't accidentally drift.
 *
 * We re-implement the function inline here because the original is
 * a private helper inside a Next.js page component (no clean
 * import surface). Behaviour parity is the test contract.
 */
import { describe, it, expect } from "vitest";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(
    /<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      if (/\sid\s*=/.test(attrs)) return _match;
      const text = stripTags(inner).trim();
      if (!text) return _match;
      const baseSlug = slugify(text);
      if (!baseSlug) return _match;
      const seenCount = seen.get(baseSlug) ?? 0;
      const slug = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;
      seen.set(baseSlug, seenCount + 1);
      return `<${tag}${attrs} id="${slug}">${inner}</${tag}>`;
    },
  );
}

describe("slugify", () => {
  it("lowercases + collapses spaces to hyphens", () => {
    expect(slugify("Why Client Memory Matters")).toBe("why-client-memory-matters");
  });
  it("strips punctuation", () => {
    expect(slugify("What's the cost?")).toBe("what-s-the-cost");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("--leading and trailing--")).toBe("leading-and-trailing");
  });
  it("collapses multiple consecutive separators", () => {
    expect(slugify("A    very    spaced   title")).toBe("a-very-spaced-title");
  });
  it("caps slug length at 80 chars", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBe(80);
  });
  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});

describe("addHeadingIds", () => {
  it("adds id to <h2> headings", () => {
    const html = "<h2>Why client memory matters</h2><p>Body…</p>";
    const out = addHeadingIds(html);
    expect(out).toBe(
      `<h2 id="why-client-memory-matters">Why client memory matters</h2><p>Body…</p>`,
    );
  });

  it("adds id to <h3> + <h4> too (not h1, not h5+)", () => {
    const html = "<h1>Top</h1><h3>Sub</h3><h4>Sub-sub</h4><h5>Skip</h5>";
    const out = addHeadingIds(html);
    expect(out).toContain('<h3 id="sub">Sub</h3>');
    expect(out).toContain('<h4 id="sub-sub">Sub-sub</h4>');
    expect(out).toContain("<h1>Top</h1>");
    expect(out).toContain("<h5>Skip</h5>");
  });

  it("idempotent — leaves headings that already have id alone", () => {
    const html = `<h2 id="custom">Already</h2><h2>Fresh</h2>`;
    const out = addHeadingIds(html);
    expect(out).toContain('<h2 id="custom">Already</h2>');
    expect(out).toContain('<h2 id="fresh">Fresh</h2>');
  });

  it("disambiguates duplicate slugs with -2 / -3 suffixes", () => {
    const html =
      "<h2>Conclusion</h2><p>x</p><h2>Conclusion</h2><p>y</p><h2>Conclusion</h2>";
    const out = addHeadingIds(html);
    expect(out.match(/id="conclusion"/g)?.length).toBe(1);
    expect(out.match(/id="conclusion-2"/g)?.length).toBe(1);
    expect(out.match(/id="conclusion-3"/g)?.length).toBe(1);
  });

  it("preserves nested HTML inside the heading", () => {
    const html = `<h2><strong>Bold</strong> intro</h2>`;
    const out = addHeadingIds(html);
    expect(out).toContain('id="bold-intro"');
    expect(out).toContain("<strong>Bold</strong>");
  });

  it("skips headings that strip to empty text", () => {
    const html = `<h2>   </h2>`;
    const out = addHeadingIds(html);
    expect(out).toBe(html);
  });
});
