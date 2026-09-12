import { Download, FileText, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/invoices/calc";

const dayFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium" });
const select =
  "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

type Search = { year?: string; type?: string; month?: string };

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = sp.month && /^\d{1,2}$/.test(sp.month) ? Number(sp.month) : 0;
  const type = sp.type === "invoice" || sp.type === "credit_note" ? sp.type : "";

  const from = month ? `${year}-${String(month).padStart(2, "0")}-01` : `${year}-01-01`;
  const toDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  const to = toDate.toISOString().slice(0, 10);

  const svc = createServiceClient();
  let query = svc
    .from("invoice")
    .select("*, order:order_id(number, email)")
    .gte("issued_at", from)
    .lt("issued_at", to)
    .order("issued_at", { ascending: false })
    .order("number", { ascending: false });
  if (type) query = query.eq("type", type);
  const { data } = await query;
  const rows = data ?? [];

  const sums = rows.reduce(
    (acc, r) => {
      const sign = r.type === "credit_note" ? -1 : 1;
      const cur = r.currency === "EUR" ? "EUR" : "CZK";
      acc[cur].total += sign * r.total;
      acc[cur].vat += sign * r.vat_total;
      acc[cur].count += 1;
      return acc;
    },
    { CZK: { total: 0, vat: 0, count: 0 }, EUR: { total: 0, vat: 0, count: 0 } },
  );

  const params = new URLSearchParams();
  params.set("year", String(year));
  if (month) params.set("month", String(month));
  if (type) params.set("type", type);
  const exportHref = `/api/admin/invoices/export?${params.toString()}`;
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Faktury</h1>
          <p className="mt-1 text-sm text-gray-soft">
            Vystavené doklady se nemění; opravy jen dobropisem. Nastavení číselné řady je v Nastavení → Fakturace.
          </p>
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest"
        >
          <Download className="size-4" /> Export CSV pro účetní
        </a>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <select name="year" defaultValue={String(year)} className={select}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select name="month" defaultValue={month ? String(month) : ""} className={select}>
          <option value="">Celý rok</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Intl.DateTimeFormat("cs-CZ", { month: "long" }).format(new Date(2026, m - 1, 1))}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type} className={select}>
          <option value="">Faktury i dobropisy</option>
          <option value="invoice">Jen faktury</option>
          <option value="credit_note">Jen dobropisy</option>
        </select>
        <button className="rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest-light">
          Zobrazit
        </button>
      </form>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {(["CZK", "EUR"] as const)
          .filter((c) => sums[c].count > 0)
          .map((c) => (
            <div key={c} className="rounded-xl border border-cream-dark bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
                {c} · {sums[c].count} dokladů
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{formatMoney(sums[c].total, c)}</p>
              <p className="text-xs text-gray-soft">z toho DPH {formatMoney(sums[c].vat, c)} (dobropisy odečteny)</p>
            </div>
          ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          V tomto období nejsou žádné doklady.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Číslo</th>
                <th className="px-4 py-3 font-semibold">Vystaveno</th>
                <th className="px-4 py-3 font-semibold">Odběratel</th>
                <th className="px-4 py-3 font-semibold">Objednávka</th>
                <th className="px-4 py-3 font-semibold text-right">Základ</th>
                <th className="px-4 py-3 font-semibold text-right">DPH</th>
                <th className="px-4 py-3 font-semibold text-right">Celkem</th>
                <th className="px-4 py-3 font-semibold">Uhrazeno</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const credit = r.type === "credit_note";
                const buyer = r.buyer as { name?: string; company?: string } | null;
                const order = r.order as { number: string; email: string } | null;
                return (
                  <tr key={r.id} className="border-t border-cream hover:bg-paper">
                    <td className="px-4 py-3">
                      <span className={cn("font-mono font-semibold", credit ? "text-error" : "text-ink")}>{r.number}</span>
                      <div className="text-xs text-gray-soft">{credit ? "Dobropis" : "Faktura"}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-soft">{dayFmt.format(new Date(r.issued_at))}</td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{buyer?.company || buyer?.name || "—"}</div>
                      {buyer?.company && buyer?.name && <div className="text-xs text-gray-soft">{buyer.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {order ? (
                        <Link href={`/admin/orders/${r.order_id}`} className="font-mono text-forest hover:underline">
                          {order.number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs">{formatMoney(r.subtotal, r.currency)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs">{formatMoney(r.vat_total, r.currency)}</td>
                    <td className={cn("whitespace-nowrap px-4 py-3 text-right font-mono font-semibold", credit && "text-error")}>
                      {credit ? "−" : ""}
                      {formatMoney(r.total, r.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {r.paid_at ? (
                        <span className="rounded-md bg-success/15 px-2 py-0.5 font-semibold text-success">{dayFmt.format(new Date(r.paid_at))}</span>
                      ) : (
                        <span className="rounded-md bg-amber/15 px-2 py-0.5 font-semibold text-amber">
                          {r.due_date ? `do ${dayFmt.format(new Date(r.due_date))}` : "neuhrazeno"}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <a
                        href={`/api/invoices/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-forest hover:bg-forest/10"
                      >
                        <FileText className="size-3.5" /> PDF <ExternalLink className="size-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
