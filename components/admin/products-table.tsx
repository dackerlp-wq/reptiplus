"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice, discountPercent } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast, ToastForm } from "./toast";
import {
  deleteProductAction,
  togglePublishAction,
  toggleFeaturedAction,
  bulkProductAction,
  setProductStockAction,
  setProductPriceAction,
} from "@/lib/admin/actions";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  priceCzk: number;
  compareCzk: number | null;
  stock: number;
  published: boolean;
  featured: boolean;
  categoryName: string | null;
  sold: number;
};

type SortKey = "name" | "category" | "price" | "stock" | "sold";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "published" | "hidden";
type StockFilter = "all" | "in" | "low" | "out";

const PAGE_SIZE = 20;
const czk = (minor: number) => formatPrice(minor, "cs");

function TriCheckbox({
  checked,
  indeterminate,
  onChange,
  title,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      title={title}
      className="size-4 cursor-pointer rounded border-cream-dark text-forest accent-forest"
    />
  );
}

/** Inline editovatelná číselná buňka (sklad = celé číslo, cena = Kč z haléřů). */
function InlineEditCell({
  initial,
  kind,
  onCommit,
  className,
}: {
  initial: number; // uložená hodnota: qty nebo haléře
  kind: "int" | "money";
  onCommit: (raw: number) => void | Promise<unknown>; // raw = qty nebo haléře
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  const display = kind === "money" ? czk(initial) : String(initial);
  const toDraft = () =>
    kind === "money" ? (initial / 100).toString().replace(".", ",") : String(initial);

  const begin = () => {
    setDraft(toDraft());
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commit = () => {
    setEditing(false);
    const raw = draft.replace(",", ".").trim();
    if (raw === "") return;
    const n = kind === "money" ? Math.round(parseFloat(raw) * 100) : parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n === initial) return;
    start(async () => {
      try {
        await onCommit(n);
        toast.success("Uloženo");
      } catch {
        toast.error("Uložení se nezdařilo");
      }
    });
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        inputMode={kind === "money" ? "decimal" : "numeric"}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        className="w-24 rounded-md border border-forest bg-white px-2 py-1 text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={begin}
      title="Kliknutím upravit"
      className={cn(
        "group/edit inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono font-medium transition-colors hover:bg-cream",
        className,
      )}
    >
      {display}
      {pending ? (
        <Loader2 className="size-3 animate-spin text-forest" />
      ) : (
        <Pencil className="size-3 text-gray-soft opacity-0 transition-opacity group-hover/edit:opacity-100" />
      )}
    </button>
  );
}

/** Sestaví a stáhne CSV (oddělovač `;`, BOM pro Excel/diakritiku). */
function downloadCsv(rows: ProductRow[]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const kc = (minor: number | null) =>
    minor === null ? "" : (minor / 100).toFixed(2).replace(".", ",");
  const header = [
    "Název",
    "Slug",
    "Kategorie",
    "Cena (Kč)",
    "Původní cena (Kč)",
    "Sklad",
    "Prodáno",
    "Publikováno",
    "Doporučeno",
  ];
  const lines = rows.map((p) =>
    [
      p.name,
      p.slug,
      p.categoryName ?? "",
      kc(p.priceCzk),
      kc(p.compareCzk),
      p.stock,
      p.sold,
      p.published ? "ano" : "ne",
      p.featured ? "ano" : "ne",
    ]
      .map(esc)
      .join(";"),
  );
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `produkty-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ProductsTable({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: string[];
}) {
  const searchParams = useSearchParams();

  // Počáteční stav z URL (sdílitelný odkaz, přežije reload)
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("cat") ?? "all");
  const [status, setStatus] = useState<StatusFilter>(
    () => (searchParams.get("st") as StatusFilter) || "all",
  );
  const [stock, setStock] = useState<StockFilter>(
    () => (searchParams.get("stock") as StockFilter) || "all",
  );
  const [onlySale, setOnlySale] = useState(() => searchParams.get("sale") === "1");
  const [onlyFeatured, setOnlyFeatured] = useState(
    () => searchParams.get("feat") === "1",
  );
  const [sortKey, setSortKey] = useState<SortKey>(
    () => (searchParams.get("sort") as SortKey) || "sold",
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    () => (searchParams.get("dir") as SortDir) || "desc",
  );
  const [page, setPage] = useState(() =>
    Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Stav → URL přes history.replaceState (bez RSC refetchu → filtrování je okamžité,
  // odkaz zůstává sdílitelný a přežije reload). Debounce kvůli psaní do hledání.
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category !== "all") params.set("cat", category);
    if (status !== "all") params.set("st", status);
    if (stock !== "all") params.set("stock", stock);
    if (onlySale) params.set("sale", "1");
    if (onlyFeatured) params.set("feat", "1");
    if (sortKey !== "sold") params.set("sort", sortKey);
    if (sortDir !== "desc") params.set("dir", sortDir);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const t = setTimeout(() => {
      const url = qs
        ? `${window.location.pathname}?${qs}`
        : window.location.pathname;
      window.history.replaceState(null, "", url);
    }, 250);
    return () => clearTimeout(t);
  }, [q, category, status, stock, onlySale, onlyFeatured, sortKey, sortDir, page]);

  const resetPage = () => setPage(1);
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "category" ? "asc" : "desc");
    }
    resetPage();
  };

  const isSale = (p: ProductRow) =>
    p.compareCzk !== null && p.compareCzk > p.priceCzk;

  const maxSold = useMemo(
    () => Math.max(1, ...products.map((p) => p.sold)),
    [products],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = products.filter((p) => {
      if (needle && !p.name.toLowerCase().includes(needle) && !p.slug.includes(needle))
        return false;
      if (category !== "all" && p.categoryName !== category) return false;
      if (status === "published" && !p.published) return false;
      if (status === "hidden" && p.published) return false;
      if (onlySale && !isSale(p)) return false;
      if (onlyFeatured && !p.featured) return false;
      if (stock === "in" && p.stock <= 0) return false;
      if (stock === "out" && p.stock > 0) return false;
      if (stock === "low" && (p.stock <= 0 || p.stock > 5)) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "cs") * dir;
        case "category":
          return (a.categoryName ?? "").localeCompare(b.categoryName ?? "", "cs") * dir;
        case "price":
          return (a.priceCzk - b.priceCzk) * dir;
        case "stock":
          return (a.stock - b.stock) * dir;
        case "sold":
          return (a.sold - b.sold) * dir;
      }
    });
    return list;
  }, [products, q, category, status, stock, onlySale, onlyFeatured, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Ochrana proti stránce mimo rozsah po změně filtru
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Výběr napříč filtrem (všechny odpovídající řádky)
  const filteredIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const selectedInFilter = filteredIds.filter((id) => selected.has(id));
  const allSelected =
    filteredIds.length > 0 && selectedInFilter.length === filteredIds.length;
  const someSelected = selectedInFilter.length > 0;

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());

  const selectedIds = [...selected].join(",");

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="size-3.5 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    );
  };
  const Th = ({
    col,
    children,
    className,
  }: {
    col: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={cn("px-4 py-3", className)}>
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-forest",
          sortKey === col && "text-forest",
        )}
      >
        {children}
        <SortIcon col={col} />
      </button>
    </th>
  );

  const selectCls =
    "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-forest";
  const chipCls = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "border-forest bg-forest text-white"
        : "border-cream-dark bg-white text-charcoal hover:border-forest hover:text-forest",
    );
  const bulkBtn =
    "inline-flex items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-3 py-1.5 text-sm font-medium text-charcoal transition-colors hover:border-forest hover:text-forest";

  return (
    <div>
      {/* Panel filtrů */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetPage();
            }}
            placeholder="Hledat název nebo slug…"
            className="w-full rounded-lg border border-cream-dark bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-forest"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            resetPage();
          }}
          className={selectCls}
        >
          <option value="all">Všechny kategorie</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            resetPage();
          }}
          className={selectCls}
        >
          <option value="all">Vše (stav)</option>
          <option value="published">Publikováno</option>
          <option value="hidden">Skryto</option>
        </select>

        <select
          value={stock}
          onChange={(e) => {
            setStock(e.target.value as StockFilter);
            resetPage();
          }}
          className={selectCls}
        >
          <option value="all">Vše (sklad)</option>
          <option value="in">Skladem</option>
          <option value="low">Poslední kusy</option>
          <option value="out">Vyprodáno</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setOnlySale((v) => !v);
            resetPage();
          }}
          className={chipCls(onlySale)}
        >
          <Tag className="size-3.5" /> V akci
        </button>
        <button
          type="button"
          onClick={() => {
            setOnlyFeatured((v) => !v);
            resetPage();
          }}
          className={chipCls(onlyFeatured)}
        >
          <Star className="size-3.5" /> Doporučené
        </button>

        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
          title="Exportovat filtrované produkty do CSV"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal transition-colors enabled:hover:border-forest enabled:hover:text-forest disabled:opacity-40"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </div>

      {/* Lišta hromadných akcí */}
      {someSelected && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-forest/30 bg-forest/5 px-4 py-2.5">
          <span className="text-sm font-semibold text-forest">
            {selectedInFilter.length} vybráno
          </span>
          <div className="mx-1 h-5 w-px bg-cream-dark" />
          <ToastForm
            action={bulkProductAction}
            success="Publikováno"
            onSuccess={clearSelection}
          >
            <input type="hidden" name="op" value="publish" />
            <input type="hidden" name="ids" value={selectedIds} />
            <button type="submit" className={bulkBtn}>
              <Eye className="size-4" /> Publikovat
            </button>
          </ToastForm>
          <ToastForm
            action={bulkProductAction}
            success="Skryto"
            onSuccess={clearSelection}
          >
            <input type="hidden" name="op" value="hide" />
            <input type="hidden" name="ids" value={selectedIds} />
            <button type="submit" className={bulkBtn}>
              <EyeOff className="size-4" /> Skrýt
            </button>
          </ToastForm>
          <ToastForm
            action={bulkProductAction}
            success="Nastaveno jako doporučené"
            onSuccess={clearSelection}
          >
            <input type="hidden" name="op" value="feature" />
            <input type="hidden" name="ids" value={selectedIds} />
            <button type="submit" className={bulkBtn}>
              <Star className="size-4" /> Doporučit
            </button>
          </ToastForm>
          <ToastForm
            action={bulkProductAction}
            success="Doporučení zrušeno"
            onSuccess={clearSelection}
          >
            <input type="hidden" name="op" value="unfeature" />
            <input type="hidden" name="ids" value={selectedIds} />
            <button type="submit" className={bulkBtn}>
              <StarOff className="size-4" /> Zrušit doporučení
            </button>
          </ToastForm>
          <ToastForm
            action={bulkProductAction}
            success="Smazáno"
            confirm={`Opravdu smazat ${selectedInFilter.length} vybraných produktů? Tuto akci nelze vrátit.`}
            onSuccess={clearSelection}
          >
            <input type="hidden" name="op" value="delete" />
            <input type="hidden" name="ids" value={selectedIds} />
            <button
              type="submit"
              className={cn(bulkBtn, "hover:border-error hover:text-error")}
            >
              <Trash2 className="size-4" /> Smazat
            </button>
          </ToastForm>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto inline-flex items-center gap-1 text-sm text-gray-soft hover:text-charcoal"
          >
            <X className="size-4" /> Zrušit výběr
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
            <tr>
              <th className="w-10 px-4 py-3">
                <TriCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleSelectAll}
                  title="Vybrat vše"
                />
              </th>
              <Th col="name">Název</Th>
              <Th col="category">Kategorie</Th>
              <Th col="price">Cena</Th>
              <Th col="stock">Sklad</Th>
              <Th col="sold">Prodáno</Th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => {
              const sale = isSale(p);
              const off = sale ? discountPercent(p.priceCzk, p.compareCzk) : null;
              const stockClass =
                p.stock <= 0
                  ? "text-error"
                  : p.stock <= 5
                    ? "text-amber"
                    : "text-success";
              const checked = selected.has(p.id);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-cream last:border-0",
                    checked && "bg-forest/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <TriCheckbox
                      checked={checked}
                      onChange={() => toggleRow(p.id)}
                      title="Vybrat"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium text-ink hover:text-forest"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-gray-soft">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-charcoal">
                    {p.categoryName ?? <span className="text-gray-soft">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <InlineEditCell
                        initial={p.priceCzk}
                        kind="money"
                        onCommit={(raw) => setProductPriceAction(p.id, raw)}
                        className="text-ink"
                      />
                      {sale && (
                        <>
                          <span className="font-mono text-xs text-gray-soft line-through">
                            {czk(p.compareCzk!)}
                          </span>
                          <span className="rounded bg-error/15 px-1.5 py-0.5 text-xs font-semibold text-error">
                            −{off}%
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <InlineEditCell
                      initial={p.stock}
                      kind="int"
                      onCommit={(raw) => setProductStockAction(p.id, raw)}
                      className={stockClass}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-mono text-ink">{p.sold}</span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-cream">
                        <span
                          className="block h-full rounded-full bg-forest"
                          style={{ width: `${(p.sold / maxSold) * 100}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          p.published
                            ? "bg-success/15 text-success"
                            : "bg-gray-soft/15 text-gray-soft",
                        )}
                      >
                        {p.published ? "Publikováno" : "Skryto"}
                      </span>
                      {p.featured && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                          <Star className="size-3" /> Doporučené
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ToastForm
                        action={toggleFeaturedAction}
                        success={p.featured ? "Doporučení zrušeno" : "Doporučeno"}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="featured"
                          value={p.featured ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          title={p.featured ? "Zrušit doporučení" : "Doporučit"}
                          className={cn(
                            "rounded-md p-2 hover:bg-cream",
                            p.featured
                              ? "text-gold"
                              : "text-gray-soft hover:text-gold",
                          )}
                        >
                          <Star
                            className="size-4"
                            fill={p.featured ? "currentColor" : "none"}
                          />
                        </button>
                      </ToastForm>
                      <ToastForm
                        action={togglePublishAction}
                        success={p.published ? "Skryto" : "Publikováno"}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="publish"
                          value={p.published ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          title={p.published ? "Skrýt" : "Publikovat"}
                          className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                        >
                          {p.published ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </ToastForm>
                      <a
                        href={`/cs/produkt/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Zobrazit na webu"
                        className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                      <Link
                        href={`/admin/products/${p.id}`}
                        title="Upravit"
                        className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ToastForm
                        action={deleteProductAction}
                        success="Smazáno"
                        confirm={`Smazat produkt „${p.name}"?`}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          title="Smazat"
                          className="rounded-md p-2 text-gray-soft hover:bg-error/10 hover:text-error"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </ToastForm>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-soft">
                  Žádné produkty neodpovídají filtru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Patička — počet + stránkování */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-soft">
          {filtered.length > 0
            ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                safePage * PAGE_SIZE,
                filtered.length,
              )} z ${filtered.length}`
            : "0"}{" "}
          produktů
          {filtered.length !== products.length && ` (celkem ${products.length})`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-sm text-charcoal transition-colors enabled:hover:border-forest enabled:hover:text-forest disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 text-sm text-charcoal">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-sm text-charcoal transition-colors enabled:hover:border-forest enabled:hover:text-forest disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
