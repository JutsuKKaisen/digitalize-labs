import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processWithGemini } from "@/lib/processDocumentAI";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const docId = params.id;
    const doc = await prisma.document.findUnique({ where: { id: docId } });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (doc.status !== "ready" && doc.status !== "error") {
      return NextResponse.json(
        { error: "Document must be processed by OCR first" },
        { status: 400 },
      );
    }

    await prisma.document.update({
      where: { id: docId },
      data: { status: "processing" },
    });

    // Background AI processing
    processWithGemini(docId);

    return NextResponse.json({ success: true, status: "processing" });
  } catch (error) {
    console.error("Extract API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
