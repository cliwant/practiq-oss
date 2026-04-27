/**
 * P5-05 — Every blog post advertised in the sitemap is reachable as
 * Markdown via the canonical `.md` route, with a YAML frontmatter
 * block and a `canonical:` link.
 *
 * The smoke suite (smoke.spec.ts test 15) checks ONE markdown route to
 * make sure the surface exists. This spec scales out to assert the
 * invariant holds for every published post — so a CMS regression that
 * silently breaks the AEO surface for, say, 9 of 14 posts surfaces
 * before LLMs lose those URLs from their index.
 *
 * Skips automatically if the sitemap returns no /blog/ URLs (e.g. a
 * preview deploy with the post directory pruned).
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

interface BlogUrlEntry {
  url: string;
  slug: string;
}

/**
 * Pull every <loc>…/blog/{slug}</loc> entry from the sitemap.
 * Returns the URL + the trailing slug so we can build the .md route
 * without re-parsing it later.
 */
function extractBlogUrls(sitemapXml: string): BlogUrlEntry[] {
  const re = /<loc>(https?:\/\/[^<]+\/blog\/([a-z0-9-]+))<\/loc>/g;
  const out: BlogUrlEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sitemapXml)) !== null) {
    out.push({ url: m[1], slug: m[2] });
  }
  return out;
}

test.describe("markdown-content", () => {
  let blogUrls: BlogUrlEntry[] = [];

  test.beforeAll(async ({ request }) => {
    const r = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(r.status(), `sitemap.xml at ${BASE_URL} should be 200`).toBe(200);
    const body = await r.text();
    blogUrls = extractBlogUrls(body);
    if (blogUrls.length === 0) {
      console.warn(
        `[markdown-content] sitemap at ${BASE_URL} contains no /blog/ URLs — markdown spec will skip every test.`,
      );
    }
  });

  test("01 — sitemap surfaces at least one blog post", async () => {
    expect(blogUrls.length).toBeGreaterThan(0);
  });

  test("02 — every blog .md route returns 200 + text/markdown + frontmatter + canonical", async ({
    request,
  }) => {
    // Sequential GETs against a serverless deploy can take a few seconds
    // per cold-started function; bump the per-test timeout proportional
    // to MAX_TO_CHECK so we don't flake on large blog catalogs.
    test.setTimeout(180_000);

    test.skip(
      blogUrls.length === 0,
      "no /blog/ URLs in sitemap — nothing to validate",
    );

    // Allow the spec to test up to 50 markdown routes per run; production
    // currently has ~14, but a future content burst shouldn't push the
    // wall-clock past the inflated timeout above. We track per-URL
    // failures and assert at the end so a single 404 doesn't mask other
    // regressions.
    const MAX_TO_CHECK = 50;
    const candidates = blogUrls.slice(0, MAX_TO_CHECK);

    interface Failure {
      slug: string;
      reason: string;
    }
    const failures: Failure[] = [];

    for (const { url, slug } of candidates) {
      const mdUrl = `${url}.md`;
      const r = await request.get(mdUrl);

      if (r.status() !== 200) {
        failures.push({ slug, reason: `status=${r.status()}` });
        continue;
      }

      const ct = r.headers()["content-type"] ?? "";
      if (!ct.includes("text/markdown")) {
        failures.push({
          slug,
          reason: `content-type="${ct}" does not include text/markdown`,
        });
        continue;
      }

      const body = await r.text();
      if (body.trim().length === 0) {
        failures.push({ slug, reason: "empty body" });
        continue;
      }
      if (!/^---/m.test(body)) {
        failures.push({ slug, reason: "missing leading --- frontmatter" });
        continue;
      }
      if (!/canonical:/i.test(body)) {
        failures.push({ slug, reason: "missing `canonical:` line" });
        continue;
      }
    }

    if (failures.length > 0) {
      const summary = failures
        .map((f) => `  • ${f.slug} — ${f.reason}`)
        .join("\n");
      throw new Error(
        `${failures.length} of ${candidates.length} blog .md routes failed validation:\n${summary}`,
      );
    }

    // Sanity floor: prod is intentionally above zero. A successful run with
    // candidates.length=0 would have already skipped above.
    expect(candidates.length).toBeGreaterThanOrEqual(1);
  });
});
