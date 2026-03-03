import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@dl/database";

// GET /api/dashboard — Aggregate stats
export async function GET() {
    try {
        const [
            totalDocuments,
            documentsByStatus,
            totalLeads,
            recentLeads,
            recentVisits,
            totalVisitsWebapp,
            totalVisitsLanding,
        ] = await Promise.all([
            prisma.document.count({ where: { deletedAt: null } }),
            prisma.document.groupBy({
                by: ["status"],
                where: { deletedAt: null },
                _count: { id: true },
            }),
            prisma.trialLead.count(),
            prisma.trialLead.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, name: true, email: true, interest: true, createdAt: true },
            }),
            prisma.pageVisit.count({
                where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
            }),
            prisma.pageVisit.count({ where: { app: "webapp" } }),
            prisma.pageVisit.count({ where: { app: "landingpage" } }),
        ]);

        const statusCounts = documentsByStatus.reduce(
            (acc, item) => ({ ...acc, [item.status]: item._count.id }),
            {} as Record<string, number>
        );

        return NextResponse.json({
            totalDocuments,
            statusCounts,
            totalLeads,
            recentLeads,
            traffic: {
                last7Days: recentVisits,
                webapp: totalVisitsWebapp,
                landingpage: totalVisitsLanding,
            },
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
