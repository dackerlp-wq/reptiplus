import { ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getStockMovements } from "@/lib/admin/stock";
import { MOVEMENT_LABEL, MOVEMENT_TYPES, isMovementType } from "@/lib/admin/stock-stats";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const dateFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const input = "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

export default async function AdminStockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const type = isMovementType(sp.type) ? sp.type : "";
  const { rows, total } = await getStockMovements({ type, q: sp.q, from: sp.from, to: sp.to, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (type) u.set("type", type);
    if (sp.q) u.set("q", sp.q);
    if (sp.from) u.set("from", sp.from);
    if (sp.to) u.set("to", sp.to);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/stock/movements${s ? `?${s}` : ""}`;
  };
  const exportQs = new URLSearchParams({ kind: "movements", ...(type ? { type } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}) }).toString();

  return (
    <div className="max-w-7xl">
      <Link href="/admin/stock" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Sklad
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Pohyby skladu</h1>
          <p className="mt-1 text-sm text-gray-soft">{total} záznamů · každá změna zásoby s typem, zdrojem a autorem.</p>
        </div>
        <a href={`/api/admin/stock/export?${exportQs}`} className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
          <Download className="size-4" /> Export CSV
        </a>
      </div>

      <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Produkt, SKU, doklad, poznámka" className={cn(input, "min-w-[240px]")} />
        <select name="type" defaultValue={type} className={input}>
          <option value="">Všechny typy</option>
          {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{MOVEMENT_LABEL[t]}</option>)}
        </select>
        <input name="from" type="date" defaultValue={sp.from ?? ""} className={input} />
        <span className="text-gray-soft">–</span>
        <input name="to" type="date" defaultValue={sp.to ?? ""} className={input} />
        <button type="submit" className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light">Filtrovat</button>
        {(sp.q || type || sp.from || sp.to) && (
          <Link href="/admin/stock/movements" className="text-sm text-gray-soft hover:text-ink">Zrušit filtr</Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-dark text-left text-[11px] uppercase tracking-wide text-gray-soft">
              <th className="px-4 py-2.5 font-semibold">Datum</th>
              <th className="px-3 py-2.5 font-semibold">Produkt</th>
              <th className="px-3 py-2.5 font-semibold">Typ</th>
              <th className="px-3 py-2.5 text-right font-semibold">Změna</th>
              <th className="px-3 py-2.5 text-right font-semibold">Stav po</th>
              <th className="px-3 py-2.5 font-semibold">Zdroj</th>
              <th className="px-3 py-2.5 font-semibold">Kdo</th>
              <th className="px-4 py-2.5 font-semibold">Poznámka</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-soft">Žádné pohyby pro zvolený filtr.</td></tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-soft">{dateFmt.format(new Date(m.createdAt))}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/stock/${m.productId}`} className="font-semibold text-ink hover:text-forest">{m.productName}</Link>
                    <div className="font-mono text-[11px] text-gray-soft">{m.productSku ?? ""}{m.variantName ? ` · ${m.variantName}` : ""}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold">{MOVEMENT_LABEL[m.type]}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", m.delta > 0 ? "text-success" : m.delta < 0 ? "text-error" : "text-gray-soft")}>
                    {m.delta > 0 ? "+" : ""}{m.delta}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{m.qtyAfter ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {m.orderId ? (
                      <Link href={`/admin/orders/${m.orderId}`} className="font-mono text-forest hover:underline">{m.orderNumber ?? "objednávka"}</Link>
                    ) : (
                      <span className="text-gray-soft">{m.source ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-soft">{m.author ?? (m.orderId ? "objednávka" : "systém")}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-soft">{m.note ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-cream-dark px-4 py-2 text-sm text-gray-soft">
            <span>Strana {page} z {pages}</span>
            <div className="flex gap-1">
              <Link aria-disabled={page <= 1} href={qs(Math.max(1, page - 1))} className={cn("rounded-lg border border-cream-dark p-1.5 hover:bg-cream", page <= 1 && "pointer-events-none opacity-40")}><ChevronLeft className="size-4" /></Link>
              <Link aria-disabled={page >= pages} href={qs(Math.min(pages, page + 1))} className={cn("rounded-lg border border-cream-dark p-1.5 hover:bg-cream", page >= pages && "pointer-events-none opacity-40")}><ChevronRight className="size-4" /></Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
