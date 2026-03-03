import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@dl/database";
import { verifyPassword, createSession, destroySession, getSession, logAuditAction } from "@/lib/auth";

// POST /api/auth — Login
export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const user = await prisma.adminUser.findUnique({ where: { email } });

        if (!user || !user.isActive) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        if (!verifyPassword(password, user.hashedPassword)) {
            // Log failed attempt
            await logAuditAction({
                action: "LOGIN_FAILED",
                entity: "AdminUser",
                entityId: user.id,
                details: JSON.stringify({ email }),
                ipAddress: request.headers.get("x-forwarded-for") || undefined,
            });
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // Create session
        await createSession(user.id, {
            ip: request.headers.get("x-forwarded-for") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
        });

        // Update last login
        await prisma.adminUser.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Audit log
        await logAuditAction({
            action: "LOGIN",
            entity: "AdminUser",
            entityId: user.id,
            userId: user.id,
            ipAddress: request.headers.get("x-forwarded-for") || undefined,
        });

        return NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error("Auth error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/auth — Logout
export async function DELETE() {
    try {
        const session = await getSession();

        if (session) {
            await logAuditAction({
                action: "LOGOUT",
                entity: "AdminUser",
                entityId: session.userId,
                userId: session.userId,
            });
        }

        await destroySession();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET /api/auth — Get current session
export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: session.user.role,
            },
        });
    } catch (error) {
        console.error("Session check error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
