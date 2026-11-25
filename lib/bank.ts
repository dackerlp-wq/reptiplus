import type { ShopContact } from "@/lib/settings";

/** Bankovní spojení pro měnu platby: EUR → cizoměnový účet (je-li vyplněný), jinak korunový. */
export function bankFor(
  shop: Pick<ShopContact, "bankAccount" | "iban" | "bic" | "bankAccountEur" | "ibanEur" | "bicEur">,
  currency: string | null | undefined,
): { account: string; iban: string; bic: string } {
  if (currency === "EUR" && (shop.ibanEur || shop.bankAccountEur))
    return { account: shop.bankAccountEur, iban: shop.ibanEur, bic: shop.bicEur || shop.bic };
  return { account: shop.bankAccount, iban: shop.iban, bic: shop.bic };
}
