import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getAllCategories } from "@/lib/queries";
import { getShopContact } from "@/lib/settings";
import { SupplierItemsTable, SyncFeedButton, type SupplierRow } from "@/components/admin/supplier-items";

export const dynamic = "force-dynamic";
// Načtení feedu (~3 MB) a import s obrázky běží déle než výchozí limit serverové akce.
export const maxDuration = 300;

const PAGE = 50;
const STATUSES = {
  all: "Vše",
  new: "Nenaimportované",
  imported: "V eshopu",
  changed: "Změna nákupní ceny (7 dní)",
  gone: "Zmizelé z feedu",
} as const;
type Status = keyof typeof STATUSES;
const SORTS = {
  name: "Název A–Z",
  margin_desc: "Marže při DMC — nejvyšší",
  margin_asc: "Marže při DMC — nejnižší",
  dmc_desc: "DMC — nejdražší",
  dmc_asc: "DMC — nejlevnější",
  buy_asc: "Nákup — nejlevnější",
} as const;
type Sort = keyof typeof SORTS;

/** Marže při doporučené ceně (DMC) v % — u plátce i neplátce = 1 − velkoobchod / DMC (DPH se vykrátí). */
const dmcMargin = (wholesale: number | null, retail: number | null) =>
  wholesale != null && retail ? Math.round((1 - Number(wholesale) / Number(retail)) * 1000) / 10 : null;

const input = "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

