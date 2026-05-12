/**
 * AI Policy PDF document — rendered server-side via @react-pdf/renderer.
 *
 * The PDF is the takeaway artifact: clean, professionally-typeset,
 * paginated, with a watermarked footer that makes clear the document is
 * a starting draft requiring counsel review.
 *
 * Design constraints:
 *   - Single typeface (Helvetica, built into PDF readers) — no Google
 *     Fonts roundtrip, no Vercel cold-start penalty.
 *   - Print-friendly margins (0.75in on all sides).
 *   - Cover page → preamble → sections → key obligations → review
 *     cycle → footer disclaimer.
 *   - Page numbers + "Generated draft — review with counsel" footer on
 *     every page.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { GeneratedPolicy } from "./types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 64,
    paddingHorizontal: 54,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1f2937",
    lineHeight: 1.5,
  },
  // Cover page
  coverWrap: {
    flexGrow: 1,
    justifyContent: "center",
  },
  coverEyebrow: {
    fontSize: 9,
    color: "#6b7280",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 20,
    lineHeight: 1.2,
  },
  coverFirmBlock: {
    marginTop: 28,
    paddingTop: 16,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
  },
  coverRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  coverRowLabel: {
    width: 100,
    fontSize: 9,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
  },
  coverRowValue: {
    fontSize: 11,
    color: "#1f2937",
    flex: 1,
  },
  coverDraft: {
    marginTop: 48,
    padding: 12,
    backgroundColor: "#fef3c7",
    border: 1,
    borderColor: "#fcd34d",
    borderRadius: 4,
  },
  coverDraftText: {
    fontSize: 9,
    color: "#78350f",
    lineHeight: 1.5,
  },
  // Section headers
  sectionHeading: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 18,
    marginBottom: 8,
  },
  preambleHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 11,
    color: "#1f2937",
    marginBottom: 8,
    lineHeight: 1.55,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 5,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 12,
    fontSize: 11,
    color: "#374151",
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    color: "#1f2937",
    lineHeight: 1.5,
  },
  obligationsBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#f9fafb",
    border: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  reviewCycle: {
    marginTop: 18,
    paddingTop: 12,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 10,
    color: "#4b5563",
    fontStyle: "italic",
  },
  disclaimer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#fef2f2",
    border: 1,
    borderColor: "#fecaca",
    borderRadius: 4,
    fontSize: 9,
    color: "#7f1d1d",
    lineHeight: 1.5,
  },
  // Page footer (fixed)
  footer: {
    position: "absolute",
    bottom: 24,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9ca3af",
    paddingTop: 8,
    borderTop: 1,
    borderTopColor: "#f3f4f6",
  },
  footerLeft: {
    fontSize: 8,
    color: "#9ca3af",
  },
  footerRight: {
    fontSize: 8,
    color: "#9ca3af",
  },
});

interface PolicyPdfProps {
  policy: GeneratedPolicy;
  firmName: string;
  vertical: string;
  generatedOn: string;
}

/**
 * Convert a single line of pseudo-markdown to a Text node. Supports
 * very light formatting:
 *   - lines starting with "- " or "* " or "• " render as bullets
 *   - blank lines render as paragraph breaks
 *
 * We deliberately do NOT support full markdown — the model is
 * instructed to keep bodies simple, and an over-engineered renderer
 * would slow the cold-start.
 */
function renderBody(body: string): React.ReactElement[] {
  const lines = body.split(/\r?\n/);
  const nodes: React.ReactElement[] = [];
  let paragraphBuf: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuf.length > 0) {
      const text = paragraphBuf.join(" ").trim();
      if (text) {
        nodes.push(
          <Text key={`p-${nodes.length}`} style={styles.paragraph}>
            {text}
          </Text>,
        );
      }
      paragraphBuf = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      nodes.push(
        <View key={`b-${nodes.length}`} style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{bulletMatch[1]}</Text>
        </View>,
      );
    } else {
      paragraphBuf.push(line);
    }
  }
  flushParagraph();
  return nodes;
}

export function PolicyPdfDocument({
  policy,
  firmName,
  vertical,
  generatedOn,
}: PolicyPdfProps) {
  return (
    <Document
      title={policy.policy_title || "AI Usage Policy"}
      author="Practiq.dev — AI Policy Generator"
    >
      {/* Cover page */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.coverWrap}>
          <Text style={styles.coverEyebrow}>AI Usage Policy</Text>
          <Text style={styles.coverTitle}>{policy.policy_title}</Text>
          <View style={styles.coverFirmBlock}>
            <View style={styles.coverRow}>
              <Text style={styles.coverRowLabel}>Firm</Text>
              <Text style={styles.coverRowValue}>{firmName || "(not provided)"}</Text>
            </View>
            <View style={styles.coverRow}>
              <Text style={styles.coverRowLabel}>Vertical</Text>
              <Text style={styles.coverRowValue}>{vertical}</Text>
            </View>
            <View style={styles.coverRow}>
              <Text style={styles.coverRowLabel}>Version</Text>
              <Text style={styles.coverRowValue}>Draft v1.0</Text>
            </View>
            <View style={styles.coverRow}>
              <Text style={styles.coverRowLabel}>Generated</Text>
              <Text style={styles.coverRowValue}>{generatedOn}</Text>
            </View>
          </View>

          <View style={styles.coverDraft}>
            <Text style={styles.coverDraftText}>
              This document is a draft generated for the firm's internal
              review. It is not legal advice. Before adoption, please
              review with qualified counsel licensed in your firm's
              jurisdiction to ensure the policy is consistent with the
              specific professional rules, court orders, and regulatory
              guidance that apply to your practice.
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            Generated draft — review with counsel before adoption.
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Policy body */}
      <Page size="LETTER" style={styles.page}>
        {/* Preamble */}
        <Text style={styles.preambleHeading}>Preamble</Text>
        {renderBody(policy.preamble)}

        {/* Sections */}
        {policy.sections.map((section, idx) => (
          <View key={`section-${idx}`} wrap>
            <Text style={styles.sectionHeading}>
              {idx + 1}. {section.heading}
            </Text>
            {renderBody(section.body)}
          </View>
        ))}

        {/* Key obligations */}
        <View wrap={false}>
          <Text style={styles.sectionHeading}>Key obligations</Text>
          <View style={styles.obligationsBox}>
            {policy.key_obligations.map((ob, idx) => (
              <View key={`ob-${idx}`} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{ob}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Review cycle */}
        <Text style={styles.reviewCycle}>{policy.review_cycle}</Text>

        {/* Disclaimer */}
        <View style={styles.disclaimer} wrap={false}>
          <Text>{policy.footer_disclaimer}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            Generated draft — review with counsel before adoption. Practiq.dev
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
