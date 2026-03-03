-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "searchVector" tsvector;

-- CreateTable
CREATE TABLE "GraphNode" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "GraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GraphNode_label_idx" ON "GraphNode"("label");

-- CreateIndex
CREATE UNIQUE INDEX "GraphNode_label_type_key" ON "GraphNode"("label", "type");

-- CreateIndex
CREATE INDEX "GraphEdge_nodeId_idx" ON "GraphEdge"("nodeId");

-- CreateIndex
CREATE INDEX "GraphEdge_documentId_idx" ON "GraphEdge"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphEdge_nodeId_documentId_key" ON "GraphEdge"("nodeId", "documentId");

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "GraphNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
