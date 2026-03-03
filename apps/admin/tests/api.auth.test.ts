import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './setup';

// Mock the auth library functions that use cookies() (Next.js server-only)
vi.mock('@/lib/auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth')>();
    return {
        ...actual,
        createSession: vi.fn().mockResolvedValue({ id: 'session-1', token: 'mock-token' }),
        getSession: vi.fn().mockResolvedValue(null),
        destroySession: vi.fn().mockResolvedValue(undefined),
    };
});

// Mock next/headers (cookies)
vi.mock('next/headers', () => ({
    cookies: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
    }),
}));

// Import route handlers AFTER mocks are set up
import { POST } from '@/app/api/auth/route';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost:3002/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/auth - Login', () => {
    it('returns 400 when email is missing', async () => {
        const req = makeRequest({ password: 'test' });
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('Email and password are required');
    });

    it('returns 400 when password is missing', async () => {
        const req = makeRequest({ email: 'test@test.com' });
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('Email and password are required');
    });

    it('returns 401 for non-existent user', async () => {
        prismaMock.adminUser.findUnique.mockResolvedValue(null);

        const req = makeRequest({ email: 'ghost@test.com', password: 'password' });
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Invalid credentials');
    });

    it('returns 401 for inactive user', async () => {
        prismaMock.adminUser.findUnique.mockResolvedValue({
            id: 'user-1',
            email: 'inactive@test.com',
            hashedPassword: hashPassword('password'),
            name: 'Inactive User',
            role: 'admin',
            isActive: false,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const req = makeRequest({ email: 'inactive@test.com', password: 'password' });
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Invalid credentials');
    });

    it('returns 401 for wrong password', async () => {
        prismaMock.adminUser.findUnique.mockResolvedValue({
            id: 'user-1',
            email: 'admin@test.com',
            hashedPassword: hashPassword('CorrectPassword!'),
            name: 'Admin',
            role: 'admin',
            isActive: true,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const req = makeRequest({ email: 'admin@test.com', password: 'WrongPassword!' });
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Invalid credentials');
    });

    it('returns 200 with user data for valid credentials', async () => {
        const password = 'Admin@2026!';
        const stored = hashPassword(password);

        prismaMock.adminUser.findUnique.mockResolvedValue({
            id: 'user-1',
            email: 'admin@digitalizelabs.vn',
            hashedPassword: stored,
            name: 'Super Admin',
            role: 'superadmin',
            isActive: true,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        prismaMock.adminUser.update.mockResolvedValue({} as any);
        prismaMock.auditLog.create.mockResolvedValue({} as any);

        const req = makeRequest({ email: 'admin@digitalizelabs.vn', password });
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.user.email).toBe('admin@digitalizelabs.vn');
        expect(json.user.role).toBe('superadmin');
    });
});
