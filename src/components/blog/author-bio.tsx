/**
 * AuthorBio — RUN 22 (AEO/GEO Phase 2).
 *
 * Visible author bio block at the bottom of every blog post. Per
 * AEO research, author-authority is one of Claude's strongest
 * citation signals — surfacing the author's name + credential +
 * cross-platform handles helps AI engines build the author-trust
 * graph across our corpus.
 *
 * The bio is rendered both visibly AND emitted via Person JSON-LD
 * with `sameAs` (LinkedIn / X / Substack) so search + AI engines
 * cross-reference us back to the named human.
 *
 * To add a new author: extend the AUTHORS map. Each entry contributes
 * an entry to the Person.sameAs array, the visible bio, and the
 * fallback when only the string name is known.
 */

interface AuthorMeta {
  name: string;
  credential: string;
  bio: string;
  /**
   * Cross-platform identity links the AI uses to triangulate author
   * authority. Only include verified handles — fake sameAs entries
   * are an integrity risk per Google's manual-action policy.
   */
  sameAs: string[];
  avatarUrl?: string;
}

const AUTHORS: Record<string, AuthorMeta> = {
  "Seungdo Keum": {
    name: "Seungdo Keum",
    credential: "Founder, Practiq",
    bio: "Builds AI-native workspaces for boutique professional service firms. Previously: Big-4 strategy + venture-studio CTO. Writes about per-client memory architecture, AEO/GEO craft, and the lovable-mark gate.",
    sameAs: [
      // Add real handles only when verified — `sameAs` with fake
      // links can trigger a Google manual action.
      // "https://www.linkedin.com/in/<handle>",
      // "https://x.com/<handle>",
    ],
  },
  "SD Keum": {
    name: "Seungdo Keum",
    credential: "Founder, Practiq",
    bio: "Builds AI-native workspaces for boutique professional service firms. Previously: Big-4 strategy + venture-studio CTO. Writes about per-client memory architecture, AEO/GEO craft, and the lovable-mark gate.",
    sameAs: [],
  },
};

export function getAuthorMeta(authorName: string): AuthorMeta {
  return (
    AUTHORS[authorName] ?? {
      name: authorName,
      credential: "Contributor, Practiq",
      bio: "",
      sameAs: [],
    }
  );
}

interface AuthorBioProps {
  authorName: string;
  /** When true, uses a compact byline format (top of post). When false,
   *  full bio card (bottom of post). */
  compact?: boolean;
}

export function AuthorBio({ authorName, compact = false }: AuthorBioProps) {
  const meta = getAuthorMeta(authorName);
  if (compact) {
    return (
      <span className="text-zinc-400">
        by{" "}
        <span className="text-zinc-200 font-semibold">{meta.name}</span>
        <span className="text-zinc-400"> · {meta.credential}</span>
      </span>
    );
  }
  return (
    <section
      className="mt-12 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6"
      aria-labelledby="author-bio-heading"
    >
      <h2
        id="author-bio-heading"
        className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3"
      >
        About the author
      </h2>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-zinc-950 font-extrabold text-base shrink-0">
          {meta.name
            .split(" ")
            .map((s) => s[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-[16px] font-extrabold text-zinc-100">
              {meta.name}
            </h3>
            <span className="text-[12px] text-zinc-400">{meta.credential}</span>
          </div>
          {meta.bio.length > 0 && (
            <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-300">
              {meta.bio}
            </p>
          )}
          {meta.sameAs.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-3 text-[12px] text-zinc-400">
              {meta.sameAs.map((url) => {
                const host = (() => {
                  try {
                    return new URL(url).host.replace(/^www\./, "");
                  } catch {
                    return url;
                  }
                })();
                return (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="underline-offset-2 hover:text-zinc-200 hover:underline"
                    >
                      {host}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Build the Person JSON-LD entity emitted alongside Article so AI
 * crawlers cross-reference our author identity. `sameAs` carries the
 * verified cross-platform handles. URL points back to the about page
 * so the entity has a canonical home page.
 */
import { SITE_URL } from "@/lib/seo/json-ld";

export function authorPersonJsonLd(authorName: string): Record<string, unknown> {
  const meta = getAuthorMeta(authorName);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: meta.name,
    jobTitle: meta.credential,
    description: meta.bio,
    url: `${SITE_URL}/about`,
    ...(meta.sameAs.length > 0 ? { sameAs: meta.sameAs } : {}),
    worksFor: { "@id": `${SITE_URL}/#organization` },
  };
}
