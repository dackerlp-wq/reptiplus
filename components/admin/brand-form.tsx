import { saveBrandAction } from "@/lib/admin/actions";
import type { Locale } from "@/i18n/routing";
import { LangFields } from "@/components/admin/lang-fields";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

type Row = {
  id: string;
  name: string;
  slug: string;
  description_i18n: Record<string, string> | null;
  sort_order: number;
  is_published: boolean;
};

export function BrandForm({
  brand,
  locale,
}: {
  brand?: Row;
  locale: Locale;
}) {
  const d = brand?.description_i18n ?? {};
  return (
    <form action={saveBrandAction} className="max-w-2xl space-y-5">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Název</span>
          <input name="name" required defaultValue={brand?.name ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Slug</span>
          <input name="slug" required defaultValue={brand?.slug ?? ""} className={input} />
        </label>
      </div>

      <div className="rounded-xl border border-cream-dark bg-paper p-4">
        <LangFields
          fields={[
            { name: "description", label: "Popis", type: "rich", values: d },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Pořadí</span>
          <input name="sort_order" type="number" defaultValue={brand?.sort_order ?? 0} className={input} />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={brand?.is_published ?? true} className="size-4 accent-forest" />
          Publikováno
        </label>
      </div>

      <button type="submit" className="rounded-lg bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
        Uložit
      </button>
    </form>
  );
}
