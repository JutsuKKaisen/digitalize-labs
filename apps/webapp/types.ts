export interface Document {
  id: string;
  title: string;
  status: 'pending' | 'ingest' | 'processing' | 'ready' | 'error' | 'verified';
  pageCount: number;
  createdAt: string;
  needsReview: boolean;
  xmlData?: string;
  ocrText?: string;
  markdownContent?: string;
  verifiedAt?: string | null;
}

export interface Page {
  id: string;
  documentId: string;
  pageNo: number;
  status: 'pending' | 'ocr' | 'verified' | 'xml';
  needsReview: boolean;
  risky: boolean;
  imageUrl: string;
  width: number;
  height: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Token {
  id: string;
  lineId: string;
  tokenNo: number;
  bbox: BBox;
  textOcr: string;
  textVerified: string | null;
  confidence: number;
  bboxHeuristic?: boolean;
}

export interface Line {
  id: string;
  lineNo: number;
  bbox: BBox;
  textOcr: string;
}

export interface SearchResult {
  docId: string;
  docTitle: string;
  pageId: string;
  pageNo: number;
  snippet: string;
  chunkIndex?: number;
  boostedRank?: number;
  backlinkCount?: number;
}

export interface GraphNode {
  id: string;
  entityType: 'person' | 'location' | 'org' | 'concept' | 'decree' | 'law' | 'circular' | 'clause' | 'tag' | 'document';
  label: string;
  weight?: number;
  backlinkCount?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  weight: number;
}

export interface PatchSummary {
  risky: boolean;
  needsReview: boolean;
  totalOps: number;
}
