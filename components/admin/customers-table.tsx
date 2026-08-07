"use client";

import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Shield } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  orders: number;
  spent: number; // CZK minor units (zaplacené objednávky)
};

type SortKey = "name" | "orders" | "spent" | "created";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short" });

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "name" ? "asc" : "desc");
    }
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = customers.filter(
      (c) =>
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle) ||
        c.phone.toLowerCase().includes(needle),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "cs") * dir;
        case "orders":
          return (a.orders - b.orders) * dir;
        case "spent":
          return (a.spent - b.spent) * dir;
        case "created":
          return (
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
            dir
          );
      }
    });
    return list;
  }, [customers, q, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? (
      <ArrowUpDown className="size-3.5 opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    );
  const Th = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <th className="px-4 py-3">
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

  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hledat jméno, e-mail nebo telefon…"
          className="w-full rounded-lg border border-cream-dark bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-forest"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
            <tr>
              <Th col="name">Jméno</Th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Telefon</th>
              <Th col="orders">Objednávky</Th>
              <Th col="spent">Útrata</Th>
              <Th col="created">Registrace</Th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-cream last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="font-medium text-forest hover:underline"
                  >
                    {c.name || "—"}
                  </Link>
                </td>
                <td className="max-w-[16rem] truncate px-4 py-3 text-charcoal">
                  {c.email}
                </td>
                <td className="px-4 py-3 text-charcoal">{c.phone || "—"}</td>
                <td className="px-4 py-3 font-mono text-charcoal">{c.orders}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-ink">
                  {formatPrice(c.spent, "cs")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-charcoal">
                  {dateFmt.format(new Date(c.createdAt))}
                </td>
                <td className="px-4 py-3">
                  {c.role !== "customer" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest">
                      <Shield className="size-3" /> {c.role}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-soft">
                  Žádní zákazníci neodpovídají hledání.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-soft">
        {rows.length} z {customers.length} zákazníků
      </p>
    </div>
  );
}
