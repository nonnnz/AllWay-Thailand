import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "th";
export type Theme = "light" | "dark";

interface AppState {
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  // simple session role for MVP
  role: "guest" | "traveler" | "admin";
  setRole: (r: "guest" | "traveler" | "admin") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
      theme: "light",
      setTheme: (theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        set({ theme });
      },
      toggleTheme: () =>
        get().setTheme(get().theme === "dark" ? "light" : "dark"),
      role: "traveler",
      setRole: (role) => set({ role }),
    }),
    {
      name: "AllWay-app",
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "dark")
          document.documentElement.classList.add("dark");
      },
    },
  ),
);
