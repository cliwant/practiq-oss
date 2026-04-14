import { ImageResponse } from "next/og";
import { BLOG_POSTS } from "@/data/blog";
import type { BlogCategory } from "@/data/blog";

// Next.js 15 convention file — this becomes the Open Graph image for
// `/blog/[slug]`. We don't bundle a custom font here: ImageResponse falls
// back to a reasonable system sans that renders clearly at 1200×630, and
// keeping the runtime lightweight means fast static generation at build.
// If we later decide brand consistency requires Plus Jakarta Sans, we can
// load it via `fetch` + the `fonts` option — deferred for now to avoid
// a network hop on every build and to keep the route self-contained.

export const alt = "Practiq blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generate one static OG image per post at build time.
export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

// Per-category accent colors. Matches the general palette of the dark theme
// (muted, non-screaming) so the image reads as Practiq-branded and not
// as a generic social card.
const CATEGORY_COLORS: Record<BlogCategory, { bg: string; fg: string }> = {
  Accounting: { bg: "#064e3b", fg: "#6ee7b7" }, // emerald
  Law: { bg: "#1e3a8a", fg: "#93c5fd" }, // blue
  Consulting: { bg: "#3b0764", fg: "#d8b4fe" }, // purple
  HR: { bg: "#831843", fg: "#f9a8d4" }, // rose
  Agency: { bg: "#7c2d12", fg: "#fdba74" }, // orange
  General: { bg: "#27272a", fg: "#d4d4d8" }, // zinc
};

interface Props {
  params: { slug: string };
}

export default async function Image({ params }: Props) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);

  // Fallback — if a slug is requested that isn't a real post, return the
  // default brand card rather than 404'ing the social fetch.
  const title = post?.title ?? "Practiq";
  const author = post?.author ?? "Practiq";
  const readingTime = post?.readingTime ?? "";
  const dateStr = post?.date
    ? new Date(post.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const category: BlogCategory = post?.category ?? "General";
  const colors = CATEGORY_COLORS[category];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#050505",
          padding: "72px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* ── Top row: logo + category badge ─────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* P-mark — white rounded square with black P */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "#f4f4f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#050505",
                fontSize: "36px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              P
            </div>
            <div
              style={{
                color: "#f4f4f5",
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Practiq
            </div>
          </div>

          {/* Category badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: colors.bg,
              color: colors.fg,
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {category}
          </div>
        </div>

        {/* ── Title ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            marginTop: "48px",
          }}
        >
          <div
            style={{
              color: "#f4f4f5",
              fontSize: "64px",
              fontWeight: 900,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              // Soft visual cap at three lines — system-ui will wrap cleanly
              // on 1200px of width for titles up to ~120 chars. Most of our
              // posts land well under that.
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>

        {/* ── Bottom row: author · reading time · date ──────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "#a1a1aa",
            fontSize: "22px",
            fontWeight: 500,
            borderTop: "1px solid #27272a",
            paddingTop: "28px",
          }}
        >
          <span style={{ color: "#e4e4e7", fontWeight: 700 }}>{author}</span>
          {readingTime ? (
            <>
              <span style={{ color: "#52525b" }}>·</span>
              <span>{readingTime}</span>
            </>
          ) : null}
          {dateStr ? (
            <>
              <span style={{ color: "#52525b" }}>·</span>
              <span>{dateStr}</span>
            </>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
