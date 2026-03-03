"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/ui/LayoutComponents";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ImageViewer } from "@/components/viewer/ImageViewer";
import { HITLTextPanel } from "@/components/editor/HITLTextPanel";
import { InspectorPanel } from "@/components/editor/InspectorPanel";
import { XMLViewerPanel } from "@/components/editor/XMLViewerPanel";
import {
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/LayoutComponents";
import { toast } from "sonner";
import { Token } from "@/types";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function normalizeId(id: string) {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

/**
 * METS/ALTO Validation Banner
 * Analyzes tokens for structural issues and OCR quality problems.
 */
function ValidationBanner({
  tokens,
  onClose,
}: {
  tokens: Token[];
  onClose: () => void;
}) {
  const issues = useMemo(() => {
    const result: Array<{
      type: "warning" | "error" | "info";
      message: string;
    }> = [];

    // Check for low confidence tokens
    const lowConfTokens = tokens.filter((t) => t.confidence < 0.85);
    if (lowConfTokens.length > 0) {
      const percentage = ((lowConfTokens.length / tokens.length) * 100).toFixed(
        1,
      );
      result.push({
        type: "warning",
        message: `${lowConfTokens.length} token(s) (${percentage}%) have low OCR confidence (<85%). Review highlighted regions.`,
      });
    }

    // Check for empty text tokens
    const emptyTokens = tokens.filter(
      (t) => !t.textOcr || t.textOcr.trim() === "",
    );
    if (emptyTokens.length > 0) {
      result.push({
        type: "error",
        message: `${emptyTokens.length} token(s) have empty OCR text. These may be image regions or extraction failures.`,
      });
    }

    // Check for tokens without bbox
    const noBboxTokens = tokens.filter(
      (t) => !t.bbox || (t.bbox.w === 0 && t.bbox.h === 0),
    );
    if (noBboxTokens.length > 0) {
      result.push({
        type: "error",
        message: `${noBboxTokens.length} token(s) have missing or zero-size bounding boxes.`,
      });
    }

    // Check for heuristic bboxes
    const heuristicTokens = tokens.filter((t) => t.bboxHeuristic);
    if (heuristicTokens.length > 0) {
      result.push({
        type: "info",
        message: `${heuristicTokens.length} token(s) use heuristic bounding boxes (not from ALTO). Visual alignment may be approximate.`,
      });
    }

    // Check METS/ALTO structural completeness
    const hasLines = tokens.some((t) => t.lineId);
    if (!hasLines && tokens.length > 0) {
      result.push({
        type: "warning",
        message: `No ALTO TextLine structure detected. Tokens are not grouped into lines.`,
      });
    }

    if (tokens.length === 0) {
      result.push({
        type: "info",
        message:
          "No OCR tokens found for this page. Run extraction to populate data.",
      });
    }

    return result;
  }, [tokens]);

  if (issues.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-b border-border bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      <div className="px-6 py-3 flex items-start gap-3">
        <div className="flex-1 space-y-1.5">
          {issues.map((issue, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-center gap-2 text-xs font-medium",
                issue.type === "error" && "text-red-600 dark:text-red-400",
                issue.type === "warning" &&
                  "text-amber-600 dark:text-amber-400",
                issue.type === "info" && "text-blue-600 dark:text-blue-400",
              )}
            >
              {issue.type === "error" && <AlertTriangle size={12} />}
              {issue.type === "warning" && <AlertTriangle size={12} />}
              {issue.type === "info" && <Info size={12} />}
              {issue.message}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export default function DocumentView({ params }: { params: { id: string } }) {
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const { viewMode, setViewMode, selectedTokenId, multiSelectedTokenIds } =
    useStore();
  const [showValidation, setShowValidation] = useState(true);

  const docId = useMemo(() => normalizeId(params.id), [params.id]);

  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtraWithAI = async () => {
    setIsExtracting(true);
    try {
      await api.extractWithAI(docId);
      toast.success("AI extraction started. Check back in a few seconds.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to start AI extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const {
    data: docData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["doc", docId],
    queryFn: () => api.getDocument(docId),
  });

  useEffect(() => {
    if (docData?.pages?.length && !activePageId) {
      setActivePageId(docData.pages[0].id);
    }
  }, [docData, activePageId]);

  const { data: pageAssets, refetch: refetchAssets } = useQuery({
    queryKey: ["pageAssets", activePageId],
    queryFn: () => api.getPageAssets(activePageId!),
    enabled: !!activePageId,
  });

  // Reset validation banner when page changes
  useEffect(() => {
    setShowValidation(true);
  }, [activePageId]);

  const showInspector = !!selectedTokenId || multiSelectedTokenIds.length > 0;

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Loading document...</div>;
  if (error)
    return <div className="p-8 text-red-600">Failed to load document.</div>;
  if (!docData)
    return <div className="p-8 text-muted-foreground">No document data.</div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background relative">
      <Topbar>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {docData.document.title}
          </span>
          <ChevronRight size={14} />
          <span>Page {pageAssets?.page.pageNo || "-"}</span>
        </div>

        <div className="ml-8 flex bg-muted rounded p-1 border border-border">
          <button
            onClick={() => setViewMode("verified")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded transition-all",
              viewMode === "verified"
                ? "bg-card text-blue-700 dark:text-blue-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Verified
          </button>
          <button
            onClick={() => setViewMode("ocr")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded transition-all",
              viewMode === "ocr"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            OCR
          </button>
          <button
            onClick={() => setViewMode("xml")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded transition-all",
              viewMode === "xml"
                ? "bg-card text-fuchsia-600 dark:text-fuchsia-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            XML
          </button>
        </div>

        <div className="ml-auto pr-4">
          {docData.document.status === "ready" && !docData.document.xmlData && (
            <Button
              size="sm"
              onClick={handleExtraWithAI}
              disabled={isExtracting}
              className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white shadow-md border-0"
            >
              {isExtracting ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <Sparkles size={14} className="mr-2" />
              )}
              Extract with AI
            </Button>
          )}
        </div>
      </Topbar>

      {/* METS/ALTO Validation Banner */}
      <AnimatePresence>
        {showValidation && pageAssets?.tokens && (
          <ValidationBanner
            tokens={pageAssets.tokens}
            onClose={() => setShowValidation(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Pages list */}
        <div className="w-56 bg-card border-r border-border flex flex-col overflow-y-auto shrink-0 z-10 relative">
          <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pages
          </div>
          {docData.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 text-sm border-l-4 transition-all text-left",
                activePageId === page.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-transparent text-foreground hover:bg-muted/50",
              )}
            >
              <div
                className={clsx(
                  "w-6 h-8 border rounded-sm flex items-center justify-center text-[10px] font-mono",
                  activePageId === page.id
                    ? "bg-card border-primary/30"
                    : "bg-muted border-border",
                )}
              >
                {page.pageNo}
              </div>

              <div className="flex-1">
                <div className="font-medium">Page {page.pageNo}</div>
                {page.needsReview && (
                  <div className="text-[10px] text-amber-500 font-medium">
                    Review Needed
                  </div>
                )}
              </div>

              {page.status === "verified" && (
                <CheckCircle2 size={12} className="text-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {/* HITL Split View: Viewer + Text Panel */}
        <div className="flex-1 flex overflow-hidden">
          {pageAssets ? (
            <>
              {/* PDF Image View */}
              <div className="flex-1 bg-muted relative border-r border-border">
                <ErrorBoundary
                  fallbackTitle="Viewer Error"
                  fallbackMessage="The document viewer encountered an error. Try selecting a different page."
                >
                  <ImageViewer
                    page={pageAssets.page}
                    imageUrl={pageAssets.image.signedUrl}
                    tokens={pageAssets.tokens}
                    lines={pageAssets.lines}
                    width={pageAssets.image.width}
                    height={pageAssets.image.height}
                  />
                </ErrorBoundary>
              </div>

              {/* Extracted Text View */}
              {viewMode === "xml" ? (
                <XMLViewerPanel xmlData={docData.document.xmlData} />
              ) : (
                <HITLTextPanel
                  tokens={pageAssets.tokens}
                  lines={pageAssets.lines}
                  page={pageAssets.page}
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full w-full text-muted-foreground">
              No page selected.
            </div>
          )}
        </div>

        {/* Inspector Drawer */}
        <AnimatePresence>
          {showInspector && pageAssets && (
            <motion.div
              initial={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
              animate={{ x: 0, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
              exit={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 z-20"
            >
              <InspectorPanel
                tokens={pageAssets.tokens}
                page={pageAssets.page}
                onRefresh={refetchAssets}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
