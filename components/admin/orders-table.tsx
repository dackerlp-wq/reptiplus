"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShoppingBag,
  Banknote,
  Clock,
  AlertCircle,
  X,
  Cog,
  Truck,
  PackageCheck,
  Ban,
  PackagePlus,
  Printer,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toast, ToastForm } from "./toast";
import {
  setOrderStatusAction,
  setOrderPaymentAction,
  bulkOrderAction,
} from "@/lib/admin/actions";
import { bulkCreateShipmentsAction } from "@/lib/admin/shipping-actions";

export type OrderRow = {
  id: string;
  number: string;
  email: string;
  total: number;
  currency: string;
  status: string;
  payment: string;
  itemCount: number;
  createdAt: string;
};

type SortKey = "date" | "number" | "items" | "total";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

const STATUS: [string, string][] = [
  ["new", "Nová"],
  ["paid", "Zaplacená"],
  ["processing", "Zpracovává se"],
  ["shipped", "Odeslaná"],
  ["delivered", "Doručená"],
  ["cancelled", "Stornovaná"],
  ["refunded", "Vrácená"],
];
const PAYMENT: [string, string][] = [
  ["pending", "Čeká"],
  ["paid", "Zaplaceno"],
  ["failed", "Selhalo"],
  ["refunded", "Vráceno"],
];
const STATUS_LABEL = Object.fromEntries(STATUS);
const PAYMENT_LABEL = Object.fromEntries(PAYMENT);

const statusColor = (s: string) =>
  ({
    new: "bg-amber/15 text-amber",
    paid: "bg-success/15 text-success",
    processing: "bg-gold/15 text-gold",
    shipped: "bg-forest/15 text-forest",
    delivered: "bg-success/20 text-success",
    cancelled: "bg-gray-soft/20 text-gray-soft",
    refunded: "bg-error/15 text-error",
  })[s] ?? "bg-cream text-charcoal";
const paymentColor = (s: string) =>
  ({
    pending: "bg-amber/15 text-amber",
    paid: "bg-success/15 text-success",
    failed: "bg-error/15 text-error",
    refunded: "bg-gray-soft/20 text-gray-soft",
  })[s] ?? "bg-cream text-charcoal";

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "CZK" ? "cs-CZ" : "de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CZK" ? 0 : 2,
  }).format(minor / 100);

const dateFmt = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "short",
  timeStyle: "short",
});

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
      className="size-4 cursor-pointer rounded border-cream-dark accent-forest"
    />
  );
}

/** Barevný inline select pro rychlou změnu stavu/platby. */
function InlineSelect({
  value,
  options,
  colorOf,
  onCommit,
  title,
}: {
  value: string;
  options: [string, string][];
  colorOf: (v: string) => string;
  onCommit: (v: string) => void | Promise<unknown>;
  title?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <span className="relative inline-flex items-center">
      <select
        value={value}
        disabled={pending}
        title={title}
        onChange={(e) => {
          const v = e.target.value;
          start(async () => {
            try {
              await onCommit(v);
              toast.success("Uloženo");
            } catch {
              toast.error("Uložení se nezdařilo");
            }
          });
        }}
        className={cn(
          "cursor-pointer appearance-none rounded-md py-1 pl-2 pr-6 text-xs font-medium outline-none disabled:opacity-60",
          colorOf(value),
        )}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-white text-ink">
            {l}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2 className="pointer-events-none absolute right-1.5 size-3 animate-spin" />
      ) : (
        <ChevronDown className="pointer-events-none absolute right-1.5 size-3 opacity-60" />
      )}
    </span>
  );
}

