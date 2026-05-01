import { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphVM } from '@/lib/api/types';

const groupColor: Record<string, string> = {
  place: 'hsl(var(--primary))',
  food: 'hsl(var(--tertiary))',
  culture: 'hsl(var(--local-value))',
  nature: 'hsl(var(--trust))',
  route: 'hsl(var(--muted-foreground))',
};

export function ExplainGraph({ data, height = 320 }: { data: GraphVM; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

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

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="overflow-hidden rounded-card border border-border bg-surface" style={{ height }}>
        <ForceGraph2D
          width={width}
          height={height}
          graphData={graphData}
          nodeRelSize={5}
          linkColor={() => 'hsla(0, 0%, 50%, 0.35)'}
          linkWidth={(l: any) => 1 + (l.weight ?? 0.5) * 1.5}
          cooldownTicks={60}
          nodeCanvasObject={(node: any, ctx, scale) => {
            const r = node.group === 'place' ? 8 : 5;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = groupColor[node.group] ?? '#888';
            ctx.fill();
            const label: string = node.label;
            const fontSize = 11 / scale;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = 'hsl(var(--foreground))';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, node.x, node.y + r + 2);
          }}
        />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.entries(groupColor).map(([k, c]) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} aria-hidden />
            <span className="capitalize">{k}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
