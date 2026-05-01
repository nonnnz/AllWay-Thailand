import { useMemo, useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphVM } from "@/lib/api/types";

const groupColor: Record<string, string> = {
  place: "#2563eb",
  food: "#f59e0b",
  culture: "#10b981",
  nature: "#22c55e",
  route: "#6b7280",
};

const fallbackColor: Record<string, string> = {
  place: "#2563eb",
  food: "#f59e0b",
  culture: "#10b981",
  nature: "#22c55e",
  route: "#6b7280",
};

function resolveTokenToHsl(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const root = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!root) return fallback;
  return `hsl(${root})`;
}

export function ExplainGraph({
  data,
  height = 320,
}: {
  data: GraphVM;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoveredLink, setHoveredLink] = useState<unknown | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    }),
    [data],
  );

  const resolvedGroupColor = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [group, cssVar] of Object.entries(groupColor)) {
      out[group] = resolveTokenToHsl(cssVar, fallbackColor[group] || "#888");
    }
    return out;
  }, []);

  const darkModeActive =
    typeof document !== "undefined" &&
    (document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark"));
  const uiColors = {
    text: darkModeActive ? "#f3f4f6" : "#111827",
    labelBg: darkModeActive ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)",
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-card border border-border bg-surface"
        style={{ height }}
      >
        <ForceGraph2D
          width={width}
          height={height}
          graphData={graphData}
          nodeRelSize={5}
          linkColor={() => "hsla(0, 0%, 50%, 0.35)"}
          linkCurvature={0.08}
          linkWidth={(l: { weight?: number }) => 1 + (l.weight ?? 0.5) * 1.5}
          onLinkHover={(link) => setHoveredLink(link)}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(
            link: {
              source: { x: number; y: number };
              target: { x: number; y: number };
              relation?: string;
              distanceKm?: number;
            },
            ctx,
            scale,
          ) => {
            const sx = link.source?.x;
            const sy = link.source?.y;
            const tx = link.target?.x;
            const ty = link.target?.y;
            if ([sx, sy, tx, ty].some((v) => typeof v !== "number")) return;

            const relation = String(link.relation || "").trim();
            const distance =
              typeof link.distanceKm === "number"
                ? `${link.distanceKm.toFixed(1)}km`
                : "";
            const label =
              hoveredLink === link
                ? [relation, distance].filter(Boolean).join(" ")
                : distance;
            if (!label) return;

            const mxBase = (sx + tx) / 2;
            const myBase = (sy + ty) / 2;
            const dx = tx - sx;
            const dy = ty - sy;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const offset = 8 / scale;
            const mx = mxBase + nx * offset;
            const my = myBase + ny * offset;

            const fontSize = Math.max(5, 7 / scale);
            ctx.font = `${fontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const padX = 2 / scale;
            const padY = 1 / scale;

            ctx.fillStyle = uiColors.labelBg;
            ctx.fillRect(
              mx - textWidth / 2 - padX,
              my - fontSize + 1 - padY,
              textWidth + padX * 2,
              fontSize + padY * 2,
            );
            ctx.fillStyle = uiColors.text;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(label, mx, my + 1);
          }}
          cooldownTicks={60}
          nodeCanvasObject={(
            node: { group?: string; x: number; y: number; label: string },
            ctx,
            scale,
          ) => {
            const group = String(node.group || "").toLowerCase();
            const r = group === "place" ? 8 : 5;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = resolvedGroupColor[group] ?? "#888";
            ctx.fill();
            const label = node.label;
            const fontSize = 10 / scale;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = uiColors.text;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(label, node.x, node.y + r + 2);
          }}
        />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.entries(resolvedGroupColor).map(([k, c]) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: c }}
              aria-hidden
            />
            <span className="capitalize">{k}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
