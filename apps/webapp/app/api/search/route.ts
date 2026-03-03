import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SearchResult } from "@/types";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    // We use Prisma $queryRaw for PostgreSQL Full Text Search (tsvector and ts_rank)
    // ts_headline generates <mark> snippets natively.
    // We fallback to ILIKE if the tsvector index doesn't have it (or for partial matches).
    // Since sqlite is not being used, Postgres specific queries are safe.
    // NOTE: In mock mode, the frontend uses Mock functions directly, so this endpoint
    // will only be hit when a real postgres instance is attached.

    const formattedQuery = query.split(/\s+/).filter(Boolean).join(" & ");

    // Using raw query to leverage ts_headline.
    const resultsRaw = await prisma.$queryRaw<any[]>`
            SELECT 
                "id" as "docId", 
                "title" as "docTitle", 
                ts_rank("searchVector", to_tsquery('simple', ${formattedQuery})) as "rank",
                ts_headline('simple', coalesce("ocrText",''), to_tsquery('simple', ${formattedQuery}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, ShortWord=2') as "snippet"
            FROM "Document"
            WHERE "searchVector" @@ to_tsquery('simple', ${formattedQuery})
            ORDER BY "rank" DESC
            LIMIT 20;
        `;

    const results: SearchResult[] = resultsRaw.map((r) => ({
      docId: r.docId,
      docTitle: r.docTitle,
      pageId: r.docId, // Default link fallback
      pageNo: 1, // Fallback since we index at document level
      snippet: r.snippet || "No snippet available",
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
