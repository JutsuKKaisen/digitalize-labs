"use client";

import React, { useState } from "react";
import { Topbar } from "@/components/ui/LayoutComponents";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Graph3D } from "@/components/graph/Graph3D";
import { Graph2D } from "@/components/graph/Graph2D";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Loader2, Cuboid, Network, Globe, Focus } from "lucide-react";
import clsx from "clsx";
import { MAX_GRAPH_NODES } from "@/constants";
import { useTranslations } from "next-intl";

// Expanded legend items matching new NODE_COLORS
const LEGEND_ITEMS = [
  { type: "document", color: "#64748b", labelKey: "document" },
  { type: "person", color: "#3b82f6", labelKey: "person" },
  { type: "org", color: "#d946ef", labelKey: "org" },
  { type: "location", color: "#22c55e", labelKey: "location" },
  { type: "decree", color: "#ef4444", labelKey: "decree" },
  { type: "law", color: "#6366f1", labelKey: "law" },
  { type: "circular", color: "#14b8a6", labelKey: "circular" },
  { type: "clause", color: "#ec4899", labelKey: "clause" },
  { type: "concept", color: "#f97316", labelKey: "concept" },
  { type: "tag", color: "#f59e0b", labelKey: "tag" },
];

export default function GraphPage() {
  const t = useTranslations("Graph");
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [graphScope, setGraphScope] = useState<"global" | "local">("global");
  const { data, isLoading } = useQuery({
    queryKey: ["graphSummary", viewMode, graphScope],
    queryFn: () =>
      api.getGraphSummary(
        viewMode === "3d" ? MAX_GRAPH_NODES : 200,
        graphScope,
      ),
  });

  return (
    <div className="flex flex-col h-screen transition-colors duration-300">
      <Topbar>
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>

        {/* View Mode Toggle: 2D / 3D */}
        <div className="ml-8 flex bg-muted rounded-lg p-1 border border-border">
          <button
            onClick={() => setViewMode("2d")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
              viewMode === "2d"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Network size={14} /> {t("network2d")}
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
              viewMode === "3d"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Cuboid size={14} /> {t("sphere3d")}
          </button>
        </div>

        {/* Graph Scope Toggle: Global / Local */}
        <div className="ml-4 flex bg-muted rounded-lg p-1 border border-border">
          <button
            onClick={() => setGraphScope("global")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
              graphScope === "global"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Globe size={14} /> Global
          </button>
          <button
            onClick={() => setGraphScope("local")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
              graphScope === "local"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Focus size={14} /> Local
          </button>
        </div>

        <div className="ml-auto flex gap-2">
          {data && (
            <span className="text-xs text-muted-foreground my-auto font-mono bg-muted px-2 py-1 rounded border border-border">
              {data.nodes.length} {t("entities")} · {data.edges.length} links
            </span>
          )}
        </div>
      </Topbar>

      <div className="flex-1 bg-background relative overflow-hidden transition-colors duration-500">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <Loader2 className="animate-spin text-primary" /> {t("loading")}
          </div>
        ) : data?.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t("noData")}
          </div>
        ) : viewMode === "3d" ? (
          <ErrorBoundary
            fallbackTitle="3D Graph Error"
            fallbackMessage="The 3D knowledge graph encountered a rendering error. Try switching to 2D mode or refreshing the page."
          >
            <Graph3D nodes={data?.nodes || []} edges={data?.edges || []} />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary
            fallbackTitle="2D Graph Error"
            fallbackMessage="The 2D network visualization encountered an error. Try switching to 3D mode or refreshing the page."
          >
            <Graph2D nodes={data?.nodes || []} edges={data?.edges || []} />
          </ErrorBoundary>
        )}

        {/* Expanded Legend */}
        <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur border border-border p-4 rounded-xl shadow-lg text-xs pointer-events-none z-10 text-card-foreground">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.type} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="capitalize">{item.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
