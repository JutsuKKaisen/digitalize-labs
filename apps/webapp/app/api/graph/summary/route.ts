import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type GraphNode = {
  id: string;
  label: string;
  entityType: "person" | "location" | "org" | "concept";
  weight: number;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
  weight: number;
};

/**
 * GET /api/graph/summary?limitNodes=100
 * Returns graph nodes and edges for the knowledge graph visualization.
 * Generates graph data based on real document entities from the database.
 * In production, this would query a real entity extraction / NER store.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitNodes = parseInt(searchParams.get("limitNodes") || "200", 10);

    // Check if we have any real documents to base the graph on
    const docs = await prisma.document.findMany({
      where: { status: { in: ["ready", "verified"] } },
      select: { id: true, title: true },
      take: 20,
    });

    if (docs.length === 0) {
      // No processed documents — return empty graph
      return NextResponse.json({ nodes: [], edges: [] });
    }

    const docIds = docs.map(d => d.id);

    // Fetch actual explicit nodes and edges related to these documents
    const graphEdges = await prisma.graphEdge.findMany({
      where: { documentId: { in: docIds } },
      include: { node: true },
    });

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const addedNodes = new Set<string>();

    // 1. Add Document Nodes
    docs.forEach(doc => {
      nodes.push({
        id: `doc_${doc.id}`,
        label: doc.title.replace(/\.[^.]+$/, "").substring(0, 30),
        entityType: "location", // Doc nodes will use Location color scheme
        weight: 1.0,
      });
      addedNodes.add(`doc_${doc.id}`);
    });

    // 2. Add Entity/Keyword Nodes and Edges
    const nodeCounts: Record<string, number> = {};
    graphEdges.forEach(e => {
      nodeCounts[e.nodeId] = (nodeCounts[e.nodeId] || 0) + 1;
    });

    // Filter to top N nodes to avoid clutter
    const topNodeIds = new Set(
      Object.entries(nodeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limitNodes)
        .map(entry => entry[0])
    );

    graphEdges.forEach(e => {
      if (!topNodeIds.has(e.nodeId)) return;

      const n = e.node;
      const kwId = `kw_${n.id}`; // using prefix for UI disambiguation

      if (!addedNodes.has(kwId)) {
        let eType: "person" | "location" | "org" | "concept" = "concept";
        if (n.type === "PER") eType = "person";
        else if (n.type === "ORG") eType = "org";
        else if (n.type === "LOC") eType = "location";

        nodes.push({
          id: kwId,
          label: n.label,
          entityType: eType,
          weight: Math.min((nodeCounts[n.id] || 1) * 0.2, 1.0),
        });
        addedNodes.add(kwId);
      }

      edges.push({
        id: `e_${e.documentId}_${n.id}`,
        from: `doc_${e.documentId}`,
        to: kwId,
        relation: "contains",
        weight: e.weight || 0.5,
      });
    });

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("Error generating graph summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
