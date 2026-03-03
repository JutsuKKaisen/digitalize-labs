import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/cron/cleanup/route';
import { prisma } from '../lib/prisma';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
    default: {
        unlink: vi.fn()
    }
}));

describe('POST /api/cron/cleanup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = 'test_secret';
    });

    it('should return 401 if unauthorized', async () => {
        const req = new Request('http://localhost:8000/api/cron/cleanup', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer wrong_token' }
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should delete pdfs and nullify strict filePaths', async () => {
        const docs = [
            { id: '1', filePath: '/fake/1.pdf' },
            { id: '2', filePath: '/fake/2.pdf' }
        ];

        vi.mocked(prisma.document.findMany).mockResolvedValueOnce(docs as any);
        vi.mocked(fs.unlink).mockResolvedValue(undefined);
        vi.mocked(prisma.document.update).mockResolvedValue({} as any);

        const req = new Request('http://localhost:8000/api/cron/cleanup', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer test_secret' }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.summary.deleted).toBe(2);
        expect(fs.unlink).toHaveBeenCalledTimes(2);
        expect(prisma.document.update).toHaveBeenCalledTimes(2);
    });
});
