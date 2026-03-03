import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/search/route';
import { prisma } from '../lib/prisma';

describe('GET /api/search', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return empty results if query is too short', async () => {
        const req = new Request('http://localhost:8000/api/search?q=ab');
        const res = await GET(req);
        const data = await res.json();

        expect(data.results).toEqual([]);
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should execute raw query and return formatted snippets', async () => {
        const mockDbResults = [
            { docId: 'doc-1', docTitle: 'Legal File 1', rank: 1.5, snippet: 'Test <mark>query</mark> match' }
        ];

        vi.mocked(prisma.$queryRaw).mockResolvedValueOnce(mockDbResults);

        const req = new Request('http://localhost:8000/api/search?q=query');
        const res = await GET(req);
        const data = await res.json();

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(data.results[0].docId).toBe('doc-1');
        expect(data.results[0].snippet).toContain('<mark>query</mark>');
    });
});
