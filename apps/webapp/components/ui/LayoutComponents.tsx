"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  FileText,
  Search,
  Network,
  Settings,
  Home,
  Menu,
  Activity,
  Sun,
  Moon,
} from "lucide-react";

import { useStore } from "@/lib/store";
import { useTranslations, useLocale } from "next-intl";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, theme, toggleTheme } = useStore();
  const t = useTranslations("Sidebar");
  const tTheme = useTranslations("Theme");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const links = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/processing", label: t("processing"), icon: Activity },
    { href: "/search", label: t("search"), icon: Search },
    { href: "/graph", label: t("graph"), icon: Network },
  ];

  // On server & first render, always show sidebar (matching SSR default).
  // After mount, use persisted state.
  if (hasMounted && !sidebarOpen) return null;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0 z-40 shadow-sm transition-colors duration-300">
      <div className="p-4 flex items-center gap-2 border-b border-border h-16">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/30">
          <FileText className="text-primary-foreground w-5 h-5" />
        </div>
        <span className="font-bold text-foreground tracking-tight text-lg">
          Digitalize Labs
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon
                size={18}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors rounded-md"
          type="button"
        >
          {(hasMounted ? theme : "light") === "light" ? <Moon size={18} /> : <Sun size={18} />}
          {(hasMounted ? theme : "light") === "light" ? tTheme("dark") : tTheme("light")}
        </button>

        <button
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors rounded-md"
          type="button"
        >
          <Settings size={18} />
          {tTheme("settings")}
        </button>
      </div>
    </aside>
  );
}

export function LanguageSwitcher() {
  const currentLocale = useLocale(); // Single source of truth from next-intl
  const { setLocale } = useStore();

  const toggleLocale = () => {
    const nextLocale = currentLocale === "vi" ? "en" : "vi";
    setLocale(nextLocale as "vi" | "en"); // Keep Zustand in sync for any client readers
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <button
      onClick={toggleLocale}
      className="text-xs font-semibold px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-muted border border-border rounded-lg transition-colors flex items-center gap-2"
    >
      {currentLocale === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
    </button>
  );
}

export function Topbar({ children }: { children?: React.ReactNode }) {
  const { toggleSidebar, sidebarOpen } = useStore();
  const t = useTranslations("Topbar");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Use server-matching default until mounted
  const isSidebarOpen = hasMounted ? sidebarOpen : true;

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-muted transition-colors"
          type="button"
          aria-label={isSidebarOpen ? t("closeSidebar") : t("openSidebar")}
        >
          <Menu size={20} />
        </button>
        {children}
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded border border-border">
          v0.1.3
        </div>
      </div>
    </header>
  );
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "destructive";
    size?: "sm" | "md" | "lg";
  },
) {
  const { variant = "primary", size = "md", className, ...rest } = props;

  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
    secondary:
      "bg-card text-card-foreground hover:bg-muted border border-border shadow-sm",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
  } as const;

  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  } as const;

  return (
    <button
      className={clsx(
        "rounded-lg font-medium transition-all flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
