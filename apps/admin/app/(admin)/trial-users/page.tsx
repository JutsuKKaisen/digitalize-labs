"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string | null;
    interest: string;
    status: string;
    notes: string | null;
    createdAt: string;
}

const STATUS_OPTIONS = [
    { value: "all", label: "All" },
    { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
    { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-700" },
    { value: "converted", label: "Converted", color: "bg-green-100 text-green-700" },
    { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

const INTEREST_LABELS: Record<string, string> = {
    store: "Số hóa tài liệu XML",
    dispatch: "AI rà soát hợp đồng",
    digitize: "Truy xuất & quản trị rủi ro",
    process: "Tự động hóa soạn thảo",
};

export default function TrialUsersPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    const fetchLeads = () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (filterStatus !== "all") params.set("status", filterStatus);
        if (search) params.set("search", search);

        fetch(`/api/trial-users?${params}`)
            .then((r) => r.json())
            .then((d) => {
                setLeads(d.leads || []);
                setTotal(d.total || 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchLeads();
    }, [filterStatus, page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLeads();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6">Trial Users (Đăng ký dùng thử)</h1>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                {STATUS_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => { setFilterStatus(opt.value); setPage(1); }}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                            filterStatus === opt.value
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-card border-border text-muted-foreground hover:border-primary/30"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
                <input
                    type="text"
                    placeholder="Search by name, email, or company..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-96 px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
            </form>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                            <th className="p-4 pl-6">Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Company</th>
                            <th className="p-4">Interest</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                </td>
                            </tr>
                        ) : leads.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-16 text-center text-muted-foreground">
                                    No trial registrations found.
                                </td>
                            </tr>
                        ) : (
                            leads.map((lead) => {
                                const statusOpt = STATUS_OPTIONS.find((s) => s.value === lead.status);
                                return (
                                    <tr
                                        key={lead.id}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <td className="p-4 pl-6 font-medium text-foreground">{lead.name}</td>
                                        <td className="p-4 text-muted-foreground text-sm">{lead.email}</td>
                                        <td className="p-4 text-muted-foreground text-sm">{lead.phone}</td>
                                        <td className="p-4 text-muted-foreground text-sm">{lead.company || "—"}</td>
                                        <td className="p-4">
                                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                                {INTEREST_LABELS[lead.interest] || lead.interest}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full", statusOpt?.color || "bg-muted text-muted-foreground")}>
                                                {statusOpt?.label || lead.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-muted-foreground text-sm">
                                            {new Date(lead.createdAt).toLocaleDateString("vi-VN")}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {leads.length} of {total} leads</span>
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
                        disabled={leads.length < 20}
                        className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-30 hover:bg-muted transition"
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedLead(null)}>
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-foreground">Lead Detail</h3>
                            <button onClick={() => setSelectedLead(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div><span className="font-semibold text-muted-foreground">Name:</span> <span className="text-foreground">{selectedLead.name}</span></div>
                            <div><span className="font-semibold text-muted-foreground">Email:</span> <span className="text-foreground">{selectedLead.email}</span></div>
                            <div><span className="font-semibold text-muted-foreground">Phone:</span> <span className="text-foreground">{selectedLead.phone}</span></div>
                            <div><span className="font-semibold text-muted-foreground">Company:</span> <span className="text-foreground">{selectedLead.company || "—"}</span></div>
                            <div><span className="font-semibold text-muted-foreground">Interest:</span> <span className="text-foreground">{INTEREST_LABELS[selectedLead.interest] || selectedLead.interest}</span></div>
                            <div><span className="font-semibold text-muted-foreground">Status:</span> <span className="text-foreground capitalize">{selectedLead.status}</span></div>
                            <div><span className="font-semibold text-muted-foreground">Registered:</span> <span className="text-foreground">{new Date(selectedLead.createdAt).toLocaleString("vi-VN")}</span></div>
                            {selectedLead.notes && (
                                <div><span className="font-semibold text-muted-foreground">Notes:</span> <span className="text-foreground">{selectedLead.notes}</span></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
