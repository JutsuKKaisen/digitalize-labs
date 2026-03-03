"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "@/lib/router-shim";
import { Sidebar } from "@/components/ui/LayoutComponents";
import { useStore } from "@/lib/store";
import { PageTransition } from "@/components/ui/PageTransition";

/**
 * Client-only wrapper that:
 * - Applies dark mode class to <html> (Tailwind darkMode: 'class')
 * - Shifts main content when sidebar is open
 * - Guards against hydration mismatch from Zustand persist/localStorage
 */
export default function Shell({ children }: { children?: React.ReactNode }) {
  const { theme, sidebarOpen, clearSelection } = useStore();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  // After first client render, allow persisted state to take effect
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    // Apply theme to document root so CSS variables under `.dark` kick in.
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Component isolation: clear viewer selections on route change
  // Prevents state leaks between Viewer, Graph, Dashboard
  useEffect(() => {
    clearSelection();
  }, [pathname, clearSelection]);

  // Use defaults matching the server render until hydration is complete
  const showSidebar = hasMounted ? sidebarOpen : true;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex overflow-hidden">
      <Sidebar />

      <main
        className={clsx(
          "flex-1 h-screen overflow-hidden transition-all duration-300",
          showSidebar ? "ml-64" : "ml-0",
        )}
      >
        <AnimatePresence mode="wait">
          <PageTransition key={pathname}>{children}</PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}

