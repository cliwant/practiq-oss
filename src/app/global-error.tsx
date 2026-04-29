"use client";

/**
 * Root error boundary for the entire app. Renders if a component throws
 * during root layout itself (e.g. a missing provider, a font-load
 * failure, an Anthropic API timeout in a global server component).
 *
 * Next.js renders this OUTSIDE the root layout chrome, so it must
 * supply its own <html> + <body>. The styling is intentionally minimal
 * — no dependencies on Tailwind or Plus Jakarta Sans because either
 * could be the cause of the failure. We get the visitor enough info
 * to either retry or click out.
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          color: "#f4f4f5",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "520px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#f4f4f5",
              color: "#09090b",
              fontSize: "28px",
              fontWeight: 900,
              marginBottom: "32px",
            }}
          >
            P
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>
            Something broke at the root.
          </h1>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "14px",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            We&apos;ve been told. Try again, and if it keeps happening reach us at{" "}
            <a
              href="mailto:hello@practiq.dev"
              style={{ color: "#e4e4e7", textDecoration: "underline" }}
            >
              hello@practiq.dev
            </a>
            {error?.digest ? (
              <>
                {" "}
                — the trace id is <code style={{ color: "#71717a" }}>{error.digest}</code>.
              </>
            ) : (
              "."
            )}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 24px",
              background: "#f4f4f5",
              color: "#09090b",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
