"use client";

import React, { useEffect, useState } from "react";

interface DashboardData {
    totalDocuments: number;
    statusCounts: Record<string, number>;
    totalLeads: number;
    recentLeads: { id: string; name: string; email: string; interest: string; createdAt: string }[];
    traffic: { last7Days: number; webapp: number; landingpage: number };
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard")
            .then((r) => r.json())
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!data) {
        return <div className="p-8 text-muted-foreground">Failed to load dashboard data.</div>;
    }

    const statCards = [
        { label: "Total Documents", value: data.totalDocuments, color: "blue" },
        { label: "Trial Leads", value: data.totalLeads, color: "green" },
        { label: "Traffic (7d)", value: data.traffic.last7Days, color: "purple" },
        { label: "Webapp Visits", value: data.traffic.webapp, color: "cyan" },
        { label: "Landing Visits", value: data.traffic.landingpage, color: "orange" },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {statCards.map((card) => (
                    <div key={card.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{card.label}</p>
                        <p className="text-3xl font-bold text-foreground mt-2">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Document Status Breakdown */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Document Status Breakdown</h2>
                    <div className="space-y-3">
                        {Object.entries(data.statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground capitalize">{status}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${data.totalDocuments > 0 ? (count / data.totalDocuments) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground w-8 text-right">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Recent Trial Leads</h2>
                    {data.recentLeads.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No leads yet</p>
                    ) : (
                        <div className="space-y-3">
                            {data.recentLeads.map((lead) => (
                                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{lead.name}</p>
                                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                                    </div>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">{lead.interest}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
