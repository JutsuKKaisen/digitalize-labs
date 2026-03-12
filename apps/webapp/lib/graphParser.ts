/**
 * graphParser.ts — Obsidian-Style Knowledge Graph Parser
 *
 * Parses [[wikilinks]] and #tags from enriched Markdown content,
 * builds bidirectional nodes & edges for the Knowledge Graph.
 */

import type { GraphNode, GraphEdge } from "@/types";

// =====================================================
// Parsing Utilities
// =====================================================

export interface ParsedLink {
    target: string;
    sourceDocId: string;
}

export interface ParsedTag {
    tag: string;
    sourceDocId: string;
}

/**
 * Extract all [[wikilinks]] from markdown content.
 */
export function extractWikilinks(
    markdown: string,
    docId: string,
): ParsedLink[] {
    if (!markdown) return [];
    const regex = /\[\[([^\]]+)\]\]/g;
    const links: ParsedLink[] = [];
    const seen = new Set<string>();
    let match;
    while ((match = regex.exec(markdown)) !== null) {
        const target = match[1].trim();
        const key = target.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            links.push({ target, sourceDocId: docId });
        }
    }
    return links;
}

/**
 * Extract all #tags from markdown content.
 */
export function extractTags(markdown: string, docId: string): ParsedTag[] {
    if (!markdown) return [];
    // Match #tag but not inside [[...]] — simple approach: match all #word patterns
    const regex = /#([a-zA-Z0-9_\u00C0-\u1EF9]+)/g;
    const tags: ParsedTag[] = [];
    const seen = new Set<string>();
    let match;
    while ((match = regex.exec(markdown)) !== null) {
        const tag = match[1].trim().toLowerCase();
        if (!seen.has(tag)) {
            seen.add(tag);
            tags.push({ tag, sourceDocId: docId });
        }
    }
    return tags;
}

// =====================================================
// Entity Type Mapping
// =====================================================

/** Map Python NER/regex entity types to UI-friendly GraphNode entityType */
const ENTITY_TYPE_MAP: Record<string, GraphNode["entityType"]> = {
    PER: "person",
    ORG: "org",
    LOC: "location",
    KEYWORD: "concept",
    DECREE: "decree",
    LAW: "law",
    CIRCULAR: "circular",
    RESOLUTION: "concept", // Resolution maps to concept (no dedicated type)
    CLAUSE: "clause",
    TAG: "tag",
};

export function mapEntityType(
    rawType: string,
): GraphNode["entityType"] {
    return ENTITY_TYPE_MAP[rawType] || "concept";
}

// =====================================================
// Graph Builder
// =====================================================

interface DocumentInput {
    id: string;
    title: string;
    markdownContent: string | null;
}

interface GraphBuildResult {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/**
 * Build a full bidirectional knowledge graph from documents' markdown content.
 *
 * Algorithm (Obsidian-inspired):
 * 1. Each Document becomes a "document" node.
 * 2. Parse [[wikilinks]] from each document's markdownContent.
 * 3. Each unique wikilink target becomes an entity node.
 * 4. Create edges: Document → Entity (mentions).
 * 5. When two documents share the same entity, they are implicitly
 *    connected through that entity node (bidirectional backlinks).
 * 6. Parse #tags and create tag nodes with edges.
 * 7. Compute backlinkCount for each node.
 */
export function buildGraphFromDocuments(
    documents: DocumentInput[],
    existingNodes?: Array<{ id: string; label: string; type: string }>,
    existingEdges?: Array<{
        nodeId: string;
        documentId: string;
        weight: number;
        node: { id: string; label: string; type: string };
    }>,
): GraphBuildResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>(); // key: lowercase label → node
    const edgeSet = new Set<string>(); // "fromId::toId" to prevent duplicates
    const backlinkCounts = new Map<string, number>(); // nodeId → count

    // Helper: get or create a node
    const getOrCreateNode = (
        label: string,
        entityType: GraphNode["entityType"],
        idPrefix: string,
    ): GraphNode => {
        const key = label.toLowerCase();
        const existing = nodeMap.get(key);
        if (existing) return existing;

        const node: GraphNode = {
            id: `${idPrefix}_${key.replace(/\s+/g, "_").substring(0, 50)}`,
            entityType,
            label,
            weight: 0.5,
            backlinkCount: 0,
        };
        nodeMap.set(key, node);
        nodes.push(node);
        return node;
    };

