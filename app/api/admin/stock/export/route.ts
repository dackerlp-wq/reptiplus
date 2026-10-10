import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStockMovements, getStockOverview } from "@/lib/admin/stock";
import { getStockSettings } from "@/lib/settings";
import { MOVEMENT_LABEL, STOCK_PERIODS, STOCK_STATUS_LABEL, isMovementType, isStockPeriodKey } from "@/lib/admin/stock-stats";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const dec = (minor: number | null) => (minor == null ? "" : (minor / 100).toFixed(2).replace(".", ","));
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");

/** Export přehledu skladu nebo deníku pohybů do CSV (jen admin/staff). `?kind=movements` pro pohyby. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("customer").select("role").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const today = new Date().toISOString().slice(0, 10);

  if (sp.get("kind") === "movements") {
    const type = sp.get("type") ?? "";
    const { rows } = await getStockMovements({
      type: isMovementType(type) ? type : "",
      q: sp.get("q") ?? "",
      from: sp.get("from") ?? "",
      to: sp.get("to") ?? "",
      page: 1,
      pageSize: 5000,
    });
    const body = csv([
      ["Datum", "Produkt", "SKU", "Varianta", "Typ", "Změna", "Stav po", "Objednávka", "Zdroj", "Kdo", "Poznámka"],
      ...rows.map((m) => [
        new Date(m.createdAt).toLocaleString("cs-CZ"),
        m.productName,
        m.productSku,
        m.variantName,
        MOVEMENT_LABEL[m.type],
        m.delta,
        m.qtyAfter,
        m.orderNumber,
        m.source,
        m.author,
        m.note,
      ]),
    ]);
    return new NextResponse(body, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pohyby-skladu-${today}.csv"` },
    });
  }

  const periodRaw = sp.get("period") ?? "90";
  const period = isStockPeriodKey(periodRaw) ? periodRaw : "90";
  const days = STOCK_PERIODS[period].days;
  const settings = await getStockSettings();
  const { rows } = await getStockOverview(days, settings);
  const body = csv([
    ["Produkt", "SKU", "Kategorie", "Publikováno", "Skladem", `Prodáno za ${days} dní`, "Dní zásoby", "Poslední prodej", "Naskladněno", "Stav", "Cena Kč", "Nákupní cena Kč", "Hodnota zásoby Kč"],
    ...rows.map((r) => [
      r.name,
      r.sku,
      r.category,
      r.published ? "ano" : "ne",
      r.stock,
      r.sold,
      r.daysOfStock == null ? "" : Math.round(r.daysOfStock),
      r.lastSaleAt ? new Date(r.lastSaleAt).toLocaleDateString("cs-CZ") : "",
      r.lastInAt ? new Date(r.lastInAt).toLocaleDateString("cs-CZ") : "",
      STOCK_STATUS_LABEL[r.status],
      dec(r.priceCzk),
      dec(r.purchasePriceCzk),
      dec(r.valueCzk),
    ]),
  ]);
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sklad-${today}.csv"` },
  });
}
