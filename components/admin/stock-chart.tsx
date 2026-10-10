/**
 * Graf detailu produktu: nahoře stav zásoby po týdnech (stupňovitá čára),
 * dole prodané kusy po týdnech (sloupce). Každý pás má vlastní osu,
 * žádná dvojitá osa. Čistý SVG, renderuje se na serveru.
 */
export function StockChart({
  history,
  weekly,
  lowStockThreshold,
  now = new Date(),
}: {
  history: number[];
  weekly: number[];
  lowStockThreshold: number | null;
  now?: Date;
}) {
  const n = Math.max(history.length, weekly.length, 2);
  const W = 640;
  const H = 230;
  const L = 40;
  const R = 12;
  const T = 14;
  const B = 24;
  const topH = 118;
  const gap = 20;
  const botH = H - T - B - topH - gap;
  const maxS = Math.max(1, ...history, lowStockThreshold ?? 0);
  const maxV = Math.max(1, ...weekly);
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1);
  const bw = (W - L - R) / n;
  const ys = (v: number) => T + topH - (Math.max(0, v) / maxS) * topH;
  const yv = (v: number) => T + topH + gap + botH - (v / maxV) * botH;

  const step = history
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${ys(v).toFixed(1)}` + (i < n - 1 ? ` L${x(i + 1).toFixed(1)} ${ys(v).toFixed(1)}` : ""))
    .join(" ");
  const area = `${step} L${x(n - 1).toFixed(1)} ${ys(0).toFixed(1)} L${x(0).toFixed(1)} ${ys(0).toFixed(1)} Z`;
  const last = history[history.length - 1] ?? 0;
  const fmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric" });
  const labels = Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getTime() - (n - 1 - i) * 7 * 86400_000);
    return fmt.format(d);
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Stav zásoby a týdenní prodeje za posledních 12 týdnů">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={ys(maxS * t)} y2={ys(maxS * t)} className="stroke-cream-dark" />
          <text x={L - 6} y={ys(maxS * t) + 4} textAnchor="end" fontSize={10} className="fill-gray-soft">{Math.round(maxS * t)}</text>
        </g>
      ))}
      <text x={L} y={T - 4} fontSize={10} fontWeight={600} className="fill-gray-soft">SKLADEM (ks)</text>
      <path d={area} className="fill-forest/10" />
      <path d={step} fill="none" className="stroke-forest" strokeWidth={2} strokeLinejoin="round" />
      {lowStockThreshold != null && lowStockThreshold > 0 && (
        <g>
          <line x1={L} x2={W - R} y1={ys(lowStockThreshold)} y2={ys(lowStockThreshold)} className="stroke-gold" strokeDasharray="4 4" />
          <text x={W - R} y={ys(lowStockThreshold) - 4} textAnchor="end" fontSize={10} className="fill-gold">limit {lowStockThreshold} ks</text>
        </g>
      )}
      <circle cx={x(n - 1)} cy={ys(last)} r={4} className="fill-forest" />
      <text x={x(n - 1) - 8} y={ys(last) - 8} textAnchor="end" fontSize={11} fontWeight={600} className="fill-ink">{last} ks</text>

      <text x={L} y={T + topH + gap - 6} fontSize={10} fontWeight={600} className="fill-gray-soft">PRODÁNO ZA TÝDEN (ks)</text>
      <line x1={L} x2={W - R} y1={yv(0)} y2={yv(0)} className="stroke-cream-dark" />
      <text x={L - 6} y={yv(maxV) + 4} textAnchor="end" fontSize={10} className="fill-gray-soft">{maxV}</text>
      {weekly.map((v, i) => (
        <rect key={i} x={x(i) - bw * 0.3} y={yv(v)} width={bw * 0.6} height={Math.max(0, yv(0) - yv(v))} rx={3} className="fill-forest-light">
          <title>{`Týden od ${labels[i]}: prodáno ${v} ks, skladem na konci ${history[i] ?? "—"} ks`}</title>
        </rect>
      ))}
      {labels.map((l, i) => (i % 2 === 0 ? (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} className="fill-gray-soft">{l}</text>
      ) : null))}
    </svg>
  );
}
