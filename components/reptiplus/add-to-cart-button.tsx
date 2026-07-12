"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

// MVP stub — skutečné napojení na košík (cart/cart_item přes service client)
// přijde v kroku "košík". Zatím lokální feedback.
export function AddToCartButton({
  label,
  addedLabel,
  disabled,
}: {
  label: string;
  addedLabel: string;
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className={cn(
        "mt-2 flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {added ? (
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
