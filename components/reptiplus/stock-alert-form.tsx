"use client";

import { useActionState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { subscribeStockAlertAction, type StockAlertState } from "@/lib/account/actions";

/** „Dejte mi vědět, až bude skladem" — u vyprodaného produktu / varianty. */
export function StockAlertForm({
  productId,
  variantId,
  defaultEmail,
}: {
  productId: string;
  variantId: string | null;
  defaultEmail?: string;
}) {
  const t = useTranslations("Product");
  const locale = useLocale();
  const [state, action, pending] = useActionState<StockAlertState, FormData>(subscribeStockAlertAction, { status: "idle" });

  if (state.status === "ok") {
    return (
      <p className="mt-4 flex max-w-xs items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success">
        <Check className="mt-0.5 size-4 shrink-0" /> {t("notifyDone")}
      </p>
    );
  }

  return (
    <form action={action} className="mt-4 max-w-xs space-y-2">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="variant_id" value={variantId ?? ""} />
      <input type="hidden" name="locale" value={locale} />
      <div className="hidden" aria-hidden="true">
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <BellRing className="size-4 text-forest" /> {t("notifyMe")}
      </p>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail ?? ""}
          placeholder={t("notifyEmail")}
          className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-ink outline-none focus:border-forest"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg border border-forest px-3 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : t("notifySubmit")}
        </button>
      </div>
      {state.status === "error" && <p className="text-xs text-error">{t("notifyError")}</p>}
    </form>
  );
}
