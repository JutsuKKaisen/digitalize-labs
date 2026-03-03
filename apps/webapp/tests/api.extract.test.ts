import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/documents/[id]/extract/route';
import { prisma } from '../lib/prisma';
import * as processDocumentAI from '../lib/processDocumentAI';

// Mock processWithGemini explicitly
vi.mock('../lib/processDocumentAI', () => ({
    processWithGemini: vi.fn(),
}));

describe('POST /api/documents/[id]/extract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 404 if document does not exist', async () => {
        vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(null);

        const req = new Request('http://localhost:8000/api/documents/non_existent/extract', { method: 'POST' });
        const res = await POST(req, { params: { id: 'non_existent' } });
        const data = await res.json();

        expect(res.status).toBe(404);
        expect(data.error).toBe('Document not found');
    });

    it('should return 400 if document is pending', async () => {
        const doc: any = { id: 'doc-1', status: 'pending' };
        vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(doc);

        const req = new Request('http://localhost:8000/api/documents/doc-1/extract', { method: 'POST' });
        const res = await POST(req, { params: { id: 'doc-1' } });
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('Document must be processed by OCR first');
    });

    it('should process with Gemini when document is ready', async () => {
        const doc: any = { id: 'doc-1', status: 'ready' };
        vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(doc);
        vi.mocked(prisma.document.update).mockResolvedValueOnce({} as any);

        const req = new Request('http://localhost:8000/api/documents/doc-1/extract', { method: 'POST' });
        const res = await POST(req, { params: { id: 'doc-1' } });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.status).toBe('processing');
        expect(prisma.document.update).toHaveBeenCalledWith({
            where: { id: 'doc-1' },
            data: { status: 'processing' }
        });
        expect(processDocumentAI.processWithGemini).toHaveBeenCalledWith('doc-1');
    });
});
