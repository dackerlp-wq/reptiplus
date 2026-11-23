import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createComgatePayment, getComgatePayment, type ComgateVariant } from "@/lib/comgate/client";
import { markOrderPaid } from "@/lib/orders/payment";
import { logOrderEvent } from "@/lib/orders/events";

/**
 * Napojení objednávek na Comgate: založení platby (pokladna i „Zaplatit znovu")
 * a zpracování stavu platby (webhook i návrat zákazníka z brány).
 */

export type StartPaymentInput = {
  orderId: string;
  number: string;
  /** Částka v minor units. */
  total: number;
  currency: string;
  email: string;
  fullName?: string;
  locale: string;
  /** Absolutní URL webu (doména, kde zákazník nakupuje). */
  siteUrl: string;
  /** Předvybraná metoda na bráně (Apple Pay, Google Pay, karta…), výchozí ALL. */
  method?: ComgateVariant;
};

/**
 * Založí platbu v Comgate, uloží transId do objednávky a vrátí URL brány.
 * Při chybě vrací null (nikdy nevyhazuje) — volající přesměruje na stránku
 * objednávky s `?platba=chyba`.
 */
export async function startComgatePayment(input: StartPaymentInput): Promise<string | null> {
  const back = `${input.siteUrl}/${input.locale}/objednavka/${input.number}`;
  try {
    const pay = await createComgatePayment({
      price: input.total,
      curr: input.currency,
      refId: input.number,
      label: input.number,
      email: input.email,
      fullName: input.fullName,
      lang: input.locale,
      method: input.method ?? "ALL",
      urlPaid: `${back}?platba=uspech`,
      urlPending: `${back}?platba=probiha`,
      urlCancelled: `${back}?platba=zruseno`,
    });
    const svc = createServiceClient();
    // Nový pokus o platbu → stav platby zpět na „čeká" (po zrušeném pokusu byl „failed").
    await svc
      .from("order")
      .update({ comgate_ref: pay.transId, payment_status: "pending" })
      .eq("id", input.orderId)
      .neq("payment_status", "paid");
    await logOrderEvent(input.orderId, "payment", null, {
      status: "created",
      source: "comgate",
      trans_id: pay.transId,
      method: input.method ?? "ALL",
    });
    return pay.redirect;
  } catch (e) {
    console.error("[comgate] založení platby selhalo:", input.number, e);
    await logOrderEvent(input.orderId, "payment", "Nepodařilo se založit platbu v Comgate.", {
      status: "error",
      source: "comgate",
      error: e instanceof Error ? e.message.slice(0, 300) : String(e),
    });
    return null;
  }
}

/** `unverified` = Comgate /status neodpověděl (síť, konfigurace) → má smysl zkusit znovu. */
export type ComgateSyncResult = "paid" | "failed" | "pending" | "unverified" | null;

/**
 * Ověří stav transakce přímo u Comgate (/status) a promítne ho do objednávky.
 * Objednávka se páruje podle refId (= číslo objednávky) z odpovědi Comgate,
 * ne podle dat z requestu. Idempotentní, nikdy nevyhazuje.
 *
 * - PAID → `markOrderPaid` (i u staršího pokusu o platbu — peníze přišly),
 *   `comgate_ref` se přepíše na zaplacenou transakci, aby šla refundovat.
 * - CANCELLED → „failed", jen pokud jde o aktuální pokus a objednávka není zaplacená.
 * - PENDING / AUTHORIZED → beze změny.
 */
export async function syncComgateTransaction(transId: string): Promise<ComgateSyncResult> {
  const pay = await getComgatePayment(transId);
  if (!pay) return "unverified";
  if (!pay.refId) return null;

  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select("id, number, total, currency, payment_status, comgate_ref")
    .eq("number", pay.refId)
    .maybeSingle();
  if (!order) return null;

  if (pay.status === "PAID") {
    if (order.payment_status === "paid") return "paid";
    // Kontrola částky a měny — nesedí-li, nic automaticky neměnit, jen zapsat do historie.
    if (pay.curr !== order.currency || pay.price < (order.total ?? 0)) {
      await logOrderEvent(
        order.id,
        "payment",
        `Comgate hlásí zaplacenou platbu ${transId}, ale částka/měna nesedí (${pay.price} ${pay.curr}). Zkontroluj ručně.`,
        { status: "mismatch", source: "comgate", trans_id: transId },
      );
      return null;
    }
    if (order.comgate_ref !== transId) {
      await svc.from("order").update({ comgate_ref: transId }).eq("id", order.id);
    }
    await markOrderPaid(order.id, { source: "comgate" });
    return "paid";
  }

  if (pay.status === "CANCELLED") {
    if (order.payment_status === "paid") return "paid";
    if (order.comgate_ref === transId && order.payment_status !== "failed") {
      await svc.from("order").update({ payment_status: "failed" }).eq("id", order.id);
      await logOrderEvent(order.id, "payment", null, { status: "failed", source: "comgate", trans_id: transId });
    }
    return "failed";
  }

  return "pending";
}
