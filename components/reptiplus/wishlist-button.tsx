"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "@/lib/account/actions";

/* Jeden dotaz na stránku: sdílená cache ID oblíbených (mění se jen přes toggle). */
let cache: { ids: Set<string>; auth: boolean } | null = null;
let inflight: Promise<{ ids: Set<string>; auth: boolean }> | null = null;
const listeners = new Set<() => void>();

function loadWishlist() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/wishlist", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ids: string[]; auth: boolean }) => {
        cache = { ids: new Set(d.ids), auth: d.auth };
        return cache;
      })
      .catch(() => {
        cache = { ids: new Set(), auth: false };
        return cache;
      });
  }
  return inflight;
}

function notify() {
  listeners.forEach((l) => l());
}

/** Srdíčko „do oblíbených" — na kartě (overlay) i v detailu produktu (s textem). */
export function WishlistButton({
  productId,
  variant = "icon",
  className,
}: {
  productId: string;
  variant?: "icon" | "text";
  className?: string;
}) {
  const t = useTranslations("Product");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [wished, setWished] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    const sync = () => {
      if (alive && cache) setWished(cache.ids.has(productId));
    };
    loadWishlist().then(sync);
    listeners.add(sync);
    return () => {
      alive = false;
      listeners.delete(sync);
    };
  }, [productId]);

  const toggle = () =>
    start(async () => {
      if (cache && !cache.auth) {
        router.push(`/prihlaseni?redirectTo=${encodeURIComponent(`/${locale}${pathname}`)}`);
        return;
      }
      const res = await toggleWishlistAction(productId);
      if ("error" in res) {
        if (res.error === "AUTH") router.push(`/prihlaseni?redirectTo=${encodeURIComponent(`/${locale}${pathname}`)}`);
        return;
      }
      if (cache) {
        if (res.wished) cache.ids.add(productId);
        else cache.ids.delete(productId);
        cache.auth = true;
      }
      setWished(res.wished);
      notify();
    });

  const label = wished ? t("wishlisted") : t("wishlist");
  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={wished}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
          wished ? "border-error/40 bg-error/5 text-error" : "border-cream-dark text-charcoal hover:border-forest hover:text-forest",
          className,
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Heart className={cn("size-4", wished && "fill-current")} />}
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={pending}
      aria-pressed={wished}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-white/90 shadow transition-colors",
        wished ? "text-error" : "text-gray-soft hover:text-error",
        className,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Heart className={cn("size-5", wished && "fill-current")} />}
    </button>
  );
}
