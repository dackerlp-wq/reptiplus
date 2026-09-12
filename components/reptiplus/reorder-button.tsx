"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Loader2, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { reorderAction } from "@/lib/account/actions";

/** „Objednat znovu" — přidá položky objednávky do košíku. */
export function ReorderButton({ orderNumber }: { orderNumber: string }) {
  const t = useTranslations("Account");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  if (result) {
    return (
      <div className="rounded-lg border border-forest/30 bg-forest/5 px-4 py-3 text-sm">
        <p className="font-semibold text-forest">{t("reorderDone", { added: result.added })}</p>
        {result.skipped > 0 && <p className="text-xs text-gray-soft">{t("reorderSkipped", { count: result.skipped })}</p>}
        <Link href="/kosik" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light">
          <ShoppingCart className="size-4" /> {t("goToCart")}
        </Link>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await reorderAction(orderNumber);
          if ("error" in res) return;
          setResult(res);
        })
      }
      className="inline-flex items-center gap-2 rounded-lg border border-forest px-4 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} {t("reorder")}
    </button>
  );
}
