import { ArrowLeft, Plus, Rss } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { ToastForm } from "@/components/admin/toast";
import { saveFeedAction } from "@/lib/admin/supplier-actions";
import { SyncFeedButton } from "@/components/admin/supplier-items";

export const dynamic = "force-dynamic";
// Načtení feedu (~3 MB) a import s obrázky běží déle než výchozí limit serverové akce.
export const maxDuration = 300;

const input = "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const card = "rounded-xl border border-cream-dark bg-white p-5";

export default async function SuppliersPage() {
  const svc = createServiceClient();
  const [{ data: feeds }, { data: linked }] = await Promise.all([
    svc.from("supplier_feed").select("*").order("created_at"),
    svc.from("supplier_feed_item").select("feed_id").not("product_id", "is", null),
  ]);
  const linkedCount = new Map<string, number>();
  for (const r of linked ?? []) linkedCount.set(r.feed_id, (linkedCount.get(r.feed_id) ?? 0) + 1);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-gray-soft hover:text-forest">
          <ArrowLeft className="size-4" /> Produkty
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold">Dodavatelé</h1>
        <p className="mt-1 text-sm text-gray-soft">
          Produktové feedy dodavatelů (XML ve formátu Heureka). Eshop je načítá každý den v 5:00; produkty vybrané z feedu
          založíš jedním kliknutím a pak se jim z feedu sama aktualizuje nákupní cena a dostupnost u dodavatele.
        </p>
      </div>

      {(feeds ?? []).map((f) => (
        <div key={f.id} className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Rss className="size-4 text-forest" /> {f.name}
                {!f.is_active && <span className="rounded bg-cream px-1.5 py-0.5 text-xs font-normal text-gray-soft">vypnutý</span>}
              </h2>
              <p className="mt-0.5 break-all text-xs text-gray-soft">{f.url}</p>
              <p className="mt-1 text-sm text-ink">
                {f.item_count} položek · {linkedCount.get(f.id) ?? 0} napojeno na produkty ·{" "}
                {f.last_fetched_at
                  ? `načteno ${new Date(f.last_fetched_at).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })}`
                  : "zatím nenačteno"}
              </p>
              {f.last_error && <p className="mt-1 text-sm text-error">{f.last_error}</p>}
            </div>
            <div className="flex gap-2">
              <SyncFeedButton id={f.id} />
              <Link
                href={`/admin/products/suppliers/${f.id}`}
                className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
              >
                Procházet a importovat
              </Link>
            </div>
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-gray-soft">Upravit feed</summary>
            <FeedForm feed={f} />
          </details>
        </div>
      ))}

      <details className={card}>
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-forest">
          <Plus className="size-4" /> Přidat feed dodavatele
        </summary>
        <FeedForm />
      </details>
    </div>
  );
}

function FeedForm({ feed }: { feed?: { id: string; name: string; url: string; sku_prefix: string; is_active: boolean } }) {
  return (
    <ToastForm action={saveFeedAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_120px]">
      {feed && <input type="hidden" name="id" value={feed.id} />}
      <label className="flex flex-col gap-1.5">
        <span className={legend}>Dodavatel</span>
        <input name="name" required defaultValue={feed?.name ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={legend}>Adresa feedu (XML)</span>
        <input name="url" required defaultValue={feed?.url ?? ""} placeholder="https://…xml" className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={legend}>Prefix SKU</span>
        <input name="sku_prefix" defaultValue={feed?.sku_prefix ?? ""} placeholder="FP" className={input} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={feed?.is_active ?? true} className="size-4 accent-forest" />
        Načítat denně
      </label>
      <div className="sm:col-span-2">
        <button className="rounded-lg bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-light">
          {feed ? "Uložit" : "Přidat"}
        </button>
      </div>
    </ToastForm>
  );
}
