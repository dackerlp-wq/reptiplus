import { Plus, Pencil, ExternalLink, LayoutTemplate } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import {
  deleteLedxLineAction,
  toggleLedxLinePublishedAction,
} from "@/lib/admin/actions";
import { ToastForm } from "@/components/admin/toast";

export default async function AdminLedxPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("ledx_line")
    .select("*")
    .order("sort_order");
  const rows = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">LEDX řady</h1>
          <p className="text-sm text-gray-soft">
            Řady na stránce{" "}
            <a href="/cs/kategorie/profi-osvetleni" target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">
              Profi osvětlení
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ledx/content" className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
            <LayoutTemplate className="size-4" /> Statistiky a reference
          </Link>
          <Link href="/admin/ledx/new" className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light">
            <Plus className="size-4" /> Nová řada
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          Zatím žádné řady. Přidejte první.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const modelCount = Array.isArray(r.models) ? r.models.length : 0;
            const imgCount = Array.isArray(r.images) ? r.images.length : 0;
            const tr = (r.translations ?? {}) as Record<string, Record<string, unknown>>;
            const hasTr = (loc: string) => Object.keys(tr[loc] ?? {}).length > 0;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-dark bg-white p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold text-ink">{r.name}</span>
                    <span className="font-mono text-xs text-gray-soft">#{r.slug}</span>
                    {!r.is_published && (
                      <span className="rounded-md bg-gray-soft/20 px-2 py-0.5 text-xs font-semibold text-gray-soft">Skryto</span>
                    )}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-soft">
                    <span>{r.subtitle} · {modelCount} modelů · {imgCount} fotek</span>
                    {(["en", "de"] as const).map((loc) => (
                      <span
                        key={loc}
                        title={hasTr(loc) ? "Přeloženo" : "Bez překladu — zobrazí se česky"}
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${hasTr(loc) ? "bg-forest/10 text-forest" : "bg-amber/15 text-amber"}`}
                      >
                        {loc} {hasTr(loc) ? "✓" : "—"}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ToastForm action={toggleLedxLinePublishedAction} success={r.is_published ? "Skryto" : "Publikováno"}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="published" value={r.is_published ? "0" : "1"} />
                    <button className="rounded-lg border border-cream-dark px-3 py-1.5 text-sm text-charcoal hover:border-forest hover:text-forest">
                      {r.is_published ? "Skrýt" : "Publikovat"}
                    </button>
                  </ToastForm>
                  {r.is_published && (
                    <a href={`/cs/kategorie/profi-osvetleni/${r.slug}`} target="_blank" rel="noopener noreferrer" title="Zobrazit na webu" className="rounded-lg border border-cream-dark p-1.5 text-gray-soft hover:border-forest hover:text-forest">
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                  <Link href={`/admin/ledx/${r.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark px-3 py-1.5 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
                    <Pencil className="size-4" /> Upravit
                  </Link>
                  <ToastForm action={deleteLedxLineAction} success="Řada smazána" confirm={`Opravdu smazat řadu „${r.name}"?`}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-lg border border-cream-dark px-3 py-1.5 text-sm text-gray-soft hover:border-error hover:text-error">
                      Smazat
                    </button>
                  </ToastForm>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
