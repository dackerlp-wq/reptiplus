"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { formatPrice, discountPercent } from "@/lib/i18n";
import { addToCartAction } from "@/lib/cart/actions";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type BuyVariant = {
  id: string;
  name: string;
  price: number; // minor units, měna dle locale
  stock: number;
};

export function ProductBuyBox({
  productId,
  locale,
  basePrice,
  baseCompare,
  baseStock,
  variants,
  labels,
}: {
  productId: string;
  locale: Locale;
  basePrice: number;
  baseCompare: number | null;
  baseStock: number;
  variants: BuyVariant[];
  labels: {
    variant: string;
    addToCart: string;
    added: string;
    outOfStock: string;
  };
}) {
  const [selId, setSelId] = useState<string | null>(variants[0]?.id ?? null);
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();

  const sel = variants.find((v) => v.id === selId) ?? null;
  const price = sel ? sel.price : basePrice;
  const stock = sel ? sel.stock : baseStock;
  const off = discountPercent(price, baseCompare);
  const out = stock <= 0;

  const add = () =>
    start(async () => {
      const res = await addToCartAction(productId, 1, selId);
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }
    });

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "font-mono text-3xl font-semibold",
            off ? "text-error" : "text-forest",
          )}
        >
          {formatPrice(price, locale)}
        </span>
        {off && baseCompare !== null && (
          <>
            <span className="font-mono text-xl text-gray-soft line-through">
              {formatPrice(baseCompare, locale)}
            </span>
            <span className="rounded-md bg-error px-2 py-1 text-sm font-semibold text-white">
              −{off}%
            </span>
          </>
        )}
      </div>

      {variants.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-soft">
            {labels.variant}
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const vOut = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelId(v.id)}
                  disabled={vOut}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    selId === v.id
                      ? "border-forest bg-forest/5 text-forest"
                      : "border-cream-dark text-ink hover:border-forest/40",
                    vOut && "cursor-not-allowed opacity-40",
                  )}
                >
                  {v.name}
                  {vOut && ` · ${labels.outOfStock}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 max-w-xs">
        <button
          type="button"
          onClick={add}
          disabled={out || pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : added ? (
            <>
              <Check className="size-4" /> {labels.added}
            </>
          ) : (
            <>
              <ShoppingCart className="size-4" /> {out ? labels.outOfStock : labels.addToCart}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
