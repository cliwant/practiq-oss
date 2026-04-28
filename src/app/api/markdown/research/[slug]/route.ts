/**
 * Markdown companion route for research datasets (P3-02).
 *
 * Serves a plain-Markdown projection of the dataset content at
 * `/research/<slug>.md` (via middleware rewrite). Same rationale as
 * the blog markdown route — LLM crawlers prefer Markdown, and a
 * dataset's structural fields are particularly easy to extract from
 * plain text vs the rendered React page.
 *
 * The Markdown body is built directly from the DatasetContent shape
 * in `/data/research/datasets.ts`, so it stays in sync without a
 * separate copy of the prose.
 */
import {
  RESEARCH_DATASETS,
  RESEARCH_DATASET_SLUGS,
  getDataset,
  type DatasetContent,
} from "@/data/research/datasets";
import { SITE_URL } from "@/lib/seo/json-ld";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateStaticParams() {
  return RESEARCH_DATASET_SLUGS.map((slug) => ({ slug }));
}

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const dataset = getDataset(slug);
  if (!dataset) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const body = renderDatasetMarkdown(dataset);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // 1h browser cache; CDN cached longer (vercel default).
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      // Mirror the canonical link as a header for clients that don't
      // parse YAML frontmatter.
      Link: `<${SITE_URL}/research/${dataset.slug}>; rel="canonical"`,
    },
  });
}

function renderDatasetMarkdown(d: DatasetContent): string {
  const url = `${SITE_URL}/research/${d.slug}`;
  const lines: string[] = [];
  // YAML frontmatter — same shape as the blog markdown route uses.
  lines.push("---");
  lines.push(`title: "${escapeYaml(d.title)}"`);
  lines.push(`canonical: ${url}`);
  lines.push(`type: dataset`);
  lines.push(`license: CC-BY-4.0`);
  lines.push(`identifier: practiq-research-${d.slug}`);
  lines.push(`datePublished: ${d.schema.datePublished}`);
  lines.push(`dateModified: ${d.schema.dateModified}`);
  lines.push("keywords:");
  for (const k of d.schema.keywords) lines.push(`  - ${k}`);
  lines.push("---");
  lines.push("");

  lines.push(`# ${d.title}`);
  lines.push("");
  lines.push(`> **${d.headline.value} ${d.headline.unit}** — ${d.headline.label}`);
  lines.push("");

  lines.push("## Abstract");
  lines.push("");
  for (const para of d.abstract.split("\n\n")) {
    lines.push(para.replace(/\*\*/g, "**"));
    lines.push("");
  }

  lines.push("## Breakdown");
  lines.push("");
  lines.push("| " + d.table.columns.join(" | ") + " |");
  lines.push("|" + d.table.columns.map(() => "---").join("|") + "|");
  for (const row of d.table.rows) {
    lines.push("| " + row.map((c) => String(c)).join(" | ") + " |");
  }
  if (d.table.notes && d.table.notes.length > 0) {
    lines.push("");
    for (const note of d.table.notes) {
      lines.push(`- ${note}`);
    }
  }
  lines.push("");

  lines.push("## Methodology");
  lines.push("");
  for (const para of d.methodology) {
    lines.push(para);
    lines.push("");
  }

  lines.push("## Implications");
  lines.push("");
  for (const impl of d.implications) {
    lines.push(`- ${impl}`);
  }
  lines.push("");

  lines.push("## Citation");
  lines.push("");
  lines.push("```");
  lines.push(d.schema.citation);
  lines.push("```");
  lines.push("");

  lines.push("## Sources");
  lines.push("");
  for (const s of d.sources) {
    if (s.url) {
      lines.push(`- [${s.label}](${s.url})${s.note ? ` — ${s.note}` : ""}`);
    } else {
      lines.push(`- ${s.label}${s.note ? ` — ${s.note}` : ""}`);
    }
  }
  lines.push("");

  // Cross-link to other datasets for crawler discovery.
  const others = RESEARCH_DATASETS.filter((x) => x.slug !== d.slug);
  if (others.length > 0) {
    lines.push("## Related datasets");
    lines.push("");
    for (const o of others) {
      lines.push(
        `- [${o.title}](${SITE_URL}/research/${o.slug}) — ${o.headline.value} ${o.headline.unit}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function escapeYaml(s: string): string {
  return s.replace(/"/g, '\\"');
}
