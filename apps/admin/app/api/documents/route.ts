import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@dl/database";
import { getSession, logAuditAction } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

// GET /api/documents — List all documents
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const phase = url.searchParams.get("phase");
        const includeDeleted = url.searchParams.get("includeDeleted") === "true";

        const where: any = {};
        if (!includeDeleted) where.deletedAt = null;
        if (status && status !== "all") where.status = status;
        if (phase && phase !== "all") where.phase = phase;

        const documents = await prisma.document.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { pages: true } } },
        });

        return NextResponse.json({ documents });
    } catch (error) {
        console.error("Documents error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/documents — Update document status/phase
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        const { id, status, phase } = await request.json();

        if (!id) {
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
        }

        const before = await prisma.document.findUnique({ where: { id } });
        if (!before) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const data: any = { updatedAt: new Date() };
        if (status) data.status = status;
        if (phase) data.phase = phase;
        if (status === "verified") data.verifiedAt = new Date();

        const updated = await prisma.document.update({ where: { id }, data });

        await logAuditAction({
            action: "DOC_STATUS_CHANGE",
            entity: "Document",
            entityId: id,
            documentId: id,
            userId: session?.userId,
            details: JSON.stringify({
                before: { status: before.status, phase: before.phase },
                after: { status: updated.status, phase: updated.phase },
            }),
        });

        return NextResponse.json({ document: updated });
    } catch (error) {
        console.error("Document update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/documents — Hard delete document + file
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden: superadmin only" }, { status: 403 });
        }

        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
        }

        const doc = await prisma.document.findUnique({ where: { id }, include: { pages: true } });
        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Log BEFORE deletion (since the record will be gone)
        await logAuditAction({
            action: "DOC_HARD_DELETE",
            entity: "Document",
            entityId: id,
            userId: session.userId,
            details: JSON.stringify({
                title: doc.title,
                status: doc.status,
                pageCount: doc.pageCount,
                filePath: doc.filePath,
            }),
            ipAddress: request.headers.get("x-forwarded-for") || undefined,
        });

        // Delete physical file if exists
        if (doc.filePath) {
            try {
                await fs.unlink(doc.filePath);
            } catch {
                // File might not exist on this machine
            }
        }

        // Delete from DB (cascades to Pages)
        await prisma.document.delete({ where: { id } });

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error) {
        console.error("Hard delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
