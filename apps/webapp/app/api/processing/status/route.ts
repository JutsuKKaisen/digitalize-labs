import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/processing/status
 * Returns documents currently in the processing pipeline with step-based progress.
 * This powers the /processing page's workflow visualization.
 */
export async function GET() {
  try {
    const docs = await prisma.document.findMany({
      where: {
        status: {
          in: ["pending", "ingest", "processing"],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        pages: {
          select: {
            id: true,
            needsReview: true,
          },
        },
      },
    });

    // Also include recently completed/errored docs (last 24h) so users can see results
    const recentDocs = await prisma.document.findMany({
      where: {
        status: { in: ["ready", "verified", "error"] },
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        pages: {
          select: {
            id: true,
            needsReview: true,
          },
        },
      },
    });

    const allDocs = [...docs, ...recentDocs];

    // Remove duplicates (in case a doc appears in both queries)
    const seen = new Set<string>();
    const uniqueDocs = allDocs.filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });

    const statusList = uniqueDocs.map((doc) => {
      // Build step progress based on document status
      const steps = buildSteps(doc.status);

      return {
        docId: doc.id,
        title: doc.title,
        status: doc.status,
        pageCount: doc.pageCount,
        createdAt: doc.createdAt,
        steps,
      };
    });

    return NextResponse.json(statusList);
  } catch (error) {
    console.error("Error fetching processing status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * Maps document status to pipeline steps for the workflow UI.
 */
function buildSteps(status: string) {
  const PIPELINE_STEPS = [
    { name: "Upload", key: "upload" },
    { name: "Ingest", key: "ingest" },
    { name: "OCR", key: "ocr" },
    { name: "Verify", key: "verify" },
    { name: "Complete", key: "complete" },
  ];

  // Determine which step the document is currently on
  const statusToStepIndex: Record<string, number> = {
    pending: 0,
    ingest: 1,
    processing: 2,
    ready: 4,
    verified: 4,
    error: 2, // Errored at OCR step typically
  };

  const currentStepIndex = statusToStepIndex[status] ?? 0;
  const isError = status === "error";

  return PIPELINE_STEPS.map((step, idx) => {
    let stepStatus: string;
    let time = "";

    if (isError && idx === currentStepIndex) {
      stepStatus = "error";
      time = "Failed";
    } else if (idx < currentStepIndex) {
      stepStatus = "completed";
      time = "✓";
    } else if (idx === currentStepIndex) {
      stepStatus =
        status === "ready" || status === "verified"
          ? "completed"
          : "processing";
      time = stepStatus === "completed" ? "✓" : "...";
    } else {
      stepStatus = "pending";
    }

    return {
      name: step.name,
      status: stepStatus,
      time,
    };
  });
}
