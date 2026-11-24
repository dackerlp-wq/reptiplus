import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Uložená krabice pro rychlé balení (app_setting `shipping.boxes`). */
export type PackBox = { name: string; lengthCm: number; widthCm: number; heightCm: number; weightKg: number };

export async function getBoxes(): Promise<PackBox[]> {
  const { data } = await createServiceClient().from("app_setting").select("value").eq("key", "shipping.boxes").maybeSingle();
  const raw = ((data?.value as { boxes?: unknown[] } | null)?.boxes ?? []) as Record<string, unknown>[];
  return raw
    .map((b) => ({
      name: String(b.name ?? "").trim(),
      lengthCm: Number(b.lengthCm) || 0,
      widthCm: Number(b.widthCm) || 0,
      heightCm: Number(b.heightCm) || 0,
      weightKg: Number(b.weightKg) || 0,
    }))
    .filter((b) => b.name && b.lengthCm > 0 && b.widthCm > 0 && b.heightCm > 0);
}
