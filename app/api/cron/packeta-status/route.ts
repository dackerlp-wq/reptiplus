import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import {
  packetaShippingCodes,
  syncPacketaOrder,
  SYNC_ORDER_COLUMNS,
} from "@/lib/shipping/packeta-sync";

/** Zásilky starší než tolik dní už nehlídat (zaseknuté / ručně vyřízené). */
const MAX_AGE_DAYS = 30;

/**
 * Denní kontrola zásilek Zásilkovny: objednávky ve stavu „odesláno" se zásilkou
 * dostanou aktuální stav, doručené se přepnou na „doručeno" (+ e-mail zákazníkovi),
 * vrácené / zrušené / odmítnuté se nahlásí e-mailem obchodu. Chráněno CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const codes = await packetaShippingCodes();
  if (codes.length === 0) return NextResponse.json({ checked: 0 });

  const since = new Date(Date.now() - MAX_AGE_DAYS * 86400_000).toISOString();
  const { data: orders, error } = await createServiceClient()
    .from("order")
    .select(SYNC_ORDER_COLUMNS)
    .eq("status", "shipped")
    .in("shipping_method", codes)
    .not("carrier_shipment_id", "is", null)
    .gte("created_at", since)
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = { checked: 0, delivered: 0, updated: 0, problem: 0, error: 0 };
  const problems: string[] = [];
  for (const o of orders ?? []) {
    summary.checked++;
    const r = await syncPacketaOrder(o as never);
    if (r === "delivered") summary.delivered++;
    else if (r === "updated") summary.updated++;
    else if (r === "error") summary.error++;
    else if (r === "problem") {
      summary.problem++;
      problems.push(o.number);
    }
  }

  const notify = process.env.SHOP_NOTIFY_EMAIL;
  if (problems.length > 0 && notify) {
    await sendMail({
      to: notify,
      subject: `Zásilkovna: problém se zásilkou (${problems.length})`,
      text: `Tyto objednávky mají zásilku vrácenou, zrušenou nebo odmítnutou příjemcem:\n\n${problems.join("\n")}\n\nDetail najdeš v administraci u objednávky.`,
      html: `<p>Tyto objednávky mají zásilku vrácenou, zrušenou nebo odmítnutou příjemcem:</p><ul>${problems
        .map((n) => `<li>${n}</li>`)
        .join("")}</ul><p>Detail najdeš v administraci u objednávky.</p>`,
    }).catch((e) => console.error("[packeta] e-mail obchodu:", e));
  }

  return NextResponse.json(summary);
}
