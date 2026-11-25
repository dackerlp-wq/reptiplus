"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, RefreshCw, Download } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "@/components/admin/toast";
import { importFeedItemsAction, syncFeedAction } from "@/lib/admin/supplier-actions";
import { marginPct, purchasePrice, sellPrice, type PriceRule } from "@/lib/suppliers/pricing";

export type SupplierRow = {
  id: string;
  itemId: string;
  name: string;
  url: string | null;
  image: string | null;
  manufacturer: string | null;
  category: string | null;
  vatRate: number | null;
  wholesaleCzk: number | null;
  wholesaleEur: number | null;
  retailCzk: number | null;
  retailEur: number | null;
  prevWholesaleCzk: number | null;
  priceChanged: boolean;
  inFeed: boolean;
  productId: string | null;
  productName: string | null;
};

const kc = (minor: number | null) =>
  minor == null ? "—" : new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(minor / 100) + " Kč";
const input = "rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-sm outline-none focus:border-forest";

/** Tlačítko „Načíst teď" u feedu. */
export function SyncFeedButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          const r = await syncFeedAction(fd);
          if (r.ok)
            toast.success(
              `Načteno ${r.items} položek: ${r.added} nových, ${r.changed} se změnou ceny, ${r.gone} zmizelo; aktualizováno ${r.products} produktů.`,
            );
          else toast.error(r.error);
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-ink hover:border-forest hover:text-forest disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Načíst teď
    </button>
  );
}

