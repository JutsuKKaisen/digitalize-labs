import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildGraphFromDocuments,
  getLocalGraph,
  mapEntityType,
} from "@/lib/graphParser";
import type { GraphNode, GraphEdge } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/graph/summary?limitNodes=200&mode=global
 * GET /api/graph/summary?mode=local&docId=xxx
 *
 * Returns the Knowledge Graph with bidirectional Obsidian-style links.
 *
 * Modes:
 * - "global" (default): Full knowledge graph across all documents.
 * - "local":  Single document's connected network (Obsidian Local Graph).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitNodes = parseInt(searchParams.get("limitNodes") || "200", 10);
    const mode = searchParams.get("mode") || "global";
    const docId = searchParams.get("docId") || null;

    // Fetch processed documents with their markdownContent for parsing
    const docs = await prisma.document.findMany({
      where: {
        status: { in: ["ready", "verified"] },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        markdownContent: true,
        ocrText: true,
      },
      take: mode === "local" ? 100 : 50,
    });

    if (docs.length === 0) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    const docIds = docs.map((d) => d.id);

    // Fetch existing DB-stored graph nodes/edges (from Python NER + YAKE)
    const dbEdges = await prisma.graphEdge.findMany({
      where: { documentId: { in: docIds } },
      include: { node: true },
    });

    // Build the graph using the Obsidian algorithm
    const documentInputs = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      markdownContent: doc.markdownContent || null,
    }));

    const dbExistingNodes = dbEdges.map((e) => ({
      id: e.node.id,
      label: e.node.label,
      type: e.node.type,
    }));

    const dbExistingEdges = dbEdges.map((e) => ({
      nodeId: e.nodeId,
      documentId: e.documentId,
      weight: e.weight,
      node: {
        id: e.node.id,
        label: e.node.label,
        type: e.node.type,
      },
    }));

    let graph = buildGraphFromDocuments(
      documentInputs,
      dbExistingNodes,
      dbExistingEdges,
    );

    // Apply mode filter
    if (mode === "local" && docId) {
      graph = getLocalGraph(graph, docId);
    }

    // Apply node limit (keep document nodes + top entities by backlinkCount)
    if (graph.nodes.length > limitNodes) {
      const docNodes = graph.nodes.filter((n) =>
        n.entityType === "document",
      );
      const entityNodes = graph.nodes
        .filter((n) => n.entityType !== "document")
        .sort((a, b) => (b.backlinkCount || 0) - (a.backlinkCount || 0))
        .slice(0, limitNodes - docNodes.length);

      const keepIds = new Set([
        ...docNodes.map((n) => n.id),
        ...entityNodes.map((n) => n.id),
      ]);

      graph = {
        nodes: graph.nodes.filter((n) => keepIds.has(n.id)),
        edges: graph.edges.filter(
          (e) => keepIds.has(e.from) && keepIds.has(e.to),
        ),
      };
    }

    return NextResponse.json({
      nodes: graph.nodes,
      edges: graph.edges,
      meta: {
        mode,
        totalDocuments: docs.length,
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
      },
    });
  } catch (error) {
    console.error("Error generating graph summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
