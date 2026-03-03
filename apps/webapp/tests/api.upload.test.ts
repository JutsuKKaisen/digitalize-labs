import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/upload/route';
import { prismaMock } from './setup';
import * as processDoc from '@/lib/processDocument';
import fs from 'fs/promises';

vi.mock('@/lib/processDocument', () => ({
    processDocumentInBackground: vi.fn(),
}));

vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
        copyFile: vi.fn(),
    },
}));

describe('POST /api/upload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 400 if no file is uploaded', async () => {
        const formData = new FormData();
        const req = new Request('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('No file uploaded');
    });

    it('should return 400 if file type is unsupported', async () => {
        const formData = new FormData();
        const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
        formData.append('file', file);

        const req = new Request('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('Unsupported file type: .txt. Supported formats: PDF, JPG, PNG');
    });

    it('should process pdf file correctly', async () => {
        const formData = new FormData();
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        formData.append('file', file);

        const req = new Request('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
        });

        prismaMock.document.create.mockResolvedValue({ id: 'uuid-123', title: 'test.pdf', status: 'pending' } as any);

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.id).toBe('uuid-123');
        expect(json.status).toBe('processing');

        expect(fs.mkdir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalled();
        expect(prismaMock.document.create).toHaveBeenCalled();
        expect(prismaMock.document.update).toHaveBeenCalled();
        expect(processDoc.processDocumentInBackground).toHaveBeenCalledWith('uuid-123', expect.any(String), false);
    });
});
