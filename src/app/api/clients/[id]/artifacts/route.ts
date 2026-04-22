import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/claude/client";
import { buildDocx, type DocxSpec } from "@/lib/artifacts/docx";
import { buildXlsx, type XlsxSpec } from "@/lib/artifacts/xlsx";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const MODEL = "claude-sonnet-4-5-20250929";
const STORAGE_ROOT = process.env.STORAGE_ROOT || "./storage";

/**
 * POST /api/clients/[id]/artifacts
 *
 * Generate a document or spreadsheet artifact for a client using the
 * agent's knowledge of that client. Two steps:
 *   1. Ask Claude to produce a structured spec (DocxSpec or XlsxSpec)
 *   2. Render via our local builders (docx / exceljs). No external
 *      FastAPI dependency — everything stays in Node.
 *
 * Body: { format: "docx" | "xlsx", brief: string }
 *   brief is a 1-2 sentence description of what the artifact should be
 *   ("March monthly financial statement", "Q1 tax summary memo", etc.)
 *
 * Creates an Output row + optionally an ApprovalItem so the operator
 * can review before sending. File lands on disk under storage/outputs/.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { format?: string; brief?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const format = body.format;
  const brief = body.brief?.trim();
  if (!format || !["docx", "xlsx"].includes(format)) {
    return NextResponse.json(
      { error: "format must be 'docx' or 'xlsx'" },
      { status: 400 },
    );
  }
  if (!brief) {
    return NextResponse.json(
      { error: "brief is required (what should the artifact contain?)" },
      { status: 400 },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set" },
      { status: 500 },
    );
  }

  // Load client knowledge.
  const contexts = await prisma.clientContext.findMany({
    where: { clientId: id },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 30,
  });

  const systemPrompt =
    format === "docx"
      ? DOCX_SYSTEM_PROMPT
      : XLSX_SYSTEM_PROMPT;

  const userPrompt = `<client>
<name>${client.name}</name>
<industry>${client.industry}</industry>
<role>${client.userRole}</role>
<preferences>${JSON.stringify(client.preferences ?? {})}</preferences>
</client>

<knowledge>
${contexts
  .map(
    (c) =>
      `<entry category="${c.category}" pinned="${c.isPinned}">${c.title}: ${c.content}</entry>`,
  )
  .join("\n")}
</knowledge>

<brief>
${brief}
</brief>

Produce the strict JSON spec matching the schema in the system prompt. No prose before or after.`;

  let spec: DocxSpec | XlsxSpec;
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    spec = JSON.parse(text);
    if (format === "docx") {
      if (!Array.isArray((spec as DocxSpec).sections)) {
        throw new Error("DocxSpec.sections must be an array");
      }
    } else {
      if (!Array.isArray((spec as XlsxSpec).sheets)) {
        throw new Error("XlsxSpec.sheets must be an array");
      }
    }
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `artifact planning failed: ${m}` },
      { status: 500 },
    );
  }

  const buffer =
    format === "docx"
      ? await buildDocx({
          ...(spec as DocxSpec),
          preparedFor: client.name,
          preparedBy: session.user.email ?? "Practiq operator",
          preparedAt: new Date(),
        })
      : await buildXlsx({
          ...(spec as XlsxSpec),
          preparedFor: client.name,
          preparedAt: new Date(),
        });

  // Persist to disk.
  const outDir = path.join(STORAGE_ROOT, "outputs", client.id);
  await mkdir(outDir, { recursive: true });
  const safeBrief = brief
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const filename = `${Date.now()}-${safeBrief || "artifact"}.${format}`;
  const filePath = path.join(outDir, filename);
  await writeFile(filePath, buffer);

  // Record in DB.
  const output = await prisma.output.create({
    data: {
      clientId: client.id,
      userId: session.user.id,
      title: ("title" in spec && spec.title) || brief,
      format,
      filePath: filePath.replace(/\\/g, "/"),
      fileSizeBytes: BigInt(buffer.byteLength),
      version: 1,
      generatedBy: "agent",
      generationPrompt: brief,
      isLatest: true,
    },
  });

  // Create an approval item so the operator reviews before sending.
  const approval = await prisma.approvalItem.create({
    data: {
      clientId: client.id,
      userId: session.user.id,
      type: format === "docx" ? "email_draft" : "financial_statement",
      title: ("title" in spec && spec.title) || brief,
      priority: 60,
      aiConfidence: 0.75,
      content: {
        brief,
        format,
        outputId: output.id,
        filePath: output.filePath,
        sizeBytes: Number(output.fileSizeBytes ?? 0),
      },
      aiNotes: `Draft prepared from ${contexts.length} context entries. Review before sending to ${client.name}.`,
    },
  });

  await prisma.auditLog.create({
    data: {
      clientId: client.id,
      userId: session.user.id,
      action: "artifact_generated",
      details: {
        outputId: output.id,
        approvalItemId: approval.id,
        format,
        brief,
        sizeBytes: Number(output.fileSizeBytes ?? 0),
      },
    },
  });

  return NextResponse.json({
    outputId: output.id,
    approvalItemId: approval.id,
    format,
    sizeBytes: Number(output.fileSizeBytes ?? 0),
    downloadPath: `/api/clients/${client.id}/artifacts/${output.id}/download`,
  });
}

const DOCX_SYSTEM_PROMPT = `You plan professional documents (.docx) for a specific client given their knowledge base. You never invent facts — if a claim isn't supported by the knowledge entries, omit it or flag it as "pending confirmation".

Output strict JSON matching this TypeScript type:

{
  "title": string,
  "subtitle"?: string,
  "sections": [
    {
      "heading"?: string,
      "blocks": Array<
        | { "kind": "paragraph", "text": string }
        | { "kind": "bullets", "items": string[] }
        | { "kind": "kv", "rows": [{ "label": string, "value": string }] }
      >
    }
  ]
}

Rules:
- Open with a 1-2 paragraph executive summary section.
- Follow with 2-4 content sections.
- Use "kv" blocks for numeric summaries, "bullets" for action items, "paragraph" for narrative.
- Tone matches client.preferences.reportTone if present.
- Keep it under ~800 words total — operators skim.

Return JSON only. No prose before or after.`;

const XLSX_SYSTEM_PROMPT = `You plan a minimal Excel workbook (.xlsx) for a specific client's financials given their knowledge base. Never invent numbers — if a line isn't supported by the knowledge entries, omit the line entirely.

Output strict JSON matching this TypeScript type:

{
  "title": string,
  "sheets": [
    {
      "name": string,          // <= 31 chars, workbook tab name
      "columns": [
        { "header": string, "key": string, "numFmt"?: string, "width"?: number }
      ],
      "rows": [ { [columnKey]: string | number } ],
      "totals"?: { [columnKey]: string | number }  // optional emphasized row
    }
  ]
}

Guidelines:
- Prefer 1-3 sheets ("Summary", "Detail", optionally "Notes").
- Use numFmt strings like "#,##0.00" for money, "0.0%" for percentages.
- First column is usually a label (e.g. "Account", "Category"); later columns are the values.
- Keep row count under 40 per sheet — operators can extend by hand.

Return JSON only. No prose.`;

/** GET download path uses a separate handler below via `[outputId]/download/route.ts` */
