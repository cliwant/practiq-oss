/**
 * GET /api/approval-queue/[id]/download — RUN 9 (P2-06).
 *
 * Streams the rendered .docx / .xlsx file for a `document_draft`
 * ApprovalItem. **On-the-fly generation** — we don't persist the
 * binary; the source-of-truth is the structured `content` JSON
 * (sections array) on the ApprovalItem itself. This means:
 *
 *   - Zero filesystem dependency. Works on Vercel serverless
 *     (read-only fs) AND on local ARM64 Windows dev (no /tmp
 *     scribbling) AND on Supabase storage-not-yet-configured.
 *   - The operator can re-edit content in the queue and the next
 *     download produces an updated file with no version-bump
 *     bookkeeping. The Output table (when we wire it) will track
 *     "approved version" timestamps; the binary regenerates from
 *     content every time.
 *   - Cost: docx generation is ~30-50ms per call, xlsx ~40-80ms.
 *     Cheap enough that re-rendering on every download is fine —
 *     no one downloads the same file 100×/min.
 *
 * Auth: standard NextAuth session + ApprovalItem userId match.
 * No public-share path — operator must be signed in to fetch.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDocxBuffer } from "@/lib/document-generators/docx";
import { buildXlsxBuffer } from "@/lib/document-generators/xlsx";
import type {
  DocumentSection,
  DocumentFormat,
  GeneratorClientMeta,
} from "@/lib/document-generators/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_FORMATS: ReadonlySet<DocumentFormat> = new Set([
  "docx",
  "xlsx",
] as const);

const MIME_BY_FORMAT: Record<DocumentFormat, string> = {
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const EXT_BY_FORMAT: Record<DocumentFormat, string> = {
  docx: "docx",
  xlsx: "xlsx",
  pdf: "pdf",
  pptx: "pptx",
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const item = await prisma.approvalItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: {
        select: {
          name: true,
          industry: true,
          relationshipMonths: true,
        },
      },
    },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (item.type !== "document_draft") {
    return NextResponse.json(
      { error: "ApprovalItem is not a document draft" },
      { status: 400 },
    );
  }

  const content = (item.content ?? {}) as {
    format?: string;
    title?: string;
    sections?: unknown;
  };

  const formatRaw = String(content.format ?? "").toLowerCase();
  const format = (VALID_FORMATS.has(formatRaw as DocumentFormat)
    ? (formatRaw as DocumentFormat)
    : null);
  if (!format) {
    return NextResponse.json(
      {
        error: `Unsupported format '${formatRaw}' — only docx/xlsx are renderable today.`,
      },
      { status: 400 },
    );
  }

  const title = String(content.title ?? item.title ?? "Document").trim();
  const sections = parseSections(content.sections);
  if (sections.length === 0) {
    return NextResponse.json(
      { error: "ApprovalItem has no sections to render" },
      { status: 400 },
    );
  }

  const clientMeta: GeneratorClientMeta = {
    name: item.client.name,
    industry: item.client.industry,
    relationshipMonths: item.client.relationshipMonths ?? undefined,
  };
  const generatedAt = new Date();

  let buffer: Buffer;
  try {
    buffer =
      format === "docx"
        ? await buildDocxBuffer({
            title,
            sections,
            client: clientMeta,
            generatedAt,
          })
        : await buildXlsxBuffer({
            title,
            sections,
            client: clientMeta,
            generatedAt,
          });
  } catch (err) {
    console.error(`[download] generator failed for ${format}: ${err}`);
    return NextResponse.json(
      {
        error: `${format.toUpperCase()} generation failed`,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // Persist a lightweight Output row each time the operator downloads.
  // This is the audit trail: "the operator pulled draft v3 of Kim's
  // March monthly close at 09:14." If the same draft gets downloaded
  // 5 times we get 5 rows — that's the intent (each pull is a real
  // moment in the audit history).
  try {
    await prisma.output.create({
      data: {
        clientId: item.clientId,
        userId: session.user.id,
        title,
        format,
        // We don't write the file to disk anymore — filePath stays
        // pointing back at the generator endpoint so audit queries
        // know where it came from.
        filePath: `/api/approval-queue/${id}/download?format=${format}`,
        fileSizeBytes: BigInt(buffer.length),
        version: 1,
        generatedBy: "agent",
        generationPrompt: `On-the-fly render from ApprovalItem ${id}`,
        isLatest: true,
      },
    });
  } catch (err) {
    // Non-fatal — the download still completes even if the audit row
    // couldn't be written (transient DB blip). The AuditLog rows from
    // the approval lifecycle still capture the grep-able trail.
    console.warn(`[download] Output row write skipped: ${err}`);
  }

  const safeFilename = title
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "document";
  const filename = `${safeFilename}.${EXT_BY_FORMAT[format]}`;

  // Convert the Node Buffer to a Uint8Array so the Web Response body
  // accepts it without TS narrowing issues.
  const body: BodyInit = new Uint8Array(buffer);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": MIME_BY_FORMAT[format],
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function parseSections(raw: unknown): DocumentSection[] {
  if (!Array.isArray(raw)) return [];
  const out: DocumentSection[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const obj = r as Record<string, unknown>;
    const heading = typeof obj.heading === "string" ? obj.heading.trim() : "";
    const content = typeof obj.content === "string" ? obj.content.trim() : "";
    if (heading && content) out.push({ heading, content });
  }
  return out;
}
