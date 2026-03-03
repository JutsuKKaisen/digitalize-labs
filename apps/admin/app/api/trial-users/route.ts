import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@dl/database";

// GET /api/trial-users — List trial leads with filters
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const search = url.searchParams.get("search");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");

        const where: any = {};
        if (status && status !== "all") where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { company: { contains: search, mode: "insensitive" } },
            ];
        }

        const [leads, total] = await Promise.all([
            prisma.trialLead.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.trialLead.count({ where }),
        ]);

        return NextResponse.json({ leads, total, page, limit });
    } catch (error) {
        console.error("Trial users error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
