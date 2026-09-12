import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

export type OrderEventType =
  | "note"
  | "status"
  | "payment"
  | "email"
  | "shipment"
  | "invoice"
  | "refund"
  | "system";

/** Zapíše událost do historie objednávky. Chyby jen loguje (historie nesmí shodit flow). */
export async function logOrderEvent(
  orderId: string,
  type: OrderEventType,
  body: string | null,
  meta: Record<string, Json | undefined> = {},
  author: string | null = null,
): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(meta).filter(([, v]) => v !== undefined),
  ) as Record<string, Json>;
  const { error } = await createServiceClient().from("order_event").insert({
    order_id: orderId,
    type,
    body,
    meta: clean,
    author_email: author,
  });
  if (error) console.error("[order] zápis události selhal:", error.message);
}
