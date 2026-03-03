import { prisma } from "./prisma";
import fs from "fs/promises";
import { env } from "process";

export async function cleanupVerifiedPdfs() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find documents verified more than 7 days ago containing a file path
  const docsToClean = await prisma.document.findMany({
    where: {
      status: "verified",
      verifiedAt: { lt: sevenDaysAgo },
      filePath: { not: null },
    },
  });

  let deleted = 0;
  let errors = 0;

  for (const doc of docsToClean) {
    if (!doc.filePath) continue;

    try {
      await fs.unlink(doc.filePath);

      await prisma.document.update({
        where: { id: doc.id },
        data: { filePath: null },
      });

      deleted++;
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code === "ENOENT") {
        await prisma.document.update({
          where: { id: doc.id },
          data: { filePath: null },
        });
        deleted++;
      } else {
        console.error(`Failed to delete PDF for doc ${doc.id}:`, error);
        errors++;
      }
    }
  }

  return {
    scanned: docsToClean.length,
    deleted,
    errors,
  };
}
