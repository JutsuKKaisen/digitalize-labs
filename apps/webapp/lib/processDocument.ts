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

    // Call the Python FastAPI worker
    const response = await fetch("process.env.PYTHON_ENGINE_URL", {
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

    if (autoAI) {
      // Update to processing for AI phase instead of ready
      await prisma.document.update({
        where: { id: docId },
        data: {
          status: "processing",
          pageCount: pages.length,
          ocrText: fullOcrText,
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
