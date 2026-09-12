import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getComgateConfig, getComgateStatus } from "@/lib/comgate/client";
import { markOrderPaid } from "@/lib/orders/payment";
import { logOrderEvent } from "@/lib/orders/events";

// Webhook musí být vždy dynamický (příchozí POST od Comgate).
export const dynamic = "force-dynamic";

/** Comgate očekává HTTP 200 + tělo `code=0`, jinak notifikaci opakuje (až 1000×). */
function ack() {
  return new Response("code=0&message=OK", {
    status: 200,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/**
 * PUSH notifikace o změně stavu platby (Comgate v1.0).
 * URL je potřeba nastavit v Comgate portálu: Integrace → napojení eshopu →
 * URL pro notifikace = https://<doména>/api/comgate/webhook
 */
export async function POST(req: NextRequest) {
  const cfg = await getComgateConfig();
  const params = new URLSearchParams(await req.text());

  const merchant = params.get("merchant");
  const secret = params.get("secret");
  const transId = params.get("transId");
  const refId = params.get("refId");
  let status = params.get("status");

  // Ověření pravosti notifikace (merchant + secret musí sedět).
  if (!cfg || merchant !== cfg.merchant || secret !== cfg.secret) {
    return new Response("code=1&message=unauthorized", { status: 403 });
  }
  if (!transId || !refId) return ack();

  // Doporučeno: ověřit skutečný stav přímo přes /status (proti podvržení).
  const verified = await getComgateStatus(transId);
  if (verified) status = verified;

  const patch: { payment_status?: string; status?: string } = {};
  if (status === "PAID") {
    patch.payment_status = "paid";
    patch.status = "paid";
  } else if (status === "CANCELLED") {
    patch.payment_status = "failed";
  }
  // PENDING / AUTHORIZED → stav neměníme, čekáme na finální notifikaci.

  if (patch.payment_status) {
    const svc = createServiceClient();
    // Ztotožnění přes číslo objednávky (refId) i transId pro jistotu.
    const { data: order } = await svc
      .from("order")
      .select("id, payment_status")
      .eq("number", refId)
      .eq("comgate_ref", transId)
      .maybeSingle();
    if (order) {
      if (status === "PAID") {
        // Označí zaplaceno, vystaví fakturu a pošle e-mail „platba přijata".
        await markOrderPaid(order.id, { source: "comgate" });
      } else if (order.payment_status !== "paid") {
        await svc.from("order").update({ payment_status: "failed" }).eq("id", order.id);
        await logOrderEvent(order.id, "payment", null, { status: "failed", source: "comgate", trans_id: transId });
      }
    }
  }

  return ack();
}
