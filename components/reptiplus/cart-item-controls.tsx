"use client";

import { useTransition } from "react";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { updateQtyAction, removeItemAction } from "@/lib/cart/actions";

export function CartItemControls({
  itemId,
  qty,
  stock,
  removeLabel,
}: {
  itemId: string;
  qty: number;
  stock: number;
  removeLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  const setQty = (next: number) =>
    startTransition(async () => {
      await updateQtyAction(itemId, next);
    });
  const remove = () =>
    startTransition(async () => {
      await removeItemAction(itemId);
    });

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-lg border border-cream-dark bg-white">
        <button
          type="button"
          aria-label="−"
          disabled={pending || qty <= 1}
          onClick={() => setQty(qty - 1)}
          className="flex size-9 items-center justify-center text-charcoal transition-colors hover:text-forest disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-8 text-center text-sm font-medium tabular-nums text-ink">
          {pending ? <Loader2 className="mx-auto size-4 animate-spin" /> : qty}
        </span>
        <button
          type="button"
          aria-label="+"
          disabled={pending || qty >= stock}
          onClick={() => setQty(qty + 1)}
          className="flex size-9 items-center justify-center text-charcoal transition-colors hover:text-forest disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        disabled={pending}
        onClick={remove}
        className="rounded-md p-2 text-gray-soft transition-colors hover:bg-white hover:text-error disabled:opacity-40"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
