import { saveCategoryAction } from "@/lib/admin/actions";
import { pickI18n } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { CategoryItem } from "@/lib/queries";
import { LangFields } from "@/components/admin/lang-fields";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

type Row = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  parent_id: string | null;
  sort_order: number;
  is_published: boolean;
};

export function CategoryForm({
  category,
  categories,
  locale,
}: {
  category?: Row;
  categories: CategoryItem[];
  locale: Locale;
}) {
  const n = category?.name_i18n ?? {};
  const parents = categories.filter(
    (c) => !c.parent_id && c.id !== category?.id,
  );

  return (
    <form action={saveCategoryAction} className="max-w-2xl space-y-5">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="locale" value={locale} />

      <div className="rounded-xl border border-cream-dark bg-paper p-4">
        <LangFields fields={[{ name: "name", label: "Název", values: n }]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Slug</span>
          <input name="slug" required defaultValue={category?.slug ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Nadřazená kategorie</span>
          <select name="parent_id" defaultValue={category?.parent_id ?? ""} className={input}>
            <option value="">— (hlavní)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {pickI18n(p.name_i18n, locale, p.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Pořadí</span>
          <input name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} className={input} />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={category?.is_published ?? true} className="size-4 accent-forest" />
          Publikováno
        </label>
      </div>

      <button type="submit" className="rounded-lg bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
        Uložit
      </button>
    </form>
  );
}
