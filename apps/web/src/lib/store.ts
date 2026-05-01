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
  user: { name: string; email: string; avatar?: string } | null;
  isLoggingIn: boolean;
  role: "guest" | "traveler" | "admin";
  login: (role: "traveler" | "admin") => Promise<void>;
  logout: () => void;
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
      user: null,
      isLoggingIn: false,
      role: "guest",
      login: async (role) => {
        set({ isLoggingIn: true });
        await new Promise((res) => setTimeout(res, 800)); // simulate network
        const name =
          role === "admin" ? "System Administrator" : "Alex Traveler";
        const email = role === "admin" ? "admin@AllWay.gov" : "alex@human.com";
        set({ role, user: { name, email }, isLoggingIn: false });
      },
      logout: () => set({ role: "guest", user: null }),
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
