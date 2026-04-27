/**
 * HTML → Markdown converter for the blog post Markdown companion routes.
 *
 * Blog posts in src/data/blog/posts/*.ts ship as raw HTML strings (the
 * `content` field), not MDX. To serve a Markdown variant we walk the
 * HTML and emit the equivalent Markdown. We deliberately keep the
 * transformer simple — no full DOM parser, no ASTs — because the
 * subset of tags actually used in blog content is small (h2/h3/p/ul/
 * ol/li/strong/em/a/code/pre/blockquote/figure/img). A 200-line
 * regex-based converter is right-sized for this purpose; reaching for
 * a full library (turndown, etc.) would add 50KB of dependency for
 * one route handler.
 *
 * Output is Pandoc-compatible Markdown so AI agents that re-render
 * (e.g. an Anthropic crawler converting to plaintext for indexing)
 * get the structure they expect.
 */

/**
 * Strip ALL HTML tags + entities → plain text. Use for cases where
 * the structure of the original HTML doesn't matter (e.g. a single
 * paragraph excerpt).
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * HTML → Markdown. Best-effort. Handles the tag set actually used by
 * Practiq blog posts; falls through to stripped text for anything
 * unusual.
 *
 * We emit:
 *   <h2>X</h2>            → \n## X\n
 *   <h3>X</h3>            → \n### X\n
 *   <p>X</p>              → X\n\n
 *   <strong>X</strong>    → **X**
 *   <em>X</em>            → *X*
 *   <a href="U">X</a>     → [X](U)
 *   <ul><li>X</li></ul>   → - X
 *   <ol><li>X</li></ol>   → 1. X (sequential)
 *   <code>X</code>        → `X`
 *   <pre>X</pre>          → ```\nX\n```
 *   <blockquote>X</...>   → > X (each line)
 *   <figure><img...>      → ![alt](src)
 *   <hr>                  → \n---\n
 *
 * Order matters: pre/code blocks are extracted FIRST so we don't
 * mangle their internals when running paragraph/inline replacements.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  // 1. Extract <pre><code> blocks first — placeholder substitution.
  const codeBlocks: string[] = [];
  let work = html.replace(
    /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_m, body) => {
      const idx = codeBlocks.length;
      codeBlocks.push("```\n" + decodeEntities(body) + "\n```");
      return `__CODE_BLOCK_${idx}__`;
    },
  );

  // 2. Inline code
  work = work.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, body) => {
    return "`" + decodeEntities(stripInlineTags(body)) + "`";
  });

  // 3. Headings (h2 + h3 — h1 is reserved for the Markdown title)
  work = work.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, body) => {
    return `\n\n## ${decodeEntities(stripInlineTags(body)).trim()}\n\n`;
  });
  work = work.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, body) => {
    return `\n\n### ${decodeEntities(stripInlineTags(body)).trim()}\n\n`;
  });
  work = work.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, body) => {
    return `\n\n#### ${decodeEntities(stripInlineTags(body)).trim()}\n\n`;
  });

  // 4. Lists
  work = work.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, body) => {
    const items = (body as string).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    const out: string[] = [];
    for (const it of items) {
      out.push(`- ${decodeEntities(stripInlineTags(it[1])).trim()}`);
    }
    return "\n\n" + out.join("\n") + "\n\n";
  });
  work = work.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, body) => {
    const items = (body as string).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    const out: string[] = [];
    let i = 1;
    for (const it of items) {
      out.push(`${i}. ${decodeEntities(stripInlineTags(it[1])).trim()}`);
      i++;
    }
    return "\n\n" + out.join("\n") + "\n\n";
  });

  // 5. Blockquotes
  work = work.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_m, body) => {
      const lines = decodeEntities(stripInlineTags(body))
        .trim()
        .split(/\n+/)
        .map((l) => `> ${l.trim()}`)
        .join("\n");
      return `\n\n${lines}\n\n`;
    },
  );

  // 6. Figures / images
  work = work.replace(
    /<figure[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>(?:\s*<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?\s*<\/figure>/gi,
    (_m, src, alt, caption) => {
      const captionPart = caption
        ? `\n\n_${decodeEntities(stripInlineTags(caption)).trim()}_`
        : "";
      return `\n\n![${alt}](${src})${captionPart}\n\n`;
    },
  );
  work = work.replace(
    /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    "![$2]($1)",
  );

  // 7. Paragraphs
  work = work.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, body) => {
    return `\n\n${decodeEntities(stripInlineTags(body)).trim()}\n\n`;
  });

  // 8. Horizontal rule
  work = work.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // 9. Inline formatting (any leftover, post block-level extraction)
  work = stripInlineTags(work);
  work = decodeEntities(work);

  // 10. Restore code blocks
  work = work.replace(/__CODE_BLOCK_(\d+)__/g, (_m, idx) => {
    return "\n\n" + codeBlocks[Number(idx)] + "\n\n";
  });

  // 11. Tidy whitespace — collapse 3+ blank lines, trim outer.
  return work.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Strip a small set of inline tags, converting them to their Markdown
 * equivalents. Anything not handled is removed (so stray <span> /
 * <div> wrappers don't leak into the output).
 */
function stripInlineTags(html: string): string {
  return html
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(
      /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href, text) => `[${(text as string).trim()}](${href})`,
    )
    .replace(/<br\s*\/?>/gi, "  \n")
    .replace(/<[^>]+>/g, "");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
