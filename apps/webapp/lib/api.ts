import {
  Document,
  Page,
  Token,
  Line,
  PatchSummary,
  SearchResult,
  GraphNode,
  GraphEdge,
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function normalizeId(id: string) {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

async function fetchClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!res.ok) throw new Error(`API request failed: ${res.statusText}`);
  return res.json();
}

export const api = {
  getDocuments: async (): Promise<{ documents: Document[] }> => {
    return fetchClient("/api/documents");
  },

  getDocument: async (
    idRaw: string,
  ): Promise<{ document: Document; pages: Page[] }> => {
    const id = normalizeId(idRaw);
    return fetchClient(`/api/documents/${encodeURIComponent(id)}`);
  },

  getPageAssets: async (
    pageId: string,
  ): Promise<{
    page: Page;
    image: { signedUrl: string; width: number; height: number };
    lines: Line[];
    tokens: Token[];
    patchSummary?: PatchSummary;
  }> => {
    return fetchClient(`/api/pages/${encodeURIComponent(pageId)}/assets`);
  },

  search: async (q: string): Promise<{ results: SearchResult[] }> => {
    return fetchClient(`/api/search?q=${encodeURIComponent(q)}`);
  },

  getGraphSummary: async (
    limit: number,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
    return fetchClient(`/api/graph/summary?limitNodes=${limit}`);
  },

  getProcessingStatus: async () => {
    return fetchClient("/api/processing/status");
  },

  extractWithAI: async (
    docId: string,
  ): Promise<{ success: boolean; status: string }> => {
    return fetchClient(`/api/documents/${encodeURIComponent(docId)}/extract`, {
      method: "POST",
    });
  },

  submitCorrections: async (
    pageId: string,
    ops: any[],
  ): Promise<{ ok: boolean; regenScheduled: boolean }> => {
    return fetchClient(`/api/pages/${encodeURIComponent(pageId)}/corrections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops }),
    });
  },

  triggerCleanup: async (
    token: string,
  ): Promise<{ success: boolean; summary: any }> => {
    return fetchClient("/api/cron/cleanup", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
