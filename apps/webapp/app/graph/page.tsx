"use client";

import React, { useState } from "react";
import { Topbar } from "@/components/ui/LayoutComponents";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Graph3D } from "@/components/graph/Graph3D";
import { Graph2D } from "@/components/graph/Graph2D";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Loader2, Cuboid, Network } from "lucide-react";
import clsx from "clsx";
import { MAX_GRAPH_NODES } from "@/constants";
import { useTranslations } from "next-intl";

export default function GraphPage() {
  const t = useTranslations("Graph");
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const { data, isLoading } = useQuery({
    queryKey: ["graphSummary", mode],
    queryFn: () => api.getGraphSummary(mode === "3d" ? MAX_GRAPH_NODES : 200),
  });

  return (
    <div className="flex flex-col h-screen transition-colors duration-300">
      <Topbar>
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>

        {/* Toggle Controls */}
        <div className="ml-8 flex bg-muted rounded-lg p-1 border border-border">
          <button
            onClick={() => setMode("2d")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
              mode === "2d"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Network size={14} /> {t("network2d")}
          </button>
          <button
            onClick={() => setMode("3d")}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2",
              mode === "3d"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Cuboid size={14} /> {t("sphere3d")}
          </button>
        </div>

        <div className="ml-auto flex gap-2">
          {data && (
            <span className="text-xs text-muted-foreground my-auto font-mono bg-muted px-2 py-1 rounded border border-border">
              {data.nodes.length} {t("entities")}
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
        ) : mode === "3d" ? (
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

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur border border-border p-4 rounded-xl shadow-lg text-xs space-y-2 pointer-events-none z-10 text-card-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>{" "}
            {t("person")}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>{" "}
            {t("location")}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>{" "}
            {t("org")}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>{" "}
            {t("concept")}
          </div>
        </div>
      </div>
    </div>
  );
}
