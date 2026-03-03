import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@dl/database";

// GET /api/audit-logs — List audit logs with filters
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "50");

        const where: any = {};
        if (action && action !== "all") where.action = action;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: { name: true, email: true } },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        return NextResponse.json({ logs, total, page, limit });
    } catch (error) {
        console.error("Audit logs error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
