import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string; outputId: string }>;
};

/**
 * GET /api/clients/[id]/artifacts/[outputId]/download
 *
 * Streams the rendered artifact (.docx or .xlsx) back to the browser
 * with the right MIME type + Content-Disposition. Ownership is checked
 * twice — client belongs to user, output belongs to client.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, outputId } = await params;
  const output = await prisma.output.findFirst({
    where: {
      id: outputId,
      clientId: id,
      client: { userId: session.user.id },
    },
  });
  if (!output) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(output.filePath);
  } catch (e) {
    return NextResponse.json(
      {
        error: "artifact file missing on disk",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 410 },
    );
  }

  const mime =
    output.format === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : output.format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/octet-stream";

  const originalName = path.basename(output.filePath);

  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${originalName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
