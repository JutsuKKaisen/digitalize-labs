"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { FileText, ChevronDown, Check, Shield, Search, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Document {
    id: string;
    title: string;
    status: string;
    phase: string;
    pageCount: number;
    filePath: string | null;
    createdAt: string;
    deletedAt: string | null;
    _count: { pages: number };
}

const STATUS_OPTIONS = [
    { value: "all", label: "All", color: "bg-slate-100 text-slate-800 border-slate-300" },
    { value: "pending", label: "Pending", color: "bg-slate-100 text-slate-600 border-slate-300" },
    { value: "ingest", label: "Ingest", color: "bg-violet-50 text-violet-600 border-violet-200" },
    { value: "processing", label: "Processing", color: "bg-blue-50 text-blue-600 border-blue-200" },
    { value: "ready", label: "Ready", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    { value: "verified", label: "Verified", color: "bg-teal-50 text-teal-600 border-teal-200" },
    { value: "error", label: "Error", color: "bg-red-50 text-red-600 border-red-200" },
];

const PHASE_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "review", label: "Review" },
    { value: "approved", label: "Approved" },
    { value: "archived", label: "Archived" },
];

function StatusDropdown({
    docId,
    currentStatus,
    onStatusChange
}: {
    docId: string;
    currentStatus: string;
    onStatusChange: (id: string, status: string) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const current = STATUS_OPTIONS.find((s) => s.value === currentStatus);

    const handleUpdate = async (status: string) => {
        setUpdating(true);
        await onStatusChange(docId, status);
        setUpdating(false);
        setOpen(false);
    };

    return (
        <div className="relative inline-block text-left w-full">
            <button
                onClick={() => setOpen(!open)}
                className={clsx(
                    "flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    current?.color || "bg-muted text-muted-foreground border-border",
                    updating && "opacity-50 cursor-not-allowed"
                )}
                disabled={updating}
            >
                {updating ? "Updating..." : (current?.label || currentStatus)}
                <ChevronDown size={12} className={clsx("transition-transform ml-2", open && "rotate-180")} />
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-1 z-50 w-full min-w-[120px] bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                        >
                            {STATUS_OPTIONS.filter(o => o.value !== "all").map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleUpdate(opt.value)}
                                    className={clsx(
                                        "w-full px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-muted transition-colors",
                                        opt.value === currentStatus && "bg-primary/5 font-semibold text-primary"
                                    )}
                                >
                                    <span className="text-foreground">{opt.label}</span>
                                    {opt.value === currentStatus && <Check size={12} className="text-primary" />}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deleting, setDeleting] = useState(false);

    const fetchDocuments = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterStatus !== "all") params.set("status", filterStatus);
        fetch(`/api/documents?${params}`)
            .then((r) => r.json())
            .then((d) => {
                setDocuments(d.documents || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchDocuments();
    }, [filterStatus]);

    const handleStatusChange = async (docId: string, newStatus: string) => {
        await fetch("/api/documents", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: docId, status: newStatus }),
        });
        fetchDocuments();
    };

    const handlePhaseChange = async (docId: string, newPhase: string) => {
        await fetch("/api/documents", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: docId, phase: newPhase }),
        });
        fetchDocuments();
    };

    const handleHardDelete = async () => {
        if (!deleteTarget || deleteConfirm !== deleteTarget.title) return;
        setDeleting(true);
        try {
            const res = await fetch("/api/documents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deleteTarget.id }),
            });
            if (res.ok) {
                setDeleteTarget(null);
                setDeleteConfirm("");
                fetchDocuments();
            } else {
                const data = await res.json();
                alert(data.error || "Delete failed");
            }
        } catch {
            alert("Delete failed");
        } finally {
            setDeleting(false);
        }
    };

    const filtered = documents.filter((doc) => {
        if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });

    const statusCounts = documents.reduce((acc, doc) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex flex-col h-screen bg-background transition-colors duration-300">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Shield size={24} className="text-primary" />
                        <h1 className="text-2xl font-bold text-foreground">Admin — Document Management</h1>
                    </div>
                    <button
                        onClick={() => fetchDocuments()}
                        disabled={loading}
                        className="flex items-center gap-2 text-sm font-medium text-foreground bg-card hover:bg-muted border border-border px-4 py-2 rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                        Refresh
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <button
                        onClick={() => setFilterStatus("all")}
                        className={clsx(
                            "p-4 rounded-xl border text-center transition-all",
                            filterStatus === "all"
                                ? "bg-primary/10 border-primary shadow-sm"
                                : "bg-card border-border hover:border-primary/30"
                        )}
                    >
                        <div className="text-2xl font-bold text-foreground">{documents.length}</div>
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">All</div>
                    </button>
                    {STATUS_OPTIONS.filter(o => o.value !== "all").map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setFilterStatus(opt.value)}
                            className={clsx(
                                "p-4 rounded-xl border text-center transition-all",
                                filterStatus === opt.value
                                    ? "bg-primary/10 border-primary shadow-sm"
                                    : "bg-card border-border hover:border-primary/30"
                            )}
                        >
                            <div className="text-2xl font-bold text-foreground">{statusCounts[opt.value] || 0}</div>
                            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">{opt.label}</div>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by document title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-96 pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-xl overflow-visible overflow-x-auto shadow-sm pb-[100px]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-muted border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                                <th className="p-4 pl-6">Document</th>
                                <th className="p-4">Pages</th>
                                <th className="p-4 w-40">Status</th>
                                <th className="p-4 w-40">Phase</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-muted-foreground">No documents found.</td>
                                </tr>
                            ) : (
                                filtered.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-muted/50 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="font-medium text-foreground truncate max-w-[200px]" title={doc.title}>{doc.title}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted-foreground font-mono text-sm">{doc.pageCount}</td>
                                        <td className="p-4 align-top">
                                            <StatusDropdown
                                                docId={doc.id}
                                                currentStatus={doc.status}
                                                onStatusChange={handleStatusChange}
                                            />
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="relative inline-block text-left w-full">
                                                <select
                                                    value={doc.phase}
                                                    onChange={(e) => handlePhaseChange(doc.id, e.target.value)}
                                                    className="w-full appearance-none text-xs font-semibold bg-muted text-muted-foreground border-border border px-3 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    {PHASE_OPTIONS.map((p) => (
                                                        <option key={p.value} value={p.value}>{p.label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted-foreground text-sm">
                                            {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <button
                                                onClick={() => setDeleteTarget(doc)}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition opacity-0 group-hover:opacity-100"
                                            >
                                                Hard Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 pb-8 text-xs text-muted-foreground text-center">
                    Showing {filtered.length} documents
                </div>
            </div>

            {/* Hard Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}>
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Hard Delete</h3>
                                <p className="text-xs text-red-500 font-semibold">⚠️ This action is IRREVERSIBLE</p>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4">
                            This will permanently delete the document <strong className="text-foreground">&quot;{deleteTarget.title}&quot;</strong>, all its pages, and the physical file. This cannot be undone.
                        </p>

                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                Type the document title to confirm:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder={deleteTarget.title}
                                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-red-400"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}
                                className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleHardDelete}
                                disabled={deleteConfirm !== deleteTarget.title || deleting}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {deleting ? "Deleting..." : "🗑️ Permanently Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
