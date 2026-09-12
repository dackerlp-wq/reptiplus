"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Loader2, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { addToCartAction } from "@/lib/cart/actions";

/** Po přidání se tlačítko na pár sekund změní na odkaz do košíku. */
const GO_TO_CART_MS = 5000;

export function AddToCartButton({
  productId,
  label,
  goToCartLabel,
  disabled,
}: {
  productId: string;
  label: string;
  goToCartLabel: string;
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const base =
    "mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors";

  if (added) {
    return (
      <Link href="/kosik" className={cn(base, "bg-forest-deep text-white hover:bg-forest animate-reveal")}>
        {goToCartLabel} <ArrowRight className="size-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const res = await addToCartAction(productId);
          if (res.ok) {
            setAdded(true);
            timer.current = setTimeout(() => setAdded(false), GO_TO_CART_MS);
          }
        })
      }
      className={cn(base, "bg-forest text-white hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-40")}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <ShoppingCart className="size-4" /> {label}
        </>
      )}
    </button>
  );
}
