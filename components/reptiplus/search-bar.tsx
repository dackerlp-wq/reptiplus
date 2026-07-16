"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Loader2, Leaf } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Suggestion = {
  slug: string;
  name: string;
  imageUrl: string | null;
  priceLabel: string;
};

export function SearchBar({
  placeholder,
  className,
  locale,
}: {
  placeholder: string;
  className?: string;
  locale: Locale;
}) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  // Debounced fetch návrhů
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&locale=${locale}`,
          { signal: ctrl.signal },
        );
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        /* přerušený request — ignorovat */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, locale]);

  // Zavřít po kliknutí mimo
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goToProduct = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(`/produkt/${slug}`);
  };

  const submitSearch = () => {
    const query = q.trim();
    setOpen(false);
    router.push(query ? { pathname: "/produkty", query: { q: query } } : "/produkty");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && items[active]) goToProduct(items[active].slug);
          else submitSearch();
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => items.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            className="w-full rounded-full border border-cream-dark bg-white py-2.5 pl-10 pr-9 text-sm text-ink outline-none transition-colors focus:border-forest"
          />
          {loading && (
            <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-soft" />
          )}
        </div>
      </form>

      {open && items.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-cream-dark bg-white shadow-lg">
          {items.map((it, i) => (
            <li key={it.slug}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => goToProduct(it.slug)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  i === active ? "bg-cream" : "hover:bg-cream",
                )}
              >
                <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-paper">
                  {it.imageUrl ? (
                    <Image
                      src={it.imageUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <Leaf className="size-5 text-forest-light/40" />
                  )}
                </span>
                <span className="line-clamp-1 flex-1 text-sm text-ink">
                  {it.name}
                </span>
                <span className="shrink-0 font-mono text-sm text-forest">
                  {it.priceLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
