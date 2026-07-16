"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCartAction } from "@/lib/cart/actions";

export function AddToCartButton({
  productId,
  label,
  addedLabel,
  disabled,
}: {
  productId: string;
  label: string;
  addedLabel: string;
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const res = await addToCartAction(productId);
          if (res.ok) {
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }
        })
      }
      className={cn(
        "mt-2 flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : added ? (
        <>
          <Check className="size-4" /> {addedLabel}
        </>
      ) : (
        <>
          <ShoppingCart className="size-4" /> {label}
        </>
      )}
    </button>
  );
}
