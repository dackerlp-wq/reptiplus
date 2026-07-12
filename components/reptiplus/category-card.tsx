import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { CategoryItem } from "@/lib/queries";
import { pickI18n } from "@/lib/i18n";

export function CategoryCard({
  category,
  locale,
}: {
  category: CategoryItem;
  locale: Locale;
}) {
  const name = pickI18n(category.name_i18n, locale, category.name);

  return (
    <Link
      href={`/kategorie/${category.slug}`}
      className="group flex items-center justify-between gap-4 rounded-xl border border-cream-dark bg-white p-6 transition-colors hover:border-forest hover:bg-paper"
    >
      <span className="font-display text-lg font-semibold text-ink">
        {name}
      </span>
      <ArrowRight className="size-5 text-forest transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
