import { Link, NavLink } from "react-router-dom";
import { Moon, Sun, Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { UserMenu } from "@/components/auth/UserMenu";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useT();
  const { language, setLanguage, theme, toggleTheme, role } = useAppStore();

  const navItems = [
    { to: "/", label: t("nav.home"), end: true },
    { to: "/explore", label: t("nav.explore") },
    { to: "/recommendations", label: t("nav.recommendations") },
    { to: "/routes", label: t("nav.routes") },
    ...(role === "traveler"
      ? [
          { to: "/itinerary", label: t("nav.itinerary") },
          { to: "/profile", label: t("nav.profile") },
        ]
      : []),
    { to: "/admin", label: t("nav.admin") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-[650] text-foreground"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-lg tracking-tight">AllWay</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-surface-soft hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Language switch */}
          <div
            role="group"
            aria-label="Language"
            className="flex items-center rounded-full border border-border bg-surface p-0.5"
          >
            {(["en", "th"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors",
                  language === l
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={language === l}
              >
                {l}
              </button>
            ))}
          </div>

          {/* User menu */}
          <UserMenu />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-soft text-foreground transition-colors hover:bg-surface-muted"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav
        className="container flex gap-1 overflow-x-auto pb-2 md:hidden"
        aria-label="Primary mobile"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-soft text-muted-foreground",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
