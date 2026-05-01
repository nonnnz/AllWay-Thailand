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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-surface-soft/60">
        <div className="container flex flex-col gap-2 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{t("disclaimer")}</p>
          <p className="font-mono">AllWay MVP · v0.1</p>
        </div>
      </footer>
      <AssistantPanel currentPlaceId={currentPlaceId} />
    </div>
  );
}
