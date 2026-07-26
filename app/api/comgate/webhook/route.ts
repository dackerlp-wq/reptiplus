import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getComgateConfig, getComgateStatus } from "@/lib/comgate/client";

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
    await svc
      .from("order")
      .update(patch as never)
      .eq("number", refId)
      .eq("comgate_ref", transId);
  }

  return ack();
}