    // Helper: add an edge (deduplicated)
    const addEdge = (
        fromId: string,
        toId: string,
        relation: string,
        weight: number = 0.5,
    ) => {
        const edgeKey = `${fromId}::${toId}`;
        if (edgeSet.has(edgeKey)) return;
        edgeSet.add(edgeKey);
        edges.push({
            id: `e_${fromId}_${toId}`.substring(0, 100),
            from: fromId,
            to: toId,
            relation,
            weight,
        });

        // Track backlinks
        backlinkCounts.set(toId, (backlinkCounts.get(toId) || 0) + 1);
        backlinkCounts.set(fromId, (backlinkCounts.get(fromId) || 0) + 1);
    };

    // Step 1: Create document nodes
    for (const doc of documents) {
        const docNode = getOrCreateNode(
            doc.title.replace(/\.[^.]+$/, "").substring(0, 40),
            "document",
            "doc",
        );
        // Override ID to use actual doc ID for navigation
        docNode.id = `doc_${doc.id}`;
        docNode.weight = 1.0;
    }

    // Step 2: Parse [[wikilinks]] from markdownContent and create entity nodes + edges
    for (const doc of documents) {
        if (!doc.markdownContent) continue;
        const docNodeId = `doc_${doc.id}`;

        const links = extractWikilinks(doc.markdownContent, doc.id);
        for (const link of links) {
            const entityNode = getOrCreateNode(link.target, "concept", "ent");
            addEdge(docNodeId, entityNode.id, "mentions", 1.0);
        }

        const tags = extractTags(doc.markdownContent, doc.id);
        for (const tag of tags) {
            const tagNode = getOrCreateNode(`#${tag.tag}`, "tag", "tag");
            addEdge(docNodeId, tagNode.id, "tagged", 0.8);
        }
    }

    // Step 3: Incorporate existing DB-stored nodes/edges (from NER + YAKE)
    if (existingNodes && existingEdges) {
        for (const edge of existingEdges) {
            const n = edge.node;
            const entityType = mapEntityType(n.type);
            const entityNode = getOrCreateNode(n.label, entityType, "kw");

            const docNodeId = `doc_${edge.documentId}`;
            addEdge(docNodeId, entityNode.id, "contains", edge.weight);
        }
    }

    // Step 4: Apply backlinkCounts to all nodes
    for (const node of nodes) {
        node.backlinkCount = backlinkCounts.get(node.id) || 0;
        // Boost weight by connectivity
        node.weight = Math.min(
            1.0,
            (node.weight || 0.5) + (node.backlinkCount || 0) * 0.05,
        );
    }

    return { nodes, edges };
}

// =====================================================
// Local Graph Filter
// =====================================================

/**
 * Filter a full graph to show only nodes connected to a specific document.
 * Returns the "Local Graph" — one hop from the target document.
 */
export function getLocalGraph(
    fullGraph: GraphBuildResult,
    docId: string,
): GraphBuildResult {
    const targetNodeId = `doc_${docId}`;

    // Find all directly connected node IDs
    const connectedIds = new Set<string>();
    connectedIds.add(targetNodeId);

    for (const edge of fullGraph.edges) {
        if (edge.from === targetNodeId) connectedIds.add(edge.to);
        if (edge.to === targetNodeId) connectedIds.add(edge.from);
    }

    // Also include nodes one hop further (entity → other documents)
    const entityIds = new Set<string>();
    for (const edge of fullGraph.edges) {
        if (edge.from === targetNodeId) entityIds.add(edge.to);
        if (edge.to === targetNodeId) entityIds.add(edge.from);
    }
    for (const edge of fullGraph.edges) {
        if (entityIds.has(edge.from)) connectedIds.add(edge.to);
        if (entityIds.has(edge.to)) connectedIds.add(edge.from);
    }

    const filteredNodes = fullGraph.nodes.filter((n) =>
        connectedIds.has(n.id),
    );
    const filteredEdges = fullGraph.edges.filter(
        (e) => connectedIds.has(e.from) && connectedIds.has(e.to),
    );

    return { nodes: filteredNodes, edges: filteredEdges };
}
