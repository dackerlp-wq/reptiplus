import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logOrderEvent } from "@/lib/orders/events";
import { sendOrderStatusEmail } from "@/lib/orders/notify";

/** Po kolika hodinách bez platby se karetní objednávka zruší a sklad vrátí. */
const UNPAID_HOURS = 24;

/**
 * Denní úklid: objednávky placené online (Comgate), které zákazník do 24 h
 * nezaplatil, zrušit, vrátit zboží na sklad a poslat e-mail. Vercel Cron
 * (viz vercel.json), chráněno CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const { data: onlineMethods } = await svc.from("payment_method").select("code").eq("provider", "comgate");
  const codes = (onlineMethods ?? []).map((m) => m.code);
  if (codes.length === 0) return NextResponse.json({ cancelled: 0 });

  const cutoff = new Date(Date.now() - UNPAID_HOURS * 3600_000).toISOString();
  const { data: orders, error } = await svc
    .from("order")
    .select("id, number, email, currency, locale, tracking_number, tracking_url, shipping_method")
    .eq("status", "new")
    .in("payment_status", ["pending", "failed"])
    .in("payment_method", codes)
    .lt("created_at", cutoff)
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let cancelled = 0;
  for (const o of orders ?? []) {
    const { data: done, error: rpcErr } = await svc.rpc("cancel_unpaid_order", { p_order_id: o.id });
    if (rpcErr) {
      console.error("[cron] zrušení objednávky selhalo:", o.number, rpcErr.message);
      continue;
    }
    if (!done) continue;
    cancelled++;
    await logOrderEvent(o.id, "status", `Automaticky stornováno: platba kartou nedorazila do ${UNPAID_HOURS} h, zboží vráceno na sklad.`, {
      from: "new",
      to: "cancelled",
      source: "cron-unpaid",
    });
    await sendOrderStatusEmail(o, "cancelled");
  }
  return NextResponse.json({ cancelled, checked: orders?.length ?? 0 });
}
