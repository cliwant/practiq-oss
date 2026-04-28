export type BlogCategory = 'Accounting' | 'Law' | 'Consulting' | 'HR' | 'Agency' | 'General';

export interface BlogPost {
  slug: string;
  title: string;
  /** ISO date for first publish. Mirrors `Article.datePublished`. */
  date: string;
  /**
   * RUN 22 (AEO/GEO): explicit `dateModified` for AI-citation freshness
   * signals. When omitted, falls back to `date`. Bump whenever the
   * post's facts or numbers change so AI engines treat the post as
   * actively maintained.
   */
  dateModified?: string;
  /**
   * RUN 22 (AEO/GEO): operator's last verification of the cited
   * facts. Surfaced in `last_verified:` frontmatter for AI crawlers
   * that weight recency. When omitted, equals `date`.
   */
  lastVerified?: string;
  author: string;
  excerpt: string;
  content: string;
  tags: string[];
  readingTime: string;
  ogDescription: string;
  category: BlogCategory;
  /**
   * RUN 22 (AEO/GEO): standalone "key takeaways" bullets shown at the
   * top of the post + emitted as the JSON-LD `Article.abstract`.
   * Citation engines (especially AI Overviews + Perplexity) treat
   * this as the standalone-summary snippet that's +30-40% more
   * likely to be quoted directly. Authors should write 3-5 bullets
   * that stand on their own.
   */
  keyTakeaways?: string[];
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  readingTime: string;
  ogDescription: string;
  category: BlogCategory;
}
