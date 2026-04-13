import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOCS_SECTIONS, type DocsPage, type DocsSection } from "@/data/docs";

interface Props {
  params: Promise<{ slug: string[] }>;
}

interface FlatEntry {
  section: DocsSection;
  page: DocsPage;
}

const flatPages: FlatEntry[] = DOCS_SECTIONS.flatMap((section) =>
  section.pages.map((page) => ({ section, page }))
);

function findMatch(slug: string[]): FlatEntry | null {
  if (slug.length !== 2) return null;
  const [sectionSlug, pageSlug] = slug;
  const section = DOCS_SECTIONS.find((s) => s.slug === sectionSlug);
  if (!section) return null;
  const page = section.pages.find((p) => p.slug === pageSlug);
  if (!page) return null;
  return { section, page };
}

export async function generateStaticParams() {
  return flatPages.map(({ section, page }) => ({
    slug: [section.slug, page.slug],
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const match = findMatch(slug);
  if (!match) return {};
  const { section, page } = match;
  const canonical = `https://practiq.dev/docs/${section.slug}/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical },
    openGraph: {
      title: `${page.title} | Practiq Docs`,
      description: page.description,
      type: "article",
      url: canonical,
      siteName: "Practiq",
    },
    twitter: {
      card: "summary",
      title: `${page.title} | Practiq Docs`,
      description: page.description,
    },
  };
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;

  // /docs/[section] — redirect to the first page in that section
  if (slug.length === 1) {
    const section = DOCS_SECTIONS.find((s) => s.slug === slug[0]);
    if (!section || section.pages.length === 0) notFound();
    redirect(`/docs/${section.slug}/${section.pages[0].slug}`);
  }

  if (slug.length !== 2) notFound();

  const match = findMatch(slug);
  if (!match) notFound();
  const { section, page } = match;

  const index = flatPages.findIndex(
    (entry) =>
      entry.section.slug === section.slug && entry.page.slug === page.slug
  );
  const prev = index > 0 ? flatPages[index - 1] : null;
  const next =
    index >= 0 && index < flatPages.length - 1 ? flatPages[index + 1] : null;

  const canonical = `https://practiq.dev/docs/${section.slug}/${page.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: canonical,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "Practiq Docs",
      url: "https://practiq.dev/docs",
    },
    author: {
      "@type": "Organization",
      name: "Practiq",
      url: "https://practiq.dev",
    },
    publisher: {
      "@type": "Organization",
      name: "Practiq",
      url: "https://practiq.dev",
    },
    articleSection: section.title,
  };

  return (
    <article className="max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-xs text-zinc-500">
          <li>
            <Link href="/docs" className="hover:text-zinc-300 transition-colors">
              Docs
            </Link>
          </li>
          <li aria-hidden="true" className="text-zinc-700">
            /
          </li>
          <li className="text-zinc-400">{section.title}</li>
        </ol>
      </nav>

      <header className="mb-10">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
          {section.title}
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
          {page.title}
        </h1>
        <p className="text-base text-zinc-400 leading-relaxed">
          {page.description}
        </p>
      </header>

      <div
        className="prose-dark"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />

      <nav
        aria-label="Documentation pagination"
        className="mt-16 pt-8 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {prev ? (
          <Link
            href={`/docs/${prev.section.slug}/${prev.page.slug}`}
            className="group bento-card p-5 flex flex-col gap-2 hover:border-zinc-600 transition-all"
          >
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              <ArrowLeft className="w-3 h-3" />
              Previous
            </span>
            <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
              {prev.page.title}
            </span>
            <span className="text-xs text-zinc-500">{prev.section.title}</span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/docs/${next.section.slug}/${next.page.slug}`}
            className="group bento-card p-5 flex flex-col gap-2 text-right hover:border-zinc-600 transition-all sm:items-end"
          >
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Next
              <ArrowRight className="w-3 h-3" />
            </span>
            <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
              {next.page.title}
            </span>
            <span className="text-xs text-zinc-500">{next.section.title}</span>
          </Link>
        ) : (
          <div />
        )}
      </nav>

      <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl border border-border-subtle bg-zinc-900/30">
        <div>
          <div className="text-sm font-bold text-zinc-200">
            Ready to try Practiq?
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            Early access is open for boutique professional services firms.
          </div>
        </div>
        <Link
          href="/#cta"
          className="btn-premium inline-flex items-center gap-2 py-3 px-6 text-xs shrink-0 self-start sm:self-auto"
        >
          Request Early Access
        </Link>
      </div>
    </article>
  );
}
