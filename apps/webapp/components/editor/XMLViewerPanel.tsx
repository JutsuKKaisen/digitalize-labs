"use client";

import React, { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/LayoutComponents";

interface XMLViewerPanelProps {
  xmlData: string | null | undefined;
}

export const XMLViewerPanel: React.FC<XMLViewerPanelProps> = ({ xmlData }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!xmlData) return;
    navigator.clipboard.writeText(xmlData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!xmlData) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-card text-muted-foreground p-8">
        <p className="text-lg mb-2">No XML Data Available</p>
        <p className="opacity-70 text-sm">
          Extract structure using AI to populate this view.
        </p>
      </div>
    );
  }

  // Very basic syntax highlighting for XML tags vs content
  const highlightXML = (xml: string) => {
    return xml.split("\n").map((line, i) => {
      // Color tags (<Tag>) and content differently
      const elements = line.split(/(<[^>]+>)/g).map((part, j) => {
        if (part.startsWith("<") && part.endsWith(">")) {
          // It's a tag
          return (
            <span
              key={j}
              className="text-blue-600 dark:text-blue-400 font-bold"
            >
              {part}
            </span>
          );
        }
        // It's text/content
        return (
          <span key={j} className="text-emerald-700 dark:text-emerald-300">
            {part}
          </span>
        );
      });

      return (
        <div key={i} className="whitespace-pre-wrap">
          {elements}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-card border-l border-border transition-colors font-mono text-sm relative">
      <div className="sticky top-0 right-0 p-4 border-b border-border bg-muted/90 backdrop-blur z-10 flex justify-between items-center">
        <h3 className="font-semibold text-foreground">AI Extracted XML</h3>
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <CheckCircle2 size={14} className="text-emerald-500 mr-2" />{" "}
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} className="mr-2" /> Copy XML
            </>
          )}
        </Button>
      </div>

      <div className="p-6">
        <pre className="text-foreground/90 overflow-x-auto w-full">
          {highlightXML(xmlData)}
        </pre>
      </div>
    </div>
  );
};
