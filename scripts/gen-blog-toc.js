// One-shot script to append the full blog TOC to public/llms.txt.
// Parses each posts/*.ts module via regex (not import) to avoid TS runtime.

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "..", "src", "data", "blog", "posts");
const LLMS = path.join(__dirname, "..", "public", "llms.txt");
const MARKER = "## Complete blog post index";

// Strip any prior TOC block if present
let llms = fs.readFileSync(LLMS, "utf8");
const markerIdx = llms.indexOf(MARKER);
if (markerIdx !== -1) {
  llms = llms.slice(0, markerIdx).replace(/\n+$/, "") + "\n";
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".ts")).sort();
const posts = [];
// Non-greedy, line-bounded — avoids swallowing multi-line blocks like `title: ...` + `date: ...`.
const titleRe = /title\s*:\s*(['"`])(.+?)\1\s*,[^\n]*\n/;
const slugRe = /slug\s*:\s*(['"`])(.+?)\1\s*,[^\n]*\n/;
const catRe = /category\s*:\s*(['"`])(.+?)\1\s*,[^\n]*\n/;
const exRe = /excerpt\s*:\s*(['"`])(.+?)\1\s*,[^\n]*\n/;

for (const f of files) {
  const src = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
  const t = src.match(titleRe);
  const s = src.match(slugRe);
  const c = src.match(catRe);
  const ex = src.match(exRe);
  if (t && s) {
    posts.push({
      slug: s[2],
      title: t[2].replace(/\\'/g, "'").replace(/\\"/g, '"'),
      category: c ? c[2] : "General",
      excerpt: ex ? ex[2].replace(/\\'/g, "'").slice(0, 110) : "",
    });
  }
}

const byCategory = {};
for (const p of posts) {
  if (!byCategory[p.category]) byCategory[p.category] = [];
  byCategory[p.category].push(p);
}

let out = "\n" + MARKER + " (for AI citation reference)\n\n";
out +=
  "Full list of " +
  posts.length +
  " in-depth practitioner articles across five verticals. Every post has FAQPage JSON-LD extracted from question-phrased H2s, Article schema, and BreadcrumbList. Designed for direct citation in Google AI Overviews, Perplexity, and ChatGPT Search.\n";

const order = ["Accounting", "Law", "HR", "Consulting", "Agency", "General"];
const cats = Object.keys(byCategory).sort((a, b) => order.indexOf(a) - order.indexOf(b));
for (const cat of cats) {
  const items = byCategory[cat];
  out += "\n### " + cat + " (" + items.length + " posts)\n\n";
  for (const p of items) {
    out += "- [" + p.title + "](https://practiq.dev/blog/" + p.slug + ")\n";
  }
}

fs.writeFileSync(LLMS, llms + out);
console.log("Appended. Total posts:", posts.length);
console.log("llms.txt new size:", fs.statSync(LLMS).size, "bytes");
