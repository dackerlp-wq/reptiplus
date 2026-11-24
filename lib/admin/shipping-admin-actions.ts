"use server";

import { revalidatePath } from "next/cache";
import { assertAdminUser } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { SHIP_COUNTRIES } from "@/lib/shipping/price";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** Částka z formuláře („99" / „4,10") → minor units; prázdné → null. */
const money = (fd: FormData, k: string): number | null => {
  const raw = str(fd, k).replace(",", ".");
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const decimal = (v: string): number | null => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Uložení způsobu dopravy z mřížky „země × cena" (Admin → Doprava).
 * Řádek CZ = základní cena (platí i pro země bez vlastní ceny), ostatní řádky → country_prices.
 * Zaškrtnuté „nabízet" → countries (všechny = null = všude).
 */
export async function saveShippingMethodGridAction(fd: FormData) {
  await assertAdminUser();
  const id = str(fd, "id") || null;
  const code = str(fd, "code");
  if (!code) throw new Error("Vyplň kód dopravy.");

  const offered = SHIP_COUNTRIES.filter((c) => fd.get(`offer_${c}`) === "on");
  const countryPrices: Record<string, Record<string, number>> = {};
  for (const c of SHIP_COUNTRIES) {
    if (c === "CZ") continue;
    const cp: Record<string, number> = {};
    for (const k of ["price_czk", "price_eur", "heavy_price_czk", "heavy_price_eur"] as const) {
      const v = money(fd, `p_${c}_${k}`);
      if (v != null) cp[k] = v;
    }
    if (Object.keys(cp).length > 0) countryPrices[c] = cp;
  }

  const payload = {
    code,
    name_i18n: { cs: str(fd, "name_cs"), en: str(fd, "name_en"), de: str(fd, "name_de") },
    carrier: (str(fd, "carrier") || "other") as never,
    is_active: fd.get("is_active") === "on",
    pickup_point: fd.get("pickup_point") === "on",
    sort_order: parseInt(str(fd, "sort_order") || "0", 10) || 0,
    price_czk: money(fd, "p_CZ_price_czk") ?? 0,
    price_eur: money(fd, "p_CZ_price_eur"),
    heavy_from_kg: decimal(str(fd, "heavy_from_kg")),
    heavy_price_czk: money(fd, "p_CZ_heavy_price_czk"),
    heavy_price_eur: money(fd, "p_CZ_heavy_price_eur"),
    country_prices: countryPrices,
    countries: offered.length === 0 || offered.length === SHIP_COUNTRIES.length ? null : offered,
  };
  if (offered.length === 0) throw new Error("Zaškrtni aspoň jednu zemi, kam se doprava nabízí.");

  const svc = createServiceClient();
  const { error } = id
    ? await svc.from("shipping_method").update(payload).eq("id", id)
    : await svc.from("shipping_method").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Krabice pro balení (app_setting `shipping.boxes`) — řádky formuláře box_name[], box_l[], … */
export async function saveBoxesAction(fd: FormData) {
  await assertAdminUser();
  const names = fd.getAll("box_name").map((v) => String(v).trim());
  const col = (k: string) => fd.getAll(k).map((v) => decimal(String(v)) ?? 0);
  const [l, w, h, kg] = [col("box_l"), col("box_w"), col("box_h"), col("box_kg")];
  const boxes = names
    .map((name, i) => ({ name, lengthCm: l[i], widthCm: w[i], heightCm: h[i], weightKg: kg[i] }))
    .filter((b) => b.name && b.lengthCm > 0 && b.widthCm > 0 && b.heightCm > 0);
  const { error } = await createServiceClient()
    .from("app_setting")
    .upsert({ key: "shipping.boxes", value: { boxes } as never }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
