import { NextResponse } from "next/server";
import { cleanupVerifiedPdfs } from "@/lib/cleanupVerifiedPdfs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    const cronSecret = process.env.CRON_SECRET;

    // Ensure secret exists and matches
    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await cleanupVerifiedPdfs();

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
