"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { assertAdminUser } from "@/lib/admin/auth";
import { EcomailError, getEcomailConfig, listLists } from "@/lib/ecomail/client";
import { bulkSyncToEcomail } from "@/lib/ecomail/sync";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v ? String(v).trim() : "";
};
function flashRedirect(path: string, flash: "saved" | "error", msg?: string): never {
  const p = new URLSearchParams({ flash, t: Date.now().toString() });
  if (msg) p.set("msg", msg);
  redirect(`${path}?${p.toString()}`);
}

/** Uložení nastavení Ecomailu (klíč, seznam, přepínače); webhook token vznikne při prvním uložení. */
export async function saveEcomailAction(fd: FormData): Promise<void> {
  await assertAdminUser();
  const prev = await getEcomailConfig();
  const listRaw = str(fd, "listId");
  const value = {
    apiKey: str(fd, "apiKey"),
    listId: /^\d+$/.test(listRaw) ? parseInt(listRaw, 10) : null,
    shopName: str(fd, "shopName") || "Reptiplus",
    syncCustomers: fd.get("syncCustomers") === "on",
    sendTransactions: fd.get("sendTransactions") === "on",
    webhookToken: prev.webhookToken || randomBytes(18).toString("hex"),
  };
  const { error } = await createServiceClient()
    .from("app_setting")
    .upsert({ key: "integrations.ecomail", value: value as never }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Ověří klíč: vypíše seznamy v účtu a zda zadané ID mezi nimi je. */
export async function testEcomailAction(fd: FormData): Promise<void> {
  await assertAdminUser();
  const locale = str(fd, "locale") || "cs";
  const back = `/${locale}/admin/settings`;
  const c = await getEcomailConfig();
  if (!c.apiKey) flashRedirect(back, "error", "Nejdřív uložte API klíč Ecomailu.");
  try {
    const lists = await listLists(c.apiKey);
    const names = lists.map((l) => `${l.name} (ID ${l.id})`).join(", ") || "žádné seznamy";
    const found = c.listId != null && lists.some((l) => l.id === c.listId);
    flashRedirect(
      back,
      found ? "saved" : "error",
      found ? `Spojení funguje. Seznamy: ${names}` : `Spojení funguje, ale seznam ID ${c.listId ?? "—"} v účtu není. Dostupné: ${names}`,
    );
  } catch (e) {
    const msg = e instanceof EcomailError ? `Ecomail odpověděl ${e.status}: ${e.message}` : e instanceof Error ? e.message : "Spojení selhalo.";
    flashRedirect(back, "error", msg);
  }
}

/** Hromadná synchronizace odběratelů (a zákazníků) do Ecomailu z admin Newsletteru. */
export async function syncEcomailAction(fd: FormData): Promise<void> {
  await assertAdminUser();
  const locale = str(fd, "locale") || "cs";
  const back = `/${locale}/admin/newsletter`;
  const res = await bulkSyncToEcomail();
  if (!res.ok) flashRedirect(back, "error", res.error);
  flashRedirect(
    back,
    "saved",
    `Ecomail: ${res.subscribed} odběratelů přidáno/aktualizováno, ${res.unsubscribed} odhlášeno${res.customers ? `, ${res.customers} zákazníků se štítkem „zakaznik“` : ""}.`,
  );
}
