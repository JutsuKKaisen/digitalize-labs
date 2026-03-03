import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/documents/route';
import { prismaMock } from './setup';

describe('GET /api/documents', () => {
    it('should return a list of documents with calculated needsReview', async () => {
        // Arrange
        const mockDocs = [
            {
                id: 'uuid-1',
                title: 'doc1.pdf',
                status: 'ready',
                pageCount: 2,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                filePath: '/tmp/doc1.pdf',
                xmlData: null,
                pages: [
                    { needsReview: false },
                    { needsReview: true }
                ]
            }
        ];

        prismaMock.document.findMany.mockResolvedValue(mockDocs as any);

        // Act
        const res = await GET();
        const json = await res.json();

        // Assert
        expect(prismaMock.document.findMany).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(200);
        expect(json.documents).toHaveLength(1);
        expect(json.documents[0].title).toBe('doc1.pdf');
        expect(json.documents[0].needsReview).toBe(true); // Since one page needs review
    });

    it('should handle internal errors gracefully', async () => {
        // Arrange
        prismaMock.document.findMany.mockRejectedValue(new Error('DB Error'));

        // Act
        const res = await GET();
        const json = await res.json();

        // Assert
        expect(res.status).toBe(500);
        expect(json.error).toBe('Internal Server Error');
    });
});
