import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isInquiryStatus, STATUS_META } from "@/lib/ledx/inquiry-status";

export const dynamic = "force-dynamic";

/** Export poptávek LEDX do CSV (respektuje filtry ze seznamu). Jen admin/staff. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("customer")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "";
  const rada = sp.get("rada") ?? "";
  const locale = sp.get("locale") ?? "";
  const q = (sp.get("q") ?? "").trim();

  let query = createServiceClient()
    .from("ledx_inquiry")
    .select("*")
    .order("created_at", { ascending: false });
  if (isInquiryStatus(status)) query = query.eq("status", status);
  else if (status === "open") query = query.in("status", ["new", "in_progress", "quoted"]);
  if (rada) query = query.eq("rada", rada);
  if (locale) query = query.eq("locale", locale);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, " ")}%`;
    query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cols = [
    "Vytvořeno",
    "Stav",
    "Jméno",
    "E-mail",
    "Telefon",
    "Jazyk",
    "Řada",
    "Model",
    "Barva světla",
    "Úhel",
    "Počet",
    "Stmívání",
    "Poznámka",
    "Nabídka",
    "Měna",
    "Platnost nabídky",
    "Číslo nabídky",
    "Další kontakt",
    "ID",
  ];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = (data ?? []).map((r) =>
    [
      new Date(r.created_at).toLocaleString("cs-CZ"),
      isInquiryStatus(r.status) ? STATUS_META[r.status].label : r.status,
      r.name,
      r.email,
      r.phone,
      r.locale.toUpperCase(),
      r.rada,
      r.model,
      r.cct,
      r.uhel,
      r.pocet,
      r.stmivani,
      r.poznamka,
      r.quote_amount === null ? "" : (r.quote_amount / 100).toFixed(2).replace(".", ","),
      r.quote_currency,
      r.quote_valid_until,
      r.quote_number,
      r.follow_up_at,
      r.id,
    ]
      .map(cell)
      .join(";"),
  );
  // BOM kvůli Excelu (UTF-8), středník jako oddělovač (české locale).
  const csv = "﻿" + [cols.join(";"), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="poptavky-ledx-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
