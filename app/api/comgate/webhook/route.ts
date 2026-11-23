import type { NextRequest } from "next/server";
import { getComgateConfig } from "@/lib/comgate/client";
import { syncComgateTransaction } from "@/lib/orders/comgate";

// Webhook musí být vždy dynamický (příchozí POST od Comgate).
export const dynamic = "force-dynamic";

/** Comgate očekává HTTP 200 + tělo `code=0`, jinak notifikaci opakuje. */
function ack() {
  return new Response("code=0&message=OK", {
    status: 200,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/**
 * PUSH notifikace o změně stavu platby (Comgate v1.0).
 * URL je potřeba nastavit v Comgate portálu: Integrace → Nastavení obchodu →
 * URL pro předání výsledku platby = https://reptiplus.cz/api/comgate/webhook
 *
 * Stav z notifikace se nebere jako pravda — vždy se ověří přes /status
 * (`syncComgateTransaction`), objednávka se páruje podle refId z Comgate.
 */
export async function POST(req: NextRequest) {
  const cfg = await getComgateConfig();
  const params = new URLSearchParams(await req.text());

  const merchant = params.get("merchant");
  const secret = params.get("secret");
  const transId = params.get("transId");

  // Ověření pravosti notifikace (merchant + secret musí sedět).
  if (!cfg || merchant !== cfg.merchant || secret !== cfg.secret) {
    return new Response("code=1&message=unauthorized", { status: 403 });
  }
  if (!transId) return ack();

  const res = await syncComgateTransaction(transId);
  // Stav se nepodařilo ověřit → nepotvrzovat, Comgate notifikaci zopakuje.
  if (res === "unverified") {
    return new Response("code=1&message=status-unavailable", { status: 503 });
  }
  return ack();
}