/** Tabulka položek feedu s výběrem a importem vybraných jako produkty. */
export function SupplierItemsTable({
  rows,
  categories,
  vatPayer,
}: {
  rows: SupplierRow[];
  categories: { id: string; label: string }[];
  vatPayer: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"recommended" | "markup">("recommended");
  const [markup, setMarkup] = useState("40");
  const [pending, start] = useTransition();
  const rule: PriceRule = mode === "markup" ? { mode: "markup", pct: parseFloat(markup.replace(",", ".")) || 0 } : { mode: "recommended" };

  const importable = useMemo(() => rows.filter((r) => !r.productId), [rows]);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allOnPage = importable.length > 0 && importable.every((r) => selected.has(r.id));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-dark text-left text-xs text-gray-soft">
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allOnPage}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      for (const r of importable) {
                        if (allOnPage) n.delete(r.id);
                        else n.add(r.id);
                      }
                      return n;
                    })
                  }
                  className="size-4 accent-forest"
                  aria-label="Vybrat vše na stránce"
                />
              </th>
              <th className="py-2 pr-3 font-semibold">Položka</th>
              <th className="px-2 py-2 text-right font-semibold">
                Nákup
                <span className="block font-normal">bez DPH / s DPH</span>
              </th>
              <th className="px-2 py-2 text-right font-semibold">
                DMC
                <span className="block font-normal">s DPH</span>
              </th>
              <th className="px-2 py-2 text-right font-semibold">
                Marže
                <span className="block font-normal">při DMC</span>
              </th>
              <th className="px-2 py-2 text-right font-semibold">
                Prodejní
                <span className="block font-normal">s DPH</span>
              </th>
              <th className="px-2 py-2 text-right font-semibold">
                Marže
                <span className="block font-normal">při prodejní</span>
              </th>
              <th className="px-3 py-2 font-semibold">Stav</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const buy = purchasePrice(r, vatPayer);
              const buyNet = r.wholesaleCzk != null ? Math.round(r.wholesaleCzk * 100) : null;
              const buyGross = purchasePrice(r, false);
              const sell = sellPrice(r, rule, "CZK");
              const rec = sellPrice(r, { mode: "recommended" }, "CZK");
              const m = marginPct(sell, buy, r.vatRate, vatPayer);
              const mDmc =
                r.wholesaleCzk != null && r.retailCzk ? Math.round((1 - r.wholesaleCzk / r.retailCzk) * 1000) / 10 : null;
              return (
                <tr key={r.id} className={`border-b border-cream last:border-0 ${r.inFeed ? "" : "opacity-60"}`}>
                  <td className="px-3 py-2">
                    {!r.productId && (
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="size-4 accent-forest"
                        aria-label={`Vybrat ${r.name}`}
                      />
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-3">
                      {r.image ? (
                        <img src={r.image} alt="" loading="lazy" className="size-11 shrink-0 rounded-md border border-cream object-contain" />
                      ) : (
                        <div className="size-11 shrink-0 rounded-md bg-cream" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{r.name}</p>
                        <p className="truncate text-xs text-gray-soft">
                          {[r.manufacturer, r.category?.split(" | ").slice(-1)[0], `#${r.itemId}`, r.vatRate != null ? `DPH ${r.vatRate} %` : null]
                            .filter(Boolean)
                            .join(" · ")}
                          {r.url && (
                            <a href={r.url} target="_blank" rel="noreferrer" className="ml-1 inline-flex align-middle hover:text-forest">
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 text-right font-mono text-xs tabular-nums">
                    {kc(buyNet)}
                    <span className="block text-gray-soft">{kc(buyGross)}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 text-right font-mono text-xs tabular-nums">{kc(rec)}</td>
                  <td className={`whitespace-nowrap px-2 text-right font-mono text-xs tabular-nums ${mDmc != null && mDmc < 15 ? "text-error" : ""}`}>
                    {mDmc == null ? "—" : `${String(mDmc).replace(".", ",")} %`}
                  </td>
                  <td className="whitespace-nowrap px-2 text-right font-mono text-xs font-semibold tabular-nums">{kc(sell)}</td>
                  <td className={`whitespace-nowrap px-2 text-right font-mono text-xs tabular-nums ${m != null && m < 15 ? "text-error" : ""}`}>
                    {m == null ? "—" : `${String(m).replace(".", ",")} %`}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.productId ? (
                      <Link href={`/admin/products/${r.productId}`} className="font-semibold text-forest hover:underline">
                        V eshopu
                      </Link>
                    ) : (
                      <span className="text-gray-soft">Nové</span>
                    )}
                    {r.priceChanged && (
                      <p className="text-amber-700">
                        Nákup {kc(r.prevWholesaleCzk != null ? Math.round(r.prevWholesaleCzk * 100) : null)} → {kc(r.wholesaleCzk != null ? Math.round(r.wholesaleCzk * 100) : null)} bez DPH
                      </p>
                    )}
                    {!r.inFeed && <p className="text-error">Zmizelo z feedu</p>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-soft">
                  Nic neodpovídá filtru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        action={(fd) =>
          start(async () => {
            fd.set("ids", [...selected].join(","));
            fd.set("rule", mode);
            const r = await importFeedItemsAction(fd);
            const msg = `Založeno ${r.created} produktů${r.linked ? `, ${r.linked} napojeno na existující (stejný EAN/SKU)` : ""}.`;
            if (r.errors.length) toast.error(`${msg} Chyby: ${r.errors.slice(0, 3).join("; ")}`);
            else toast.success(msg);
            setSelected(new Set());
            router.refresh();
          })
        }
        className="sticky bottom-3 z-10 flex flex-wrap items-end gap-3 rounded-xl border border-forest/30 bg-white p-4 shadow-lg"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Prodejní cena (s DPH)</span>
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === "recommended"} onChange={() => setMode("recommended")} className="accent-forest" />
              DMC (doporučená dodavatelem)
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === "markup"} onChange={() => setMode("markup")} className="accent-forest" />
              nákup +
            </label>
            <input
              name="markup"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              disabled={mode !== "markup"}
              inputMode="decimal"
              className={`${input} w-16`}
            />
            %
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Kategorie v eshopu</span>
          <select name="category_id" className={`${input} min-w-52`}>
            <option value="">— bez kategorie —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="copy_images" defaultChecked className="size-4 accent-forest" /> stáhnout obrázky
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="publish" className="size-4 accent-forest" /> hned zveřejnit
        </label>
        <button
          disabled={pending || selected.size === 0 || selected.size > 40}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {pending ? "Importuji…" : `Naimportovat vybrané (${selected.size})`}
        </button>
        {selected.size > 40 && <p className="w-full text-xs text-error">Najednou max. 40 položek (kvůli obrázkům) — zbytek ve další dávce.</p>}
      </form>
    </div>
  );
}
