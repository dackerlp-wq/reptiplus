"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "@/lib/account/actions";

/* Jeden dotaz na stránku: sdílená cache ID oblíbených (mění se jen přes toggle).
   Klíčem je cesta stránky — po přihlášení (soft navigace, modul zůstává v paměti)
   se stav znovu načte; nepřihlášený stav se nikdy nedrží přes navigaci. */
type Wishlist = { ids: Set<string>; auth: boolean };
let cache: { key: string; data: Wishlist } | null = null;
let inflight: { key: string; promise: Promise<Wishlist> } | null = null;
const listeners = new Set<() => void>();

function loadWishlist(key: string): Promise<Wishlist> {
  if (cache && cache.key === key && cache.data.auth) return Promise.resolve(cache.data);
  if (inflight && inflight.key === key) return inflight.promise;
  const promise = fetch("/api/wishlist", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { ids: string[]; auth: boolean }) => ({ ids: new Set(d.ids), auth: d.auth }))
    .catch((): Wishlist => ({ ids: new Set(), auth: false }))
    .then((data) => {
      if (inflight?.key === key) inflight = null;
      cache = { key, data };
      return data;
    });
  inflight = { key, promise };
  return promise;
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
      if (alive && cache) setWished(cache.data.ids.has(productId));
    };
    loadWishlist(pathname).then(sync);
    listeners.add(sync);
    return () => {
      alive = false;
      listeners.delete(sync);
    };
  }, [productId, pathname]);

  const toggle = () =>
    start(async () => {
      // O přihlášení rozhoduje vždy server (cookie), ne cache v prohlížeči —
      // ta by po přihlášení a návratu zpět mohla být zastaralá.
      const res = await toggleWishlistAction(productId);
      if ("error" in res) {
        if (res.error === "AUTH") {
          cache = null;
          router.push(`/prihlaseni?redirectTo=${encodeURIComponent(`/${locale}${pathname}`)}`);
        }
        return;
      }
      if (cache) {
        if (res.wished) cache.data.ids.add(productId);
        else cache.data.ids.delete(productId);
        cache.data.auth = true;
      } else {
        cache = { key: pathname, data: { ids: new Set(res.wished ? [productId] : []), auth: true } };
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
