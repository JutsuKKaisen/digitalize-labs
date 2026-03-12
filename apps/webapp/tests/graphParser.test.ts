/**
 * graphParser.test.ts — Tests for the Obsidian-style graph parser utility.
 * Run with: npx vitest run tests/graphParser.test.ts
 */

import { describe, it, expect } from "vitest";
import {
    extractWikilinks,
    extractTags,
    buildGraphFromDocuments,
    getLocalGraph,
    mapEntityType,
} from "@/lib/graphParser";

describe("extractWikilinks", () => {
    it("returns empty array for null/empty input", () => {
        expect(extractWikilinks("", "doc1")).toEqual([]);
        expect(extractWikilinks(null as any, "doc1")).toEqual([]);
    });

    it("extracts single wikilink", () => {
        const result = extractWikilinks("Theo [[Nghị định 13/2023]] về quản lý.", "doc1");
        expect(result).toHaveLength(1);
        expect(result[0].target).toBe("Nghị định 13/2023");
        expect(result[0].sourceDocId).toBe("doc1");
    });

    it("extracts multiple wikilinks", () => {
        const result = extractWikilinks(
            "Căn cứ [[Nghị định 13/2023]] và [[Luật Doanh nghiệp 2020]] tại [[Điều 5]].",
            "doc1",
        );
        expect(result).toHaveLength(3);
    });

    it("deduplicates case-insensitively", () => {
        const result = extractWikilinks(
            "[[Entity A]] rồi [[entity a]] lặp lại.",
            "doc1",
        );
        expect(result).toHaveLength(1);
    });
});

describe("extractTags", () => {
    it("returns empty array for null/empty input", () => {
        expect(extractTags("", "doc1")).toEqual([]);
        expect(extractTags(null as any, "doc1")).toEqual([]);
    });

    it("extracts tags", () => {
        const result = extractTags("#decree #law #clause\n\nSome text here.", "doc1");
        expect(result).toHaveLength(3);
        expect(result.map((t) => t.tag)).toEqual(
            expect.arrayContaining(["decree", "law", "clause"]),
        );
    });

    it("deduplicates tags", () => {
        const result = extractTags("#decree some text #DECREE more text #decree", "doc1");
        expect(result).toHaveLength(1);
    });
});

describe("mapEntityType", () => {
    it("maps known types", () => {
        expect(mapEntityType("PER")).toBe("person");
        expect(mapEntityType("ORG")).toBe("org");
        expect(mapEntityType("LOC")).toBe("location");
        expect(mapEntityType("DECREE")).toBe("decree");
        expect(mapEntityType("LAW")).toBe("law");
        expect(mapEntityType("CLAUSE")).toBe("clause");
        expect(mapEntityType("TAG")).toBe("tag");
    });

    it("defaults to concept for unknown types", () => {
        expect(mapEntityType("UNKNOWN")).toBe("concept");
        expect(mapEntityType("")).toBe("concept");
    });
});

describe("buildGraphFromDocuments", () => {
    it("returns empty graph for empty input", () => {
        const result = buildGraphFromDocuments([]);
        expect(result.nodes).toEqual([]);
        expect(result.edges).toEqual([]);
    });

    it("creates document nodes", () => {
        const result = buildGraphFromDocuments([
            { id: "d1", title: "Contract A.pdf", markdownContent: null },
        ]);
        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0].id).toBe("doc_d1");
        expect(result.nodes[0].entityType).toBe("document");
    });

    it("creates entity nodes from wikilinks", () => {
        const result = buildGraphFromDocuments([
            {
                id: "d1",
                title: "Contract A",
                markdownContent: "Theo [[Nghị định 13/2023]] về [[Điều 5]].",
            },
        ]);
        // 1 doc node + 2 entity nodes
        expect(result.nodes.length).toBeGreaterThanOrEqual(3);
        // 2 edges: doc -> decree, doc -> clause
        expect(result.edges.length).toBeGreaterThanOrEqual(2);
    });

    it("creates bidirectional connections via shared entities", () => {
        const result = buildGraphFromDocuments([
            {
                id: "d1",
                title: "Contract A",
                markdownContent: "Căn cứ [[Nghị định 13/2023]].",
            },
            {
                id: "d2",
                title: "Contract B",
                markdownContent: "Theo [[Nghị định 13/2023]] ban hành.",
            },
        ]);
        // Both docs should connect to the same entity node
        const entityNode = result.nodes.find((n) =>
            n.label.toLowerCase().includes("nghị định"),
        );
        expect(entityNode).toBeDefined();
        // Should have edges from both docs to the shared entity
        const entityEdges = result.edges.filter(
            (e) => e.to === entityNode!.id || e.from === entityNode!.id,
        );
        expect(entityEdges.length).toBeGreaterThanOrEqual(2);
    });

    it("computes backlinkCount", () => {
        const result = buildGraphFromDocuments([
            {
                id: "d1",
                title: "A",
                markdownContent: "[[Entity X]] and [[Entity Y]].",
            },
            {
                id: "d2",
                title: "B",
                markdownContent: "Also [[Entity X]].",
            },
        ]);
        const entityX = result.nodes.find((n) =>
            n.label.toLowerCase().includes("entity x"),
        );
        expect(entityX?.backlinkCount).toBeGreaterThanOrEqual(2);
    });

    it("creates tag nodes from #tags", () => {
        const result = buildGraphFromDocuments([
            {
                id: "d1",
                title: "A",
                markdownContent: "#decree #law\n\nSome content.",
            },
        ]);
        const tagNodes = result.nodes.filter((n) => n.entityType === "tag");
        expect(tagNodes.length).toBeGreaterThanOrEqual(2);
    });
});

describe("getLocalGraph", () => {
    it("filters to connected nodes only", () => {
        const fullGraph = buildGraphFromDocuments([
            { id: "d1", title: "A", markdownContent: "[[Entity X]]" },
            { id: "d2", title: "B", markdownContent: "[[Entity Y]]" },
            { id: "d3", title: "C", markdownContent: "[[Entity X]]" },
        ]);
        const local = getLocalGraph(fullGraph, "d1");
        // d1, Entity X, and d3 (connected via Entity X) should be included
        // d2 and Entity Y should NOT be included
        const hasD2 = local.nodes.some((n) => n.id === "doc_d2");
        expect(hasD2).toBe(false);
        const hasD1 = local.nodes.some((n) => n.id === "doc_d1");
        expect(hasD1).toBe(true);
    });
});