/** Hromadné podání zásilek u dopravce (přeskočí bez API / s existující zásilkou). */
function BulkShipmentButton({
  ids,
  onDone,
}: {
  ids: string;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const fd = new FormData();
            fd.set("ids", ids);
            const r = await bulkCreateShipmentsAction(fd);
            const parts = [`vytvořeno ${r.created}`];
            if (r.failed) parts.push(`selhalo ${r.failed}`);
            if (r.skipped) parts.push(`přeskočeno ${r.skipped}`);
            if (r.failed > 0)
              toast.error(`Zásilky: ${parts.join(", ")}`);
            else toast.success(`Zásilky: ${parts.join(", ")}`);
            onDone();
          } catch {
            toast.error("Zásilky se nepodařilo vytvořit");
          }
        })
      }
      className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-3 py-1.5 text-sm font-medium text-charcoal transition-colors hover:border-forest hover:text-forest disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <PackagePlus className="size-4" />
      )}{" "}
      Vytvořit zásilky
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cream-dark bg-white px-4 py-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          accent ?? "bg-forest/10 text-forest",
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-gray-soft">{label}</span>
        <span className="block truncate font-display text-lg font-semibold text-ink">
          {value}
        </span>
      </span>
    </div>
  );
}

function downloadCsv(rows: OrderRow[]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "Číslo",
    "Datum",
    "E-mail",
    "Položky",
    "Částka",
    "Měna",
    "Stav",
    "Platba",
  ];
  const lines = rows.map((o) =>
    [
      o.number,
      dateFmt.format(new Date(o.createdAt)),
      o.email,
      o.itemCount,
      (o.total / 100).toFixed(2).replace(".", ","),
      o.currency,
      STATUS_LABEL[o.status] ?? o.status,
      PAYMENT_LABEL[o.payment] ?? o.payment,
    ]
      .map(esc)
      .join(";"),
  );
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `objednavky-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const searchParams = useSearchParams();

  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("st") ?? "all");
  const [payment, setPayment] = useState(() => searchParams.get("pay") ?? "all");
  const [unpaid, setUnpaid] = useState(() => searchParams.get("unpaid") === "1");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>(
    () => (searchParams.get("sort") as SortKey) || "date",
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    () => (searchParams.get("dir") as SortDir) || "desc",
  );
  const [page, setPage] = useState(() =>
    Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1),
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("st", status);
    if (payment !== "all") params.set("pay", payment);
    if (unpaid) params.set("unpaid", "1");
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (sortKey !== "date") params.set("sort", sortKey);
    if (sortDir !== "desc") params.set("dir", sortDir);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const t = setTimeout(() => {
      window.history.replaceState(
        null,
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
      );
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, payment, unpaid, dateFrom, dateTo, sortKey, sortDir, page]);

  const resetPage = () => setPage(1);
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "number" ? "asc" : "desc");
    }
    resetPage();
  };

  // Souhrn nad všemi objednávkami (ne jen filtrovanými)
  const summary = useMemo(() => {
    const revenue = new Map<string, number>();
    let newCount = 0;
    let awaiting = 0;
    for (const o of orders) {
      if (o.payment === "paid")
        revenue.set(o.currency, (revenue.get(o.currency) ?? 0) + o.total);
      if (o.status === "new") newCount++;
      if (
        o.payment === "pending" &&
        o.status !== "cancelled" &&
        o.status !== "refunded"
      )
        awaiting++;
    }
    const revenueStr =
      revenue.size === 0
        ? money(0, "CZK")
        : [...revenue.entries()].map(([c, v]) => money(v, c)).join(" + ");
    return { revenueStr, newCount, awaiting };
  }, [orders]);

  // Datové meze (od 00:00 do 23:59:59.999)
  const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  const setPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    setDateFrom(days === 0 ? iso(to) : iso(from));
    setDateTo(iso(to));
    resetPage();
  };
  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
    resetPage();
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (
        needle &&
        !o.number.toLowerCase().includes(needle) &&
        !o.email.toLowerCase().includes(needle)
      )
        return false;
      if (status !== "all" && o.status !== status) return false;
      if (payment !== "all" && o.payment !== payment) return false;
      if (
        unpaid &&
        !(
          o.payment === "pending" &&
          o.status !== "cancelled" &&
          o.status !== "refunded"
        )
      )
        return false;
      const ts = new Date(o.createdAt).getTime();
      if (fromMs !== null && ts < fromMs) return false;
      if (toMs !== null && ts > toMs) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "date":
          return (
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
            dir
          );
        case "number":
          return a.number.localeCompare(b.number, "cs", { numeric: true }) * dir;
        case "items":
          return (a.itemCount - b.itemCount) * dir;
        case "total":
          return (a.total - b.total) * dir;
      }
    });
    return list;
  }, [orders, q, status, payment, unpaid, fromMs, toMs, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Výběr napříč filtrem
  const filteredIds = useMemo(() => filtered.map((o) => o.id), [filtered]);
  const selectedInFilter = filteredIds.filter((id) => selected.has(id));
  const allSelected =
    filteredIds.length > 0 && selectedInFilter.length === filteredIds.length;
  const someSelected = selectedInFilter.length > 0;
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
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

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
        Zatím žádné objednávky.
      </p>
    );
  }

  return (
    <div>
      {/* Souhrnné karty */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={ShoppingBag}
          label="Objednávky"
          value={String(orders.length)}
        />
        <SummaryCard
          icon={Banknote}
          label="Tržby (zaplacené)"
          value={summary.revenueStr}
          accent="bg-success/10 text-success"
        />
        <SummaryCard
          icon={Clock}
          label="Nové"
          value={String(summary.newCount)}
          accent="bg-amber/10 text-amber"
        />
        <SummaryCard
          icon={AlertCircle}
          label="Čeká na platbu"
          value={String(summary.awaiting)}
          accent="bg-error/10 text-error"
        />
      </div>

      {/* Filtry */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetPage();
            }}
            placeholder="Hledat číslo nebo e-mail…"
            className="w-full rounded-lg border border-cream-dark bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-forest"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            resetPage();
          }}
          className={selectCls}
        >
          <option value="all">Všechny stavy</option>
          {STATUS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={payment}
          onChange={(e) => {
            setPayment(e.target.value);
            resetPage();
          }}
          className={selectCls}
        >
          <option value="all">Všechny platby</option>
          {PAYMENT.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setUnpaid((v) => !v);
            resetPage();
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            unpaid
              ? "border-forest bg-forest text-white"
              : "border-cream-dark bg-white text-charcoal hover:border-forest hover:text-forest",
          )}
        >
          <AlertCircle className="size-3.5" /> Nezaplacené
        </button>

        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
          title="Exportovat filtrované objednávky do CSV"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal transition-colors enabled:hover:border-forest enabled:hover:text-forest disabled:opacity-40"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </div>

      {/* Datový filtr */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-soft">Období:</span>
        <button
          type="button"
          onClick={() => setPreset(0)}
          className="rounded-full border border-cream-dark bg-white px-3 py-1.5 font-medium text-charcoal transition-colors hover:border-forest hover:text-forest"
        >
          Dnes
        </button>
        <button
          type="button"
          onClick={() => setPreset(7)}
          className="rounded-full border border-cream-dark bg-white px-3 py-1.5 font-medium text-charcoal transition-colors hover:border-forest hover:text-forest"
        >
          7 dní
        </button>
        <button
          type="button"
          onClick={() => setPreset(30)}
          className="rounded-full border border-cream-dark bg-white px-3 py-1.5 font-medium text-charcoal transition-colors hover:border-forest hover:text-forest"
        >
          30 dní
        </button>
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => {
            setDateFrom(e.target.value);
            resetPage();
          }}
          className="rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-charcoal outline-none focus:border-forest"
        />
        <span className="text-gray-soft">–</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => {
            setDateTo(e.target.value);
            resetPage();
          }}
          className="rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-charcoal outline-none focus:border-forest"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={clearDates}
            className="inline-flex items-center gap-1 text-gray-soft hover:text-charcoal"
          >
            <X className="size-4" /> Zrušit
          </button>
        )}
      </div>

      {/* Lišta hromadných akcí */}
      {someSelected && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-forest/30 bg-forest/5 px-4 py-2.5">
          <span className="text-sm font-semibold text-forest">
            {selectedInFilter.length} vybráno
          </span>
          <span className="text-xs text-gray-soft">
            (změna stavu odešle zákazníkovi e-mail)
          </span>
          <div className="mx-1 h-5 w-px bg-cream-dark" />
          {(
            [
              ["status:processing", "Zpracovává se", Cog],
              ["status:shipped", "Odeslané", Truck],
              ["status:delivered", "Doručené", PackageCheck],
              ["status:cancelled", "Storno", Ban],
              ["payment:paid", "Platba přijata", Banknote],
            ] as [string, string, typeof Cog][]
          ).map(([op, label, Icon]) => (
            <ToastForm
              key={op}
              action={bulkOrderAction}
              success="Objednávky aktualizovány"
              onSuccess={clearSelection}
            >
              <input type="hidden" name="op" value={op} />
              <input type="hidden" name="ids" value={selectedIds} />
              <button
                type="submit"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-3 py-1.5 text-sm font-medium text-charcoal transition-colors hover:border-forest hover:text-forest",
                  op === "status:cancelled" &&
                    "hover:border-error hover:text-error",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            </ToastForm>
          ))}
          <div className="mx-1 h-5 w-px bg-cream-dark" />
          <BulkShipmentButton ids={selectedIds} onDone={clearSelection} />
          <a
            href={`/api/admin/orders/labels?ids=${encodeURIComponent(selectedIds)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-3 py-1.5 text-sm font-medium text-charcoal transition-colors hover:border-forest hover:text-forest"
          >
            <Printer className="size-4" /> Tisk štítků
          </a>
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
              <Th col="number">Číslo</Th>
              <Th col="date">Datum</Th>
              <th className="px-4 py-3">E-mail</th>
              <Th col="items">Ks</Th>
              <Th col="total">Částka</Th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Platba</th>
              <th className="px-4 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((o) => (
              <tr
                key={o.id}
                className={cn(
                  "border-b border-cream last:border-0",
                  selected.has(o.id) && "bg-forest/5",
                )}
              >
                <td className="px-4 py-3">
                  <TriCheckbox
                    checked={selected.has(o.id)}
                    onChange={() => toggleRow(o.id)}
                    title="Vybrat"
                  />
                </td>
                <td className="px-4 py-3 font-mono">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-forest hover:underline"
                  >
                    {o.number}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-charcoal">
                  {dateFmt.format(new Date(o.createdAt))}
                </td>
                <td className="max-w-[16rem] truncate px-4 py-3 text-charcoal">
                  {o.email}
                </td>
                <td className="px-4 py-3 font-mono text-charcoal">{o.itemCount}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-ink">
                  {money(o.total, o.currency)}
                </td>
                <td className="px-4 py-3">
                  <InlineSelect
                    value={o.status}
                    options={STATUS}
                    colorOf={statusColor}
                    onCommit={(v) => setOrderStatusAction(o.id, v)}
                    title="Změnit stav"
                  />
                </td>
                <td className="px-4 py-3">
                  <InlineSelect
                    value={o.payment}
                    options={PAYMENT}
                    colorOf={paymentColor}
                    onCommit={(v) => setOrderPaymentAction(o.id, v)}
                    title="Změnit platbu"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      title="Detail objednávky"
                      className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-soft">
                  Žádné objednávky neodpovídají filtru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-soft">
          {filtered.length > 0
            ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                safePage * PAGE_SIZE,
                filtered.length,
              )} z ${filtered.length}`
            : "0"}{" "}
          objednávek
          {filtered.length !== orders.length && ` (celkem ${orders.length})`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-sm text-charcoal transition-colors enabled:hover:border-forest enabled:hover:text-forest disabled:opacity-40"
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
              className="inline-flex items-center rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-sm text-charcoal transition-colors enabled:hover:border-forest enabled:hover:text-forest disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
