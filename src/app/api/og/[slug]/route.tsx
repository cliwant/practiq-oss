import { ImageResponse } from "next/og";
import { getOgConfig } from "@/lib/og/registry";

// Programmatic per-surface OG image generator. Returns a 1200x630 PNG
// rendered server-side with JSX. The visual system intentionally mirrors
// the file-based opengraph-image.tsx at /for/[vertical] so brand reads
// as one across every surface (logo block, dark zinc canvas, accent
// pill, oversized headline).
//
// Runs on the edge runtime; Vercel caches the rendered PNG so the
// per-request render cost is paid only on the first crawl of each slug.

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 } as const;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const config = getOgConfig(slug);

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
        {/* Top row: P-mark + Practiq wordmark + accent badge */}
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
              backgroundColor: config.accentBg,
              color: config.accentFg,
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {config.badge}
          </div>
        </div>

        {/* Headline */}
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
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div
              style={{
                color: "#f4f4f5",
                fontSize: "68px",
                fontWeight: 900,
                letterSpacing: "-0.035em",
                lineHeight: 1.05,
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {config.title}
            </div>
            {config.subtitle ? (
              <div
                style={{
                  color: "#a1a1aa",
                  fontSize: "26px",
                  fontWeight: 500,
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {config.subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom row: domain */}
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
    { ...SIZE },
  );
}
