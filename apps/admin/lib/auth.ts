import { createHash, randomBytes } from "crypto";
import { prisma } from "@dl/database";
import { cookies } from "next/headers";

const SESSION_COOKIE = "dl_admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function hashPassword(password: string, salt?: string): string {
    const s = salt || randomBytes(16).toString("hex");
    const hash = createHash("sha256")
        .update(s + password)
        .digest("hex");
    return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(":");
    const computed = createHash("sha256")
        .update(salt + password)
        .digest("hex");
    return computed === hash;
}

export async function createSession(userId: string, req?: { ip?: string; userAgent?: string }) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const session = await prisma.adminSession.create({
        data: {
            userId,
            token,
            expiresAt,
            ipAddress: req?.ip || null,
            userAgent: req?.userAgent || null,
        },
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
    });

    return session;
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await prisma.adminSession.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
        // Clean up expired session
        await prisma.adminSession.delete({ where: { id: session.id } });
        return null;
    }

    return session;
}

export async function destroySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (token) {
        await prisma.adminSession.deleteMany({ where: { token } });
        cookieStore.delete(SESSION_COOKIE);
    }
}

export async function logAuditAction(params: {
    action: string;
    entity?: string;
    entityId?: string;
    details?: string;
    userId?: string;
    documentId?: string;
    ipAddress?: string;
}) {
    return prisma.auditLog.create({
        data: {
            action: params.action,
            entity: params.entity,
            entityId: params.entityId,
            details: params.details,
            userId: params.userId,
            documentId: params.documentId,
            ipAddress: params.ipAddress,
        },
    });
}
