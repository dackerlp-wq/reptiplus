"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Loader2, Leaf, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Product = {
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  priceLabel: string;
};
type Category = { slug: string; name: string };

function Highlight({ text, q }: { text: string; q: string }) {
  const query = q.trim();
  const idx = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-forest">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

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
  const t = useTranslations("Nav");
  const boxRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const total = categories.length + items.length;

  // Debounced fetch návrhů
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setCategories([]);
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
        const data = (await res.json()) as {
          categories: Category[];
          items: Product[];
        };
        setCategories(data.categories ?? []);
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

  const close = () => {
    setOpen(false);
    setQ("");
  };
  const goCategory = (slug: string) => {
    close();
    router.push(`/kategorie/${slug}`);
  };
  const goProduct = (slug: string) => {
    close();
    router.push(`/produkt/${slug}`);
  };
  const selectAt = (idx: number) => {
    if (idx < categories.length) goCategory(categories[idx].slug);
    else goProduct(items[idx - categories.length].slug);
  };
  const submitSearch = () => {
    const query = q.trim();
    setOpen(false);
    router.push(query ? { pathname: "/produkty", query: { q: query } } : "/produkty");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || total === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const rowClass = (idx: number) =>
    cn(
      "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
      idx === active ? "bg-cream" : "hover:bg-cream",
    );
  const sectionLabel =
    "px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-soft";

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0) selectAt(active);
          else submitSearch();
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => total > 0 && setOpen(true)}
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

      {open && total > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-cream-dark bg-white py-1 shadow-lg">
          {categories.length > 0 && (
            <>
              <p className={sectionLabel}>{t("categories")}</p>
              {categories.map((c, i) => (
                <button
                  key={c.slug}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => goCategory(c.slug)}
                  className={rowClass(i)}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded bg-paper">
                    <Tag className="size-4 text-forest-light/60" />
                  </span>
                  <span className="flex-1 text-sm text-ink">
                    <Highlight text={c.name} q={q} />
                  </span>
                </button>
              ))}
            </>
          )}

          {items.length > 0 && (
            <>
              <p className={sectionLabel}>{t("products")}</p>
              {items.map((it, j) => {
                const idx = categories.length + j;
                return (
                  <button
                    key={it.slug}
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => goProduct(it.slug)}
                    className={rowClass(idx)}
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
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm text-ink">
                        <Highlight text={it.name} q={q} />
                      </span>
                      {it.category && (
                        <span className="line-clamp-1 text-xs text-gray-soft">
                          {it.category}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-sm text-forest">
                      {it.priceLabel}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
