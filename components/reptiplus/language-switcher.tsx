"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    // Přepne CELÝ web do jazyka (UI, obsah i měna se řídí locale).
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      className="flex items-center overflow-hidden rounded-md border border-cream-dark bg-white text-xs font-semibold"
      role="group"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={isPending}
          aria-current={l === locale}
          className={cn(
            "px-2.5 py-1.5 uppercase transition-colors",
            l === locale
              ? "bg-forest text-white"
              : "text-gray-soft hover:bg-cream",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
