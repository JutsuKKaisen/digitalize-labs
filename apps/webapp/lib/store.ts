import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";

interface AppState {
  // Layout
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Theme
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;

  // Viewer
  selectedTokenId: string | null;
  selectToken: (id: string | null) => void;
  multiSelectedTokenIds: string[];
  toggleMultiSelectToken: (id: string) => void;
  clearSelection: () => void;

  viewMode: "ocr" | "verified" | "xml";
  setViewMode: (mode: "ocr" | "verified" | "xml") => void;

  locale: "vi" | "en";
  setLocale: (locale: "vi" | "en") => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Layout
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Theme
      theme: "light",
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
      },

      // Viewer selections
      selectedTokenId: null,
      selectToken: (id) =>
        set({ selectedTokenId: id, multiSelectedTokenIds: [] }),

      multiSelectedTokenIds: [],
      toggleMultiSelectToken: (id) =>
        set((state) => {
          const exists = state.multiSelectedTokenIds.includes(id);
          if (exists) {
            return {
              multiSelectedTokenIds: state.multiSelectedTokenIds.filter(
                (t) => t !== id,
              ),
            };
          }
          return {
            multiSelectedTokenIds: [...state.multiSelectedTokenIds, id],
            selectedTokenId: null,
          };
        }),
      clearSelection: () =>
        set({ selectedTokenId: null, multiSelectedTokenIds: [] }),

      // Viewer mode
      viewMode: "verified",
      setViewMode: (mode) => set({ viewMode: mode }),

      locale: "vi",
      setLocale: (l) => set({ locale: l }),
    }),
    {
      name: "digitalize-labs-store",
      storage: createJSONStorage(() => localStorage),
      // Persist only what matters for UX
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        theme: s.theme,
        viewMode: s.viewMode,
        locale: s.locale,
      }),
    },
  ),
);
