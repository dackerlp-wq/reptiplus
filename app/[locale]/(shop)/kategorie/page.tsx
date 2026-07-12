import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllCategories } from "@/lib/queries";
import { pickI18n } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });
  return { title: t("categories") };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Nav");
  const categories = await getAllCategories();
  const parents = categories.filter((c) => !c.parent_id);

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <h1 className="mb-10 font-display text-4xl font-bold">
        {t("categories")}
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {parents.map((parent) => {
          const children = categories.filter((c) => c.parent_id === parent.id);
          return (
            <div
              key={parent.id}
              className="rounded-xl border border-cream-dark bg-white p-6"
            >
              <Link
                href={`/kategorie/${parent.slug}`}
                className="font-display text-xl font-semibold text-ink transition-colors hover:text-forest"
              >
                {pickI18n(parent.name_i18n, locale, parent.name)}
              </Link>
              {children.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/kategorie/${child.slug}`}
                        className="text-sm text-gray-soft transition-colors hover:text-forest"
                      >
                        {pickI18n(child.name_i18n, locale, child.name)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
