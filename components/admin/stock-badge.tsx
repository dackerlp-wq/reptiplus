import { cn } from "@/lib/utils";
import { STOCK_STATUS_LABEL, type StockStatus } from "@/lib/admin/stock-stats";

const TONE: Record<StockStatus, string> = {
  ok: "bg-success/10 text-success",
  slow: "bg-gold/15 text-gold",
  dead: "bg-error/10 text-error",
  low: "bg-gold/15 text-gold",
  out: "bg-cream-dark text-gray-soft",
};

/** Štítek stavu zásoby (Prodává se / Pomalé / Ležák / Docházející / Vyprodáno). */
export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", TONE[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {STOCK_STATUS_LABEL[status]}
    </span>
  );
}

/** Prodané kusy po týdnech jako malý graf (jedna řada, zvýrazněný konec). */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const w = 92;
  const h = 26;
  const max = Math.max(1, ...data);
  const n = Math.max(2, data.length);
  const pts = data.map((v, i) => [4 + (i * (w - 8)) / (n - 1), h - 3 - (v / max) * (h - 8)] as const);
  if (pts.length === 0) return null;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0].toFixed(1)} ${h - 3} L${pts[0][0].toFixed(1)} ${h - 3} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("block h-[26px] w-[92px]", className)} aria-hidden="true">
      <path d={area} className="fill-forest/10" />
      <path d={line} fill="none" className="stroke-forest" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r={2.5} className="fill-forest" />
    </svg>
  );
}
