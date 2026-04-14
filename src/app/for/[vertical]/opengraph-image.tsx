import { ImageResponse } from "next/og";

// Vertical-hub OG image. Next.js convention file — generates a 1200×630 PNG
// for /for/[vertical] links when unfurled on social / chat platforms.
//
// We keep the visual system identical to the blog OG image (same P-mark,
// same dark background, same typography stack) so the brand reads as one.
// The only thing that varies per vertical is the accent color on the
// category-style badge and the headline copy.

export const alt = "Practiq for professional services firms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Keep these five in lockstep with VERTICALS in src/app/for/[vertical]/page.tsx.
const VERTICALS: Record<
  string,
  { label: string; headline: string; bg: string; fg: string }
> = {
  accounting: {
    label: "For accounting firms",
    headline:
      "Manage 50 clients with the memory of one.",
    bg: "#064e3b",
    fg: "#6ee7b7",
  },
  law: {
    label: "For law firms",
    headline:
      "The practice management surface small firms actually wanted.",
    bg: "#1e3a8a",
    fg: "#93c5fd",
  },
  consulting: {
    label: "For consulting firms",
    headline:
      "The engagement workspace boutiques keep rebuilding in Notion.",
    bg: "#3b0764",
    fg: "#d8b4fe",
  },
  hr: {
    label: "For HR advisory firms",
    headline:
      "The shared memory layer every HR advisory firm eventually needs.",
    bg: "#831843",
    fg: "#f9a8d4",
  },
  agency: {
    label: "For agencies",
    headline:
      "The agency workspace you keep trying to build in Notion and Slack.",
    bg: "#7c2d12",
    fg: "#fdba74",
  },
};

export async function generateStaticParams() {
  return Object.keys(VERTICALS).map((vertical) => ({ vertical }));
}

interface Props {
  params: { vertical: string };
}

export default async function Image({ params }: Props) {
  const config = VERTICALS[params.vertical] ?? {
    label: "For professional services firms",
    headline: "Manage 50 clients with the memory of one.",
    bg: "#27272a",
    fg: "#d4d4d8",
  };

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
        {/* ── Top row: logo + vertical label ─────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "16px" }}
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: config.bg,
              color: config.fg,
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {config.label}
          </div>
        </div>

        {/* ── Headline ───────────────────────────────────────────── */}
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
              fontSize: "72px",
              fontWeight: 900,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {config.headline}
          </div>
        </div>

        {/* ── Bottom row: domain ────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: "#a1a1aa",
            fontSize: "22px",
            fontWeight: 600,
            borderTop: "1px solid #27272a",
            paddingTop: "28px",
          }}
        >
          practiq.dev
        </div>
      </div>
    ),
    { ...size },
  );
}
