import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/pages/[id]/assets/route';
import { prismaMock } from './setup';

describe('GET /api/pages/[id]/assets', () => {
    it('should return 404 if page is not found', async () => {
        prismaMock.page.findUnique.mockResolvedValue(null);

        const req = new Request('http://localhost:3000/api/pages/test_p001/assets');
        const res = await GET(req, { params: { id: 'test_p001' } });

        expect(res.status).toBe(404);
    });

    it('should return page assets properly formatted', async () => {
        const mockPage = {
            id: 'test_p001',
            documentId: 'test',
            pageNo: 1,
            imageUrl: '/mock/test/images/page.png',
            width: 800,
            height: 1100,
            needsReview: false,
            assets: {
                lines: [{ id: 'l1' }],
                tokens: [{ id: 't1' }]
            },
            document: { id: 'test' }
        };

        prismaMock.page.findUnique.mockResolvedValue(mockPage as any);

        const req = new Request('http://localhost:3000/api/pages/test_p001/assets');
        const res = await GET(req, { params: { id: 'test_p001' } });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.page.id).toBe('test_p001');
        expect(json.page.status).toBe('verified');
        expect(json.lines).toHaveLength(1);
        expect(json.tokens).toHaveLength(1);
    });
});
