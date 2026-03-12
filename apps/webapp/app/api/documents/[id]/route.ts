import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = decodeURIComponent(params.id);

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const pages = await prisma.page.findMany({
      where: { documentId: id },
      orderBy: { pageNo: "asc" },
    });

    return NextResponse.json({ document, pages });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Deletes only the physical file (PDF/image) to free up storage.
 * The database record and extracted XML data are preserved.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = decodeURIComponent(params.id);

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Delete physical file if it exists
    if (document.filePath) {
      try {
        await fs.unlink(document.filePath);
      } catch (e) {
        // File may already be deleted (idempotent)
        console.warn(
          `Physical file not found or already deleted: ${document.filePath}`,
        );
      }

      // Clear filePath in DB but keep all other data
      await prisma.document.update({
        where: { id },
        data: { filePath: null },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Physical file deleted. XML data preserved.",
    });
  } catch (error) {
    console.error("Error deleting document file:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Admin endpoint to update document status and other fields.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = decodeURIComponent(params.id);
    const body = await req.json();

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Only allow updating specific fields
    const allowedFields: Record<string, any> = {};
    if (
      body.status &&
      [
        "pending",
        "ingest",
        "processing",
        "verifying",
        "ready",
        "verified",
        "error",
      ].includes(body.status)
    ) {
      allowedFields.status = body.status;
      // Set verifiedAt timestamp when marking as verified
      if (body.status === "verified") {
        allowedFields.verifiedAt = new Date();
      }
    }
    if (body.title) {
      allowedFields.title = body.title;
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.document.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
