import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type ShopContact = { name: string; email: string; phone: string };

/** Obecné nastavení obchodu (název, e-mail, telefon) z app_setting. */
export async function getShopContact(): Promise<ShopContact> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("app_setting")
    .select("value")
    .eq("key", "shop.general")
    .maybeSingle();
  const v = (data?.value ?? {}) as {
    name?: string;
    email?: string;
    phone?: string;
  };
  return {
    name: v.name ?? "Reptiplus",
    email: v.email ?? "info@reptiplus.cz",
    phone: v.phone ?? "",
  };
}
