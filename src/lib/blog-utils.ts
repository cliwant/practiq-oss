import type { BlogPost } from "@/data/blog";

export type BlogCategory = "Accounting" | "Law" | "Consulting" | "HR" | "Agency" | "General";

const CATEGORY_RULES: [BlogCategory, RegExp][] = [
  ["Law", /\blaw\b|\bcaseload\b|\battorney\b|\blegal\b|\bbillable/i],
  ["Consulting", /\bconsulting\b|\bengagement\b|\bboutique\b/i],
  ["HR", /\bhr\b|\bhuman resource\b|\bcompliance.*client\b|\bpeo\b/i],
  ["Agency", /\bagency\b|\bmarketing agency\b|\bcreative\b|\bbrand guideline/i],
  ["Accounting", /\baccounting\b|\btax\b|\bcpa\b|\bquickbooks\b|\bbookkeep\b|\bbusy season\b|\baudit\b/i],
];

export function deriveCategory(post: { tags: string[]; title: string; slug: string }): BlogCategory {
  const text = [...post.tags, post.title, post.slug].join(" ").toLowerCase();
  for (const [cat, regex] of CATEGORY_RULES) {
    if (regex.test(text)) return cat;
  }
  return "General";
}

export interface BlogPostWithCategory extends BlogPost {
  category: BlogCategory;
}

export function enrichPosts(posts: BlogPost[]): BlogPostWithCategory[] {
  return posts.map((p) => ({ ...p, category: deriveCategory(p) }));
}

export const ALL_CATEGORIES: BlogCategory[] = [
  "Accounting",
  "Law",
  "Consulting",
  "HR",
  "Agency",
  "General",
];
