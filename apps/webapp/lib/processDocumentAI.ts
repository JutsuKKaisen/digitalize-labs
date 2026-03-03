import { prisma } from "./prisma";
import fs from "fs/promises";
import path from "path";
import { geminiModel, buildExtractionPrompt } from "./gemini";

export async function processWithGemini(docId: string) {
  try {
    const pages = await prisma.page.findMany({
      where: { documentId: docId },
      orderBy: { pageNo: "asc" },
    });

    if (pages.length === 0) {
      console.log("No pages found for AI extraction");
      return;
    }

    let fullXmlData = "<Document>\n";

    for (const page of pages) {
      try {
        // The imageUrl is a static path /mock/docId/page_0.jpg
        // We need to map it to absolute path
        const relativePath = page.imageUrl.replace(/^\//, ""); // remove leading slash
        const absolutePath = path.join(process.cwd(), "public", relativePath);

        const imageBuffer = await fs.readFile(absolutePath);
        const base64Data = imageBuffer.toString("base64");
        const mimeType = absolutePath.endsWith("png")
          ? "image/png"
          : "image/jpeg";

        const prompt = buildExtractionPrompt();
        const result = await geminiModel.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ]);

        // Strip markdown formatting if it exists
        let xmlChunk = result.response.text();
        xmlChunk = xmlChunk.replace(/^```xml\s*/, "").replace(/```$/, "");

        fullXmlData += `<Page number="${page.pageNo}">\n${xmlChunk}\n</Page>\n`;
      } catch (pageError) {
        console.error(
          `AI Extraction failed for page ${page.pageNo}:`,
          pageError,
        );
        fullXmlData += `<Page number="${page.pageNo}"><Error>Extraction failed</Error></Page>\n`;
      }
    }

    fullXmlData += "</Document>";

    await prisma.document.update({
      where: { id: docId },
      data: {
        xmlData: fullXmlData,
        status: "verified",
        verifiedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("AI Processing Job failed", e);
    await prisma.document
      .update({
        where: { id: docId },
        data: { status: "error" },
      })
      .catch(console.error);
  }
}
