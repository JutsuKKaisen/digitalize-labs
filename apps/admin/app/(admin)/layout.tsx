"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/trial-users", label: "Trial Users", icon: "👥" },
    { href: "/documents", label: "Documents", icon: "📄" },
    { href: "/audit-logs", label: "Audit Logs", icon: "📋" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

    useEffect(() => {
        fetch("/api/auth")
            .then((r) => r.json())
            .then((d) => {
                if (d.authenticated) setUser(d.user);
            });
    }, []);

    const handleLogout = async () => {
        await fetch("/api/auth", { method: "DELETE" });
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border flex flex-col">
                <div className="p-5 border-b border-border">
                    <h1 className="font-bold text-lg text-foreground tracking-tight">
                        Digitalize<span className="text-blue-500">Labs</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Admin Portal</p>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                pathname === item.href
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-border">
                    {user && (
                        <div className="mb-3">
                            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {user.role}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
