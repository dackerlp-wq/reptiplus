import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { VatBreakdownRow } from "@/lib/invoices/calc";

export const dynamic = "force-dynamic";

/** Export dokladů do CSV pro účetní (období podle filtru seznamu). Jen admin/staff. */
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
  const year = Number(sp.get("year")) || new Date().getFullYear();
  const month = Number(sp.get("month")) || 0;
  const type = sp.get("type") ?? "";
  const from = month ? `${year}-${String(month).padStart(2, "0")}-01` : `${year}-01-01`;
  const to = (month ? new Date(year, month, 1) : new Date(year + 1, 0, 1)).toISOString().slice(0, 10);

  let query = createServiceClient()
    .from("invoice")
    .select("*, order:order_id(number, email)")
    .gte("issued_at", from)
    .lt("issued_at", to)
    .order("issued_at", { ascending: true })
    .order("number", { ascending: true });
  if (type === "invoice" || type === "credit_note") query = query.eq("type", type);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dec = (m: number | null) => (m === null ? "" : (m / 100).toFixed(2).replace(".", ","));
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols = [
    "Číslo", "Typ", "Vystaveno", "DUZP", "Splatnost", "Uhrazeno", "Odběratel", "Firma", "IČO", "DIČ",
    "Objednávka", "E-mail", "Měna", "Základ 21", "DPH 21", "Základ 12", "DPH 12", "Základ 0",
    "Základ celkem", "DPH celkem", "Celkem", "Kurz CZK/EUR", "DPH v CZK", "VS", "Způsob platby", "K faktuře",
  ];
  const byId = new Map((data ?? []).map((r) => [r.id, r.number]));
  const lines = (data ?? []).map((r) => {
    const b = (r.buyer as { name?: string; company?: string; ico?: string; dic?: string }) ?? {};
    const br = ((r.vat_breakdown as unknown as VatBreakdownRow[]) ?? []).reduce(
      (acc, x) => ({ ...acc, [x.rate]: x }),
      {} as Record<number, VatBreakdownRow>,
    );
    const sign = r.type === "credit_note" ? -1 : 1;
    const order = r.order as { number: string; email: string } | null;
    return [
      r.number,
      r.type === "credit_note" ? "Dobropis" : "Faktura",
      r.issued_at, r.taxable_date, r.due_date, r.paid_at,
      b.name, b.company, b.ico, b.dic,
      order?.number, order?.email, r.currency,
      dec(sign * (br[21]?.base ?? 0)), dec(sign * (br[21]?.vat ?? 0)),
      dec(sign * (br[12]?.base ?? 0)), dec(sign * (br[12]?.vat ?? 0)),
      dec(sign * (br[0]?.base ?? 0)),
      dec(sign * r.subtotal), dec(sign * r.vat_total), dec(sign * r.total),
      r.exchange_rate === null ? "" : String(r.exchange_rate).replace(".", ","),
      r.vat_total_czk === null ? "" : dec(sign * r.vat_total_czk),
      r.variable_symbol, r.payment_method,
      r.related_invoice_id ? byId.get(r.related_invoice_id) ?? "" : "",
    ].map(cell).join(";");
  });
  const csv = "﻿" + [cols.join(";"), ...lines].join("\r\n");
  const name = month ? `faktury-${year}-${String(month).padStart(2, "0")}.csv` : `faktury-${year}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
