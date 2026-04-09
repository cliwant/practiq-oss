import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/documents
 * Generates a document in the specified format (docx, xlsx, pptx, pdf).
 */
export async function POST(request: NextRequest) {
  const { clientId, format, title, content } = await request.json();

  // TODO: Implement document generation
  // 1. Authenticate user + validate format
  // 2. Call FastAPI document service (DOCUMENT_SERVICE_URL)
  // 3. Save file to local storage/ directory
  // 4. Record metadata in Prisma outputs table
  // 5. Return download URL

  return NextResponse.json({
    id: "placeholder",
    clientId,
    format,
    title,
    downloadUrl: "#",
  });
}
