import { execFile } from "child_process";
import path from "path";
import fs from "fs/promises";
import { prisma } from "./prisma";

// Use Python 3 depending on environment
const PYTHON_CMD = process.env.NODE_ENV === "production" ? "python3" : "python";

export async function processDocumentInBackground(
  docId: string,
  filePath: string,
  autoAI: boolean = false,
) {
  try {
    const outRoot = path.join(process.cwd(), "public", "mock");

    // LẤY URL TỪ BIẾN MÔI TRƯỜNG VÀ NỐI VỚI ENDPOINT /process
    const engineUrl = process.env.PYTHON_ENGINE_URL || "http://127.0.0.1:8000";

    // Call the Python FastAPI worker
    const response = await fetch(`${engineUrl}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId,
        filePath,
        outRoot,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FastAPI Processing Error:", errorText);
      await prisma.document.update({
        where: { id: docId },
        data: { status: "error" },
      });
      return;
    }

    const bundleData = await response.json();

    const pages = bundleData.pages || [];
    const pageAssetsById = bundleData.pageAssetsById || {};

    let fullOcrText = "";

    // Extract enriched Obsidian data from Python engine response
    const markdownContent = bundleData.markdownContent || null;
    const textChunks = bundleData.textChunks || [];
    const detectedEntities = bundleData.detectedEntities || [];

    // Insert pages into DB
    for (const p of pages) {
      const assets = pageAssetsById[p.id] || { lines: [], tokens: [] };

      // Accumulate text for search indexing
      if (assets.tokens && Array.isArray(assets.tokens)) {
        fullOcrText +=
          assets.tokens.map((t: any) => t.text).join(" ") + "\n";
      }

      await prisma.page.create({
        data: {
          id: p.id,
          documentId: docId,
          pageNo: p.pageNo,
          imageUrl: p.imageUrl,
          width: p.width,
          height: p.height,
          needsReview: p.needsReview || false,
          // storing tokens and lines in JSON string field
          assets: JSON.stringify(assets),
        },
      });
    }

    // Persist TextChunks (SHA-256 hashed paragraphs) for deduplication
    if (textChunks.length > 0) {
      await prisma.textChunk.createMany({
        data: textChunks.map((chunk: { content: string; hash: string; index: number }) => ({
          documentId: docId,
          index: chunk.index,
          content: chunk.content,
          hash: chunk.hash,
        })),
        skipDuplicates: true,
      });
    }

    // Persist regex-detected entities as GraphNode + GraphEdge
    for (const ent of detectedEntities) {
      try {
        const node = await prisma.graphNode.upsert({
          where: { label_type: { label: ent.text, type: ent.type } },
          create: { label: ent.text, type: ent.type },
          update: {},
        });
        await prisma.graphEdge.create({
          data: {
            nodeId: node.id,
            documentId: docId,
            weight: 2.0,
          },
        });
      } catch (e) {
        // Skip duplicate edges
      }
    }

    if (autoAI) {
      // Update to verifying for AI phase instead of ready or processing
      await prisma.document.update({
        where: { id: docId },
        data: {
          status: "verifying",
          pageCount: pages.length,
          ocrText: fullOcrText,
          markdownContent: markdownContent,
        },
      });

      // Chain Gemini phase
      const { processWithGemini } = await import("./processDocumentAI");
      processWithGemini(docId);
    } else {
      // Update Document status
      await prisma.document.update({
        where: { id: docId },
        data: {
          status: "ready",
          pageCount: pages.length,
          ocrText: fullOcrText,
          markdownContent: markdownContent,
        },
      });
    }
  } catch (err) {
    console.error("Failed to start processing job", err);
    await prisma.document
      .update({
        where: { id: docId },
        data: { status: "error" },
      })
      .catch(console.error);
  }
}