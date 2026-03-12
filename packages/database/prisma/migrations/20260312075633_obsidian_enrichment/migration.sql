-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "markdownContent" TEXT;

-- CreateTable
CREATE TABLE "TextChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TextChunk_hash_idx" ON "TextChunk"("hash");

-- CreateIndex
CREATE INDEX "TextChunk_documentId_idx" ON "TextChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "TextChunk_documentId_index_key" ON "TextChunk"("documentId", "index");

-- CreateIndex
CREATE INDEX "GraphNode_type_idx" ON "GraphNode"("type");

-- AddForeignKey
ALTER TABLE "TextChunk" ADD CONSTRAINT "TextChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
