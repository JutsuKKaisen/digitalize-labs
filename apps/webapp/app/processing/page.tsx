"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Topbar, Button } from "@/components/ui/LayoutComponents";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

// Skeleton loader for the processing workflow cards
function ProcessingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse"
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="h-5 w-48 bg-muted rounded-md mb-2" />
              <div className="h-3 w-32 bg-muted rounded-md" />
            </div>
            <div className="h-8 w-24 bg-muted rounded-md" />
          </div>

          {/* Skeleton step indicators */}
          <div className="relative px-4">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10" />
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-muted" />
                  <div className="h-3 w-12 bg-muted rounded-md" />
                  <div className="h-2 w-8 bg-muted rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProcessingPage() {
  const t = useTranslations("Processing");
  const {
    data: statusList,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["processingStatus"],
    queryFn: api.getProcessingStatus,
    refetchInterval: (query) => {
      const activeDocs =
        (query.state.data as any[])?.some((doc) =>
          ["pending", "ingest", "processing", "verifying"].includes(doc.status),
        ) ?? false;
      return activeDocs ? 3000 : false;
    },
  });

  return (
    <div className="flex flex-col h-full bg-background transition-colors duration-300">
      <Topbar>
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto flex items-center gap-2 text-sm font-medium text-foreground bg-card hover:bg-muted border border-border px-3 py-1.5 rounded-md transition-colors"
        >
          <RefreshCw size={14} className={clsx(isFetching && "animate-spin")} />
          {t("refresh")}
        </button>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        <div className="space-y-6">
          {isLoading && !statusList ? (
            <ProcessingSkeleton />
          ) : (statusList as any[])?.length === 0 ? (
            <div className="text-muted-foreground text-center py-10">
              {t("noDocs")}
            </div>
          ) : (
            (statusList as any[])?.map((item) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.docId}
                className="bg-card border border-border rounded-xl p-6 shadow-sm transition-colors duration-300"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      {item.title}
                    </h3>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      ID: {item.docId}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    {item.steps.some((s: any) => s.status === "error") && (
                      <Button variant="destructive" size="sm">
                        <RefreshCw size={14} /> Retry Failed Steps
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="relative px-4">
                  {/* Connector Line */}
                  <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10" />

                  <div className="flex justify-between">
                    {item.steps.map((step: any, idx: number) => {
                      const isCompleted = step.status === "completed";
                      const isProcessing = step.status === "processing";
                      const isError = step.status === "error";

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-2"
                        >
                          <div
                            className={clsx(
                              "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-card transition-all z-10 shadow-sm",
                              isCompleted &&
                              "border-emerald-500 text-emerald-500",
                              isProcessing && "border-blue-500 text-blue-500",
                              isError && "border-red-500 text-red-500",
                              step.status === "pending" &&
                              "border-muted text-muted-foreground",
                            )}
                          >
                            {isCompleted && <CheckCircle2 size={16} />}
                            {isProcessing && (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 1,
                                  ease: "linear",
                                }}
                              >
                                <RefreshCw size={14} />
                              </motion.div>
                            )}
                            {isError && <AlertCircle size={16} />}
                            {step.status === "pending" && (
                              <span className="w-2 h-2 rounded-full bg-muted" />
                            )}
                          </div>
                          <div className="text-center">
                            <div
                              className={clsx(
                                "text-xs font-semibold uppercase tracking-wider",
                                isCompleted
                                  ? "text-emerald-500"
                                  : isError
                                    ? "text-red-500"
                                    : isProcessing
                                      ? "text-blue-500"
                                      : "text-muted-foreground",
                              )}
                            >
                              {step.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                              {step.time}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {item.status === "error" && (
                  <button className="text-xs font-semibold text-destructive hover:text-destructive/80 mt-4 flex items-center gap-1 transition-colors bg-destructive/10 px-3 py-1.5 rounded-md">
                    <RefreshCw size={12} /> {t("retry")}
                  </button>
                )}
                {/* Error Detail Panel */}
                {item.steps.find((s: any) => s.status === "error") && (
                  <div className="mt-8 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm text-red-500 flex items-center gap-3">
                    <AlertCircle size={18} />
                    <span>
                      Error in <b>OCR</b>: Unsupported format in region. Manual
                      intervention may be required.
                    </span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
