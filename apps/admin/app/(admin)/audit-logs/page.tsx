"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface AuditLogEntry {
    id: string;
    action: string;
    entity: string | null;
    entityId: string | null;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
    user: { name: string; email: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
    LOGIN: "bg-green-100 text-green-700",
    LOGIN_FAILED: "bg-red-100 text-red-700",
    LOGOUT: "bg-slate-100 text-slate-600",
    DOC_STATUS_CHANGE: "bg-blue-100 text-blue-700",
    DOC_HARD_DELETE: "bg-red-100 text-red-700",
    LEAD_UPDATE: "bg-yellow-100 text-yellow-700",
};

const ACTION_FILTERS = [
    "all", "LOGIN", "LOGIN_FAILED", "LOGOUT", "DOC_STATUS_CHANGE", "DOC_HARD_DELETE", "LEAD_UPDATE",
];

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState("all");
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchLogs = () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (filterAction !== "all") params.set("action", filterAction);

        fetch(`/api/audit-logs?${params}`)
            .then((r) => r.json())
            .then((d) => {
                setLogs(d.logs || []);
                setTotal(d.total || 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchLogs();
    }, [filterAction, page]);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-2">Audit Logs</h1>
            <p className="text-sm text-muted-foreground mb-6">Log đăng nhập và thao tác hệ thống</p>

            {/* Action Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                {ACTION_FILTERS.map((action) => (
                    <button
                        key={action}
                        onClick={() => { setFilterAction(action); setPage(1); }}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            filterAction === action
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-card border-border text-muted-foreground hover:border-primary/30"
                        )}
                    >
                        {action === "all" ? "All Actions" : action.replace(/_/g, " ")}
                    </button>
                ))}
            </div>

            {/* Logs Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                            <th className="p-4 pl-6">Timestamp</th>
                            <th className="p-4">Action</th>
                            <th className="p-4">User</th>
                            <th className="p-4">Entity</th>
                            <th className="p-4">IP Address</th>
                            <th className="p-4">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-16 text-center text-muted-foreground">No audit logs found.</td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 pl-6 text-sm text-muted-foreground font-mono">
                                            {new Date(log.createdAt).toLocaleString("vi-VN")}
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full", ACTION_COLORS[log.action] || "bg-muted text-muted-foreground")}>
                                                {log.action.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {log.user ? (
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{log.user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{log.user.email}</p>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">System</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">
                                            {log.entity ? (
                                                <span>
                                                    {log.entity}
                                                    {log.entityId && (
                                                        <span className="ml-1 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                            ...{log.entityId.slice(-8)}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground font-mono">
                                            {log.ipAddress || "—"}
                                        </td>
                                        <td className="p-4">
                                            {log.details ? (
                                                <button
                                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    {expandedId === log.id ? "Hide" : "View"}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedId === log.id && log.details && (
                                        <tr>
                                            <td colSpan={6} className="p-4 pl-6 bg-muted/50">
                                                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto max-w-full">
                                                    {JSON.stringify(JSON.parse(log.details), null, 2)}
                                                </pre>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {logs.length} of {total} logs</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-30 hover:bg-muted transition"
                    >
                        ← Prev
                    </button>
                    <span className="px-3 py-1.5">Page {page}</span>
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={logs.length < 50}
                        className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-30 hover:bg-muted transition"
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}
