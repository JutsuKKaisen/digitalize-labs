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

    // Using CTE to first find matching documents, compute backlink counts, and then get snippet chunks
    const resultsRaw = await prisma.$queryRaw<any[]>`
      WITH matched_docs AS (
          SELECT 
              "id" as "docId", 
              "title" as "docTitle",
              ts_rank("searchVector", websearch_to_tsquery('simple', ${query})) AS "baseRank"
          FROM "Document"
          WHERE "searchVector" @@ websearch_to_tsquery('simple', ${query})
          LIMIT 50
      ),
      doc_stats AS (
          SELECT "documentId", COUNT(id)::int as "backlinkCount"
          FROM "GraphEdge"
          WHERE "documentId" IN (SELECT "docId" FROM matched_docs)
          GROUP BY "documentId"
      ),
      matched_chunks AS (
          SELECT 
              c."documentId" as "docId",
              c.index as "chunkIndex",
              ts_headline('simple', c.content, websearch_to_tsquery('simple', ${query}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10, ShortWord=2') as snippet,
              ROW_NUMBER() OVER(PARTITION BY c."documentId" ORDER BY c.index ASC) as rn
          FROM "TextChunk" c
          WHERE c."documentId" IN (SELECT "docId" FROM matched_docs)
            AND to_tsvector('simple', c.content) @@ websearch_to_tsquery('simple', ${query})
      )
      SELECT 
          d."docId",
          d."docTitle",
          COALESCE(s."backlinkCount", 0) as "backlinkCount",
          d."baseRank",
          (d."baseRank" * (1.0 + COALESCE(s."backlinkCount", 0) * 0.1)) as "boostedRank",
          c."chunkIndex",
          COALESCE(c.snippet, ts_headline('simple', d."docTitle", websearch_to_tsquery('simple', ${query}), 'StartSel=<mark>, StopSel=</mark>')) as "snippet"
      FROM matched_docs d
      LEFT JOIN doc_stats s ON d."docId" = s."documentId"
      LEFT JOIN matched_chunks c ON d."docId" = c."docId" AND c.rn = 1
      ORDER BY "boostedRank" DESC
      LIMIT 20;
    `;

    const results: SearchResult[] = resultsRaw.map((r: any) => ({
      docId: r.docId,
      docTitle: r.docTitle,
      pageId: r.docId,
      pageNo: 1,
      snippet: r.snippet || "No snippet available",
      chunkIndex: r.chunkIndex ?? undefined,
      boostedRank: r.boostedRank,
      backlinkCount: r.backlinkCount,
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
