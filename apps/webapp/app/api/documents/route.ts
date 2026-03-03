import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const docs = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        pages: {
          select: {
            needsReview: true,
          },
        },
      },
    });

    const documents = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      pageCount: doc.pageCount,
      createdAt: doc.createdAt,
      needsReview: doc.pages.some((p) => p.needsReview),
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
