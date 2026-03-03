"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Topbar } from "@/components/ui/LayoutComponents";
import { Link } from "@/lib/router-shim";
import { FileText, RefreshCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function Dashboard() {
  const t = useTranslations("Dashboard");
  const tTopbar = useTranslations("Topbar");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: api.getDocuments,
    refetchInterval: (query) => {
      const docs = query.state.data?.documents || [];
      return docs.some(
        (d) => d.status === "processing" || d.status === "pending",
      )
        ? 5000
        : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(t("deleteSuccess", { fallback: "File đã được xóa thành công." }));
    },
    onError: () => {
      toast.error(t("deleteError", { fallback: "Xóa file thất bại." }));
    },
  });

  const handleDelete = (docId: string, title: string) => {
    if (confirm(t("deleteConfirm", { title, fallback: `Xóa file vật lý cho "${title}"?` }))) {
      deleteMutation.mutate(docId);
    }
  };

  const isPolling = data?.documents.some(
    (d) => d.status === "processing" || d.status === "pending",
  );

  return (
    <>
      <Topbar>
        <h1 className="text-lg font-semibold text-foreground">
          {t("dashboardTitle", { fallback: "Dashboard" }) ||
            t("title", { fallback: "Dashboard" }) ||
            "Dashboard"}
        </h1>
        <div className="ml-auto">
          <button
            onClick={async () => {
              const token = prompt("Enter Admin CRON secret:");
              if (token) {
                try {
                  const res = await api.triggerCleanup(token);
                  toast.success(
                    `Cleanup Success: ${res.summary.deleted} PDFs deleted.`,
                  );
                } catch (e) {
                  toast.error("Cleanup Failed. Unauthorized or error.");
                }
              }
            }}
            className="text-xs font-semibold px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg transition-colors"
          >
            {tTopbar("runCleanup")}
          </button>
        </div>
      </Topbar>

      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
              {t("totalDocs")}
            </div>
            <div className="text-3xl font-bold text-foreground">
              {data?.documents.length || 0}
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
              {t("needsReview")}
            </div>
            <div className="text-3xl font-bold text-amber-500">
              {data?.documents.filter((d) => d.needsReview).length || 0}
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative">
            <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
              {t("processing")}
              {isPolling && (
                <RefreshCw size={12} className="animate-spin text-blue-500" />
              )}
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {data?.documents.filter(
                (d) => d.status === "processing" || d.status === "pending",
              ).length || 0}
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
              {t("errors")}
            </div>
            <div className="text-3xl font-bold text-red-500">
              {data?.documents.filter((d) => d.status === "error").length || 0}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-visible overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                <th className="p-4 pl-6">{t("colDoc")}</th>
                <th className="p-4">{t("colPages")}</th>
                <th className="p-4">{t("colStatus")}</th>
                <th className="p-4">{t("colUploaded")}</th>
                <th className="p-4 text-right pr-6">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {t("loading")}
                  </td>
                </tr>
              ) : data?.documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-16 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-2">{t("noDocs")}</div>
                      <div className="text-sm">{t("uploadFirst")}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4 pl-6 font-medium text-foreground flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                        <FileText size={16} />
                      </div>
                      {doc.title}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-sm">
                      {doc.pageCount}
                    </td>
                    <td className="p-4">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-full text-xs font-semibold border",
                          doc.status === "ready" &&
                          "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
                          (doc.status === "processing" ||
                            doc.status === "pending") &&
                          "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
                          doc.status === "error" &&
                          "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
                          doc.status === "ingest" &&
                          "bg-secondary border-border text-muted-foreground",
                        )}
                      >
                        {doc.status.charAt(0).toUpperCase() +
                          doc.status.slice(1)}
                      </span>
                      {doc.needsReview && (
                        <span className="ml-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                          Review
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/doc/${encodeURIComponent(doc.id)}/view`}
                          className="text-primary hover:text-primary/80 text-sm font-semibold hover:underline"
                        >
                          {t("view")}
                        </Link>

                        {/* Delete button with Vietnamese tooltip */}
                        <div className="relative group">
                          <button
                            onClick={() => handleDelete(doc.id, doc.title)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            aria-label={t("deleteHover", { fallback: "Xóa file vật lý" })}
                          >
                            <Trash2 size={14} />
                          </button>
                          {/* Tooltip */}
                          <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 leading-relaxed">
                            {t("deleteTooltip", { fallback: "Thao tác này chỉ xóa file PDF/Ảnh vật lý để giải phóng dung lượng. Dữ liệu XML đã bóc tách vẫn được lưu trữ an toàn." })}
                            <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900 dark:bg-slate-100" />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
