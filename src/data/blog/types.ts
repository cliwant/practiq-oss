export type BlogCategory = 'Accounting' | 'Law' | 'Consulting' | 'HR' | 'Agency' | 'General';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  content: string;
  tags: string[];
  readingTime: string;
  ogDescription: string;
  category: BlogCategory;
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
