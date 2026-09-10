import { Mail, Phone, Check } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { setInquiryHandledAction } from "@/lib/admin/actions";
import { ToastForm } from "@/components/admin/toast";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminInquiriesPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("ledx_inquiry")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const open = rows.filter((r) => !r.handled).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Poptávky LEDX</h1>
        {open > 0 && (
          <span className="rounded-full bg-amber/15 px-3 py-1 text-sm font-semibold text-amber">
            {open} nevyřízených
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          Zatím žádné poptávky.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const spec: [string, string | number | null][] = [
              ["Model", r.model],
              ["Barva", r.cct],
              ["Úhel", r.uhel],
              ["Počet", r.pocet],
              ["Stmívání", r.stmivani],
            ];
            return (
              <div
                key={r.id}
                className={`rounded-xl border bg-white p-5 ${
                  r.handled ? "border-cream-dark opacity-70" : "border-forest/30"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-forest/10 px-2 py-0.5 text-sm font-semibold text-forest">
                        {r.rada ?? "—"}
                      </span>
                      {r.locale && r.locale !== "cs" && (
                        <span title="Poptávka z cizojazyčné verze webu — odpovězte ve stejném jazyce" className="rounded-md bg-gold/15 px-2 py-0.5 font-mono text-xs font-semibold uppercase text-earth">
                          {r.locale}
                        </span>
                      )}
                      {r.handled && (
                        <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                          Vyřízeno
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-display text-lg font-semibold text-ink">
                      {r.name}
                    </p>
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-soft">
                      <a
                        href={`mailto:${r.email}`}
                        className="inline-flex items-center gap-1.5 hover:text-forest"
                      >
                        <Mail className="size-3.5" /> {r.email}
                      </a>
                      {r.phone && (
                        <a
                          href={`tel:${r.phone}`}
                          className="inline-flex items-center gap-1.5 hover:text-forest"
                        >
                          <Phone className="size-3.5" /> {r.phone}
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-soft">
                      {dateFmt.format(new Date(r.created_at))}
                    </p>
                    <ToastForm
                      action={setInquiryHandledAction}
                      success={r.handled ? "Vráceno k vyřízení" : "Označeno jako vyřízené"}
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="handled" value={r.handled ? "0" : "1"} />
                      <button
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          r.handled
                            ? "border-cream-dark text-gray-soft hover:border-forest hover:text-forest"
                            : "border-forest bg-forest text-white hover:bg-forest-light"
                        }`}
                      >
                        <Check className="size-4" /> {r.handled ? "Znovu otevřít" : "Vyřízeno"}
                      </button>
                    </ToastForm>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-cream pt-3">
                  {spec
                    .filter(([, v]) => v !== null && v !== "")
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-md bg-cream px-2 py-1 font-mono text-xs text-charcoal"
                      >
                        {k}: <span className="font-semibold text-ink">{v}</span>
                      </span>
                    ))}
                </div>

                {r.poznamka && (
                  <p className="mt-3 rounded-lg bg-paper p-3 text-sm text-charcoal">
                    {r.poznamka}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
