import { Header } from "./Header";
import { useT } from "@/lib/i18n";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";

export function PageShell({
  children,
  currentPlaceId,
}: {
  children: React.ReactNode;
  currentPlaceId?: string;
}) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col grain-surface">
      <Header />
      <main className="flex-1 relative z-10">{children}</main>
      <footer className="relative z-10 border-t border-border bg-surface-soft/60 backdrop-blur-sm">
        <div className="container flex flex-col items-center gap-3 py-8 text-xs text-muted-foreground">
          {/* Handwritten sign-off — moodboard §13 tone-of-voice */}
          <p
            className="font-hand text-2xl text-chili"
            style={{ transform: "rotate(-1.5deg)" }}
          >
            "see you in Bangkok."
          </p>
          <p>{t("disclaimer")}</p>
          <p className="font-mono opacity-60">AllWay · v0.1 · data from TAT</p>
        </div>
      </footer>
      <AssistantPanel currentPlaceId={currentPlaceId} />
    </div>
  );
}