export default async function SupplierFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; cat?: string; brand?: string; status?: string; page?: string; sort?: string; group?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const status: Status = sp.status && sp.status in STATUSES ? (sp.status as Status) : "new";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const sort: Sort = sp.sort && sp.sort in SORTS ? (sp.sort as Sort) : "name";
  const svc = createServiceClient();

  const { data: feed } = await svc.from("supplier_feed").select("*").eq("id", id).maybeSingle();
  if (!feed) notFound();

  // Kategorie a výrobci feedu pro filtry (s počty).
  const facets = { cat: new Map<string, number>(), brand: new Map<string, number>() };
  const groupSize = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data } = await svc
      .from("supplier_feed_item")
      .select("category_text, manufacturer, group_id, in_feed")
      .eq("feed_id", id)
      .order("id") // stabilní stránkování (bez řazení se stránky po 1000 můžou překrývat)
      .range(from, from + 999);
    for (const r of data ?? []) {
      if (r.group_id && r.in_feed) groupSize.set(r.group_id, (groupSize.get(r.group_id) ?? 0) + 1);
      if (r.category_text) facets.cat.set(r.category_text, (facets.cat.get(r.category_text) ?? 0) + 1);
      if (r.manufacturer) facets.brand.set(r.manufacturer, (facets.brand.get(r.manufacturer) ?? 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }

  // Filtrované položky celé (feed má stovky až nízké tisíce řádků) — řazení podle marže/DMC se počítá tady.
  const filtered = (from: number) => {
    let q = svc.from("supplier_feed_item").select("*, product:product_id(name)").eq("feed_id", id);
    if (sp.q) {
      const term = sp.q.replace(/[%,()]/g, " ").trim();
      q = q.or(`name.ilike.%${term}%,item_id.eq.${term},ean.eq.${term}`);
    }
    if (sp.cat) q = q.eq("category_text", sp.cat);
    if (sp.brand) q = q.eq("manufacturer", sp.brand);
    if (status === "new") q = q.is("product_id", null).eq("in_feed", true);
    if (status === "imported") q = q.not("product_id", "is", null);
    if (status === "changed") q = q.gte("wholesale_changed_at", new Date(Date.now() - 7 * 86400_000).toISOString());
    if (status === "gone") q = q.eq("in_feed", false);
    if (sp.group) q = q.eq("group_id", sp.group);
    return q.order("name").order("id").range(from, from + 999);
  };
  type ItemRow = NonNullable<Awaited<ReturnType<typeof filtered>>["data"]>[number];
  const all: ItemRow[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await filtered(from);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const num = (v: unknown) => (v == null ? null : Number(v));
  const key = (r: ItemRow) => {
    switch (sort) {
      case "margin_desc":
      case "margin_asc":
        return dmcMargin(num(r.wholesale_czk), num(r.retail_czk));
      case "dmc_desc":
      case "dmc_asc":
        return num(r.retail_czk);
      case "buy_asc":
        return num(r.wholesale_czk);
      default:
        return null;
    }
  };
  if (sort !== "name") {
    const dir = sort.endsWith("_desc") ? -1 : 1;
    all.sort((x, y) => {
      const a = key(x);
      const b = key(y);
      if (a == null && b == null) return 0;
      if (a == null) return 1; // bez ceny vždy na konec
      if (b == null) return -1;
      return (a - b) * dir;
    });
  }
  const count = all.length;
  const items = all.slice((page - 1) * PAGE, page * PAGE);

  const weekAgo = Date.now() - 7 * 86400_000;
  const rows: SupplierRow[] = items.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    name: r.name,
    url: r.url,
    image: r.images?.[0] ?? null,
    manufacturer: r.manufacturer,
    category: r.category_text,
    vatRate: r.vat_rate,
    wholesaleCzk: r.wholesale_czk != null ? Number(r.wholesale_czk) : null,
    wholesaleEur: r.wholesale_eur != null ? Number(r.wholesale_eur) : null,
    retailCzk: r.retail_czk != null ? Number(r.retail_czk) : null,
    retailEur: r.retail_eur != null ? Number(r.retail_eur) : null,
    prevWholesaleCzk: r.prev_wholesale_czk != null ? Number(r.prev_wholesale_czk) : null,
    priceChanged: Boolean(r.wholesale_changed_at && new Date(r.wholesale_changed_at).getTime() > weekAgo),
    inFeed: r.in_feed,
    productId: r.product_id,
    productName: (r.product as { name?: string } | null)?.name ?? null,
    groupId: r.group_id,
    groupSize: r.group_id ? (groupSize.get(r.group_id) ?? 1) : 1,
  }));

  const [categories, shop] = await Promise.all([getAllCategories(), getShopContact().catch(() => null)]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const label = (c: (typeof categories)[number]): string => {
    const parts = [c.name];
    let p = c.parent_id ? byId.get(c.parent_id) : undefined;
    for (let i = 0; p && i < 5; i++, p = p.parent_id ? byId.get(p.parent_id) : undefined) parts.unshift(p.name);
    return parts.join(" › ");
  };
  const catOptions = categories.map((c) => ({ id: c.id, label: label(c) })).sort((a, b) => a.label.localeCompare(b.label, "cs"));

  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, cat: sp.cat, brand: sp.brand, group: sp.group, status, sort: sort === "name" ? undefined : sort, page: undefined as string | undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/products/suppliers" className="inline-flex items-center gap-1 text-sm text-gray-soft hover:text-forest">
            <ArrowLeft className="size-4" /> Dodavatelé
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold">{feed.name}</h1>
          <p className="mt-1 text-sm text-gray-soft">
            {feed.item_count} položek ·{" "}
            {feed.last_fetched_at
              ? `načteno ${new Date(feed.last_fetched_at).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })}`
              : "zatím nenačteno — klikni na Načíst teď"}
          </p>
          {feed.last_error && <p className="mt-1 text-sm text-error">{feed.last_error}</p>}
        </div>
        <SyncFeedButton id={feed.id} />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-cream-dark">
        {(Object.keys(STATUSES) as Status[]).map((s) => (
          <Link
            key={s}
            href={qs({ status: s })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${status === s ? "border-forest text-forest" : "border-transparent text-gray-soft hover:text-ink"}`}
          >
            {STATUSES[s]}
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Hledat název, kód, EAN…" className={`${input} min-w-60`} />
        <select name="cat" defaultValue={sp.cat ?? ""} className={`${input} max-w-80`}>
          <option value="">Všechny kategorie dodavatele</option>
          {[...facets.cat.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], "cs"))
            .map(([c, n]) => (
              <option key={c} value={c}>
                {c.split(" | ").slice(-2).join(" › ")} ({n})
              </option>
            ))}
        </select>
        <select name="brand" defaultValue={sp.brand ?? ""} className={input}>
          <option value="">Všichni výrobci</option>
          {[...facets.brand.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], "cs"))
            .map(([b, n]) => (
              <option key={b} value={b}>
                {b} ({n})
              </option>
            ))}
        </select>
        <select name="sort" defaultValue={sort} className={input}>
          {(Object.keys(SORTS) as Sort[]).map((k) => (
            <option key={k} value={k}>
              Řadit: {SORTS[k]}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light">Filtrovat</button>
        {sp.group && <input type="hidden" name="group" value={sp.group} />}
        {(sp.q || sp.cat || sp.brand || sp.group) && (
          <Link href={qs({ q: undefined, cat: undefined, brand: undefined, group: undefined })} className="px-2 py-2 text-sm text-gray-soft hover:text-forest">
            Zrušit filtr
          </Link>
        )}
        <span className="ml-auto text-sm text-gray-soft">{count ?? 0} položek</span>
      </form>

      <p className="text-xs text-gray-soft">
        Nákup = velkoobchodní cena dodavatele. DMC = doporučená maloobchodní cena dodavatele. Marže při DMC = kolik zbude při prodeji za DMC.
        Prodejní cena podle pravidla dole, vždy s DPH. Marže se počítá {shop?.dic ? "z cen bez DPH (plátce DPH)" : "z cen s DPH (neplátce — DPH z nákupu je náklad)"}.
        Produkty se zakládají jako koncept bez skladu, se stavem „skladem u dodavatele“; zkontroluj je a zveřejni.
      </p>

      {sp.group && (
        <p className="rounded-lg bg-gold/15 px-3 py-2 text-sm text-ink">
          Zobrazena jen skupina variant <strong>{sp.group}</strong>. Zaškrtni varianty, které chceš — naimportují se jako jeden produkt.
        </p>
      )}
      <SupplierItemsTable rows={rows} categories={catOptions} vatPayer={Boolean(shop?.dic)} groupHref={qs({ group: "__G__", status: "all" })} />

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="rounded-lg border border-cream-dark px-3 py-1.5 hover:border-forest">← Předchozí</Link>}
          <span className="text-gray-soft">
            Strana {page} z {pages}
          </span>
          {page < pages && <Link href={qs({ page: String(page + 1) })} className="rounded-lg border border-cream-dark px-3 py-1.5 hover:border-forest">Další →</Link>}
        </div>
      )}
    </div>
  );
}
