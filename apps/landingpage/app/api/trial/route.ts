import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@dl/database";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, phone, company, interest } = body;

        // Validate required fields
        if (!name || !email || !phone || !interest) {
            return NextResponse.json(
                { error: "Missing required fields: name, email, phone, interest" },
                { status: 400 }
            );
        }

        // Save trial lead to database
        const lead = await prisma.trialLead.create({
            data: {
                name,
                email,
                phone,
                company: company || null,
                interest,
                status: "new",
            },
        });

        // Also track this as a page visit
        try {
            await prisma.pageVisit.create({
                data: {
                    app: "landingpage",
                    path: "/api/trial",
                    ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
                    userAgent: request.headers.get("user-agent") || null,
                    referrer: request.headers.get("referer") || null,
                },
            });
        } catch {
            // Non-critical — don't fail the lead creation
        }

        return NextResponse.json(
            { success: true, id: lead.id },
            { status: 201 }
        );
    } catch (error) {
        console.error("Trial registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
