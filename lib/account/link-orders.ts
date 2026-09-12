import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { User } from "@supabase/supabase-js";

/**
 * Připojí hostovské objednávky (bez účtu) se stejným e-mailem k účtu.
 * Jen pokud má účet ověřený e-mail — jinak by si kdokoli registrací na cizí
 * adresu zobrazil cizí objednávky. Idempotentní, chyby jen loguje.
 */
export async function linkGuestOrders(user: Pick<User, "id" | "email" | "email_confirmed_at">): Promise<number> {
  if (!user.email || !user.email_confirmed_at) return 0;
  const { data, error } = await createServiceClient()
    .from("order")
    .update({ customer_id: user.id })
    .is("customer_id", null)
    .ilike("email", user.email)
    .select("id");
  if (error) {
    console.error("[account] propojení objednávek selhalo:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
