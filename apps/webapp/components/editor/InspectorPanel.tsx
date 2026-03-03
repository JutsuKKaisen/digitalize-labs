"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { Token, Page } from "@/types";
import { Button } from "@/components/ui/LayoutComponents";
import { X, Merge, Split, AlertTriangle, Save } from "lucide-react";
import { api } from "@/lib/api";

interface InspectorPanelProps {
  tokens: Token[];
  page: Page;
  onRefresh: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  tokens,
  page,
  onRefresh,
}) => {
  const { selectedTokenId, multiSelectedTokenIds, clearSelection } = useStore();
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedToken = tokens.find((t) => t.id === selectedTokenId);
  const multiTokens = tokens
    .filter((t) => multiSelectedTokenIds.includes(t.id))
    .sort((a, b) => a.tokenNo - b.tokenNo);

  React.useEffect(() => {
    if (selectedToken)
      setEditText(selectedToken.textVerified || selectedToken.textOcr);
  }, [selectedToken]);

  const handleSave = async () => {
    if (!selectedToken) return;
    setLoading(true);
    await api.submitCorrections(page.id, [
      {
        op: "replace_text",
        tokenId: selectedToken.id,
        newText: editText,
      },
    ]);
    setLoading(false);
    onRefresh();
  };

  const handleMerge = async () => {
    if (multiTokens.length < 2) return;
    setLoading(true);
    const newText = multiTokens
      .map((t) => t.textVerified || t.textOcr)
      .join("");
    await api.submitCorrections(page.id, [
      {
        op: "merge_tokens",
        tokenIds: multiTokens.map((t) => t.id),
        newText,
      },
    ]);
    clearSelection();
    setLoading(false);
    onRefresh();
  };

  const handleMarkReview = async () => {
    if (!selectedToken) return;
    setLoading(true);
    await api.submitCorrections(page.id, [
      {
        op: "mark_needs_review",
        scope: "token",
        id: selectedToken.id,
      },
    ]);
    setLoading(false);
    onRefresh();
  };

  if (!selectedTokenId && multiSelectedTokenIds.length === 0) {
    return (
      <div className="w-80 bg-card border-l border-border p-6 flex flex-col items-center justify-center text-muted-foreground text-center h-full shadow-sm">
        <p>Select a token to inspect metadata or correct OCR errors.</p>
        <p className="text-xs mt-4 opacity-70">
          Hold Ctrl/Cmd to select multiple for merging.
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full shadow-xl z-20">
      <div className="p-4 border-b border-border bg-muted flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Inspector</h3>
        <button
          onClick={clearSelection}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {multiSelectedTokenIds.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded-md">
              <span className="text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center gap-2">
                <Merge size={14} /> {multiSelectedTokenIds.length} tokens
                selected
              </span>
            </div>
            <div className="text-sm text-foreground font-mono bg-muted p-2 rounded border border-border break-all">
              {multiTokens.map((t) => t.textVerified || t.textOcr).join("")}
            </div>
            <Button className="w-full" onClick={handleMerge} disabled={loading}>
              {loading ? "Merging..." : "Merge Tokens"}
            </Button>
          </div>
        ) : (
          selectedToken && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Text Content
                </label>
                <textarea
                  className="w-full bg-muted border border-border rounded p-2 text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted p-2 rounded border border-border">
                  <span className="text-xs text-muted-foreground block">
                    Confidence
                  </span>
                  <span
                    className={
                      selectedToken.confidence > 0.85
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-amber-600 dark:text-amber-400 font-medium"
                    }
                  >
                    {(selectedToken.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-muted p-2 rounded border border-border">
                  <span className="text-xs text-muted-foreground block">
                    Token ID
                  </span>
                  <span
                    className="text-muted-foreground text-xs truncate block"
                    title={selectedToken.id}
                  >
                    ...{selectedToken.id.slice(-6)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={loading}
                >
                  <Save size={14} /> Save Changes
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      alert("Split logic UI modal would open here")
                    }
                    disabled={loading}
                  >
                    <Split size={14} /> Split
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleMarkReview}
                    disabled={loading}
                  >
                    <AlertTriangle size={14} /> Flag
                  </Button>
                </div>
              </div>
            </>
          )
        )}
      </div>

      <div className="p-4 border-t border-border text-xs text-muted-foreground font-mono bg-muted/50">
        BBox: [{selectedToken?.bbox.x}, {selectedToken?.bbox.y},{" "}
        {selectedToken?.bbox.w}, {selectedToken?.bbox.h}]
      </div>
    </div>
  );
};
