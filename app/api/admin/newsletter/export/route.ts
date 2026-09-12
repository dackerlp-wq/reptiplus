import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/** Export odběratelů newsletteru do CSV (respektuje filtr stavu a hledání). Jen admin/staff. */
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
  const status = sp.get("status") ?? "confirmed";
  const q = (sp.get("q") ?? "").trim();

  let query = createServiceClient()
    .from("newsletter_subscriber")
    .select("email, locale, source, created_at, confirmed_at, unsubscribed_at")
    .order("created_at", { ascending: false });
  if (status === "confirmed") query = query.not("confirmed_at", "is", null).is("unsubscribed_at", null);
  else if (status === "pending") query = query.is("confirmed_at", null).is("unsubscribed_at", null);
  else if (status === "unsubscribed") query = query.not("unsubscribed_at", "is", null);
  if (q) query = query.ilike("email", `%${q.replace(/[%_,]/g, " ")}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols = ["E-mail", "Jazyk", "Stav", "Zdroj", "Přihlášen", "Potvrzen", "Odhlášen"];
  const lines = (data ?? []).map((r) =>
    [
      r.email,
      r.locale.toUpperCase(),
      r.unsubscribed_at ? "odhlášený" : r.confirmed_at ? "potvrzený" : "čeká",
      r.source,
      new Date(r.created_at).toLocaleString("cs-CZ"),
      r.confirmed_at ? new Date(r.confirmed_at).toLocaleString("cs-CZ") : "",
      r.unsubscribed_at ? new Date(r.unsubscribed_at).toLocaleString("cs-CZ") : "",
    ]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [cols.join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${status}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
