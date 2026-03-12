import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { processDocumentInBackground } from "@/lib/processDocument";

export const dynamic = "force-dynamic";

// Supported file extensions
const SUPPORTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${ext}. Supported formats: PDF, JPG, PNG`,
        },
        { status: 400 },
      );
    }

    const isImage = IMAGE_EXTENSIONS.includes(ext);

    // Create DB Document to get an ID
    const document = await prisma.document.create({
      data: {
        title: file.name,
        status: "processing",
      },
    });

    // Save file
    const subDir = isImage ? "images" : "pdfs";
    const uploadsDir = path.join(process.cwd(), "uploads", subDir);
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `${document.id}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Update document with filePath
    await prisma.document.update({
      where: { id: document.id },
      data: { filePath },
    });

    // Extract search params
    const url = new URL(req.url);
    const autoAI = url.searchParams.get("ai") === "true";

    // OCR pipeline — kick off background python process for both PDFs and Images
    processDocumentInBackground(document.id, filePath, autoAI);
    return NextResponse.json({
      id: document.id,
      status: "processing",
      type: isImage ? "image" : "pdf",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
