"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { Token, Line, Page } from "@/types";
import clsx from "clsx";

interface HITLTextPanelProps {
  tokens: Token[];
  lines: Line[];
  page: Page;
}

export const HITLTextPanel: React.FC<HITLTextPanelProps> = ({
  tokens,
  lines,
}) => {
  const {
    selectedTokenId,
    selectToken,
    multiSelectedTokenIds,
    toggleMultiSelectToken,
    viewMode,
  } = useStore();

  const handleTokenClick = (e: React.MouseEvent, token: Token) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey) toggleMultiSelectToken(token.id);
    else selectToken(token.id);
  };

  // Group tokens by lineId
  const lineTokensMap = React.useMemo(() => {
    const map: Record<string, Token[]> = {};
    for (const t of tokens) {
      if (!map[t.lineId]) map[t.lineId] = [];
      map[t.lineId].push(t);
    }
    // Sort tokens within line
    for (const lineId in map) {
      map[lineId].sort((a, b) => a.tokenNo - b.tokenNo);
    }
    return map;
  }, [tokens]);

  const sortedLines = React.useMemo(() => {
    return [...lines].sort((a, b) => a.lineNo - b.lineNo);
  }, [lines]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-card border-l border-border p-8 font-serif leading-relaxed text-lg transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        {sortedLines.map((line) => {
          const lineTokens = lineTokensMap[line.id] || [];
          return (
            <div key={line.id} className="tracking-wide">
              {lineTokens.map((token) => {
                const isSelected =
                  selectedTokenId === token.id ||
                  multiSelectedTokenIds.includes(token.id);
                const isLowConf = token.confidence < 0.85;

                return (
                  <span
                    key={token.id}
                    onClick={(e) => handleTokenClick(e, token)}
                    className={clsx(
                      "cursor-pointer transition-all mx-px px-px rounded",
                      isSelected &&
                        "bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100",
                      !isSelected &&
                        isLowConf &&
                        "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 underline decoration-wavy",
                      !isSelected &&
                        !isLowConf &&
                        "hover:bg-muted text-foreground",
                    )}
                    title={
                      isLowConf
                        ? `Confidence: ${(token.confidence * 100).toFixed(1)}%`
                        : undefined
                    }
                  >
                    {viewMode === "verified" && token.textVerified !== null
                      ? token.textVerified
                      : token.textOcr}{" "}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
