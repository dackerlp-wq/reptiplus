import { Gift, Search, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/admin/hint";
import { ToastForm } from "@/components/admin/toast";
import { cancelVoucherAction, createVoucherAction, reactivateVoucherAction, resendVoucherAction } from "@/lib/admin/voucher-actions";

const czk = (m: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(m / 100);
const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium" });
const input = "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const select = "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktivní", cls: "bg-success/10 text-success" },
  used: { label: "Vyčerpaný", cls: "bg-cream text-gray-soft" },
  cancelled: { label: "Zrušený", cls: "bg-error/10 text-error" },
  expired: { label: "Prošlý", cls: "bg-gold/15 text-earth" },
};

type Search = { status?: string; q?: string };

export default async function AdminVouchersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const status = sp.status ?? "active";
  const q = (sp.q ?? "").trim();

  const svc = createServiceClient();
  let query = svc
    .from("gift_voucher")
    .select("*, order:order_id(number), gift_voucher_redemption(amount_czk, created_at, order:order_id(number))")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status !== "all") query = query.eq("status", status);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, " ")}%`;
    query = query.or(`code.ilike.${like},recipient_email.ilike.${like},recipient_name.ilike.${like}`);
  }
  const [{ data }, { data: all }] = await Promise.all([query, svc.from("gift_voucher").select("status, balance")]);
  const rows = (data ?? []) as unknown as (typeof data extends (infer R)[] | null ? R : never)[];
  const counts: Record<string, number> = { all: all?.length ?? 0 };
  let openBalance = 0;
  for (const v of all ?? []) {
    counts[v.status] = (counts[v.status] ?? 0) + 1;
    if (v.status === "active") openBalance += v.balance;
  }
  const tabs: [string, string][] = [["active", "Aktivní"], ["used", "Vyčerpané"], ["cancelled", "Zrušené"], ["all", "Vše"]];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dárkové poukazy</h1>
          <p className="mt-1 text-sm text-gray-soft">
            Nevyčerpaný zůstatek aktivních poukazů: <strong className="text-ink">{czk(openBalance)}</strong>
          </p>
        </div>
      </div>

      <div className="mb-6">
        <Hint>
          Poukaz koupený v e-shopu (produkt s příznakem „Dárkový poukaz“) se vystaví automaticky po zaplacení objednávky a pošle
          zákazníkovi e-mailem s PDF. Tady vystavíš poukaz ručně (prodej na prodejně, kompenzace). Zákazník kód zadá v pokladně,
          čerpat lze postupně. Hodnota je v Kč, v EUR objednávce se přepočte kurzem ČNB.
        </Hint>
      </div>

      <ToastForm action={createVoucherAction} className="mb-8 space-y-4 rounded-xl border border-cream-dark bg-white p-6">
        <input type="hidden" name="locale" value={locale} />
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Gift className="size-5 text-forest" /> Vystavit poukaz
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Hodnota (Kč) *</span>
            <input name="value" type="number" min={1} step={1} required placeholder="1000" className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Platí do</span>
            <input name="valid_to" type="date" min={today} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Interní poznámka</span>
            <input name="note" placeholder="např. prodáno na prodejně" className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>E-mail příjemce</span>
            <input name="recipient_email" type="email" className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Jméno příjemce</span>
            <input name="recipient_name" className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Jazyk e-mailu / PDF</span>
            <select name="mail_locale" defaultValue="cs" className={input}>
              <option value="cs">Čeština</option>
              <option value="en">Angličtina</option>
              <option value="de">Němčina</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-3">
            <span className={legend}>Vzkaz na poukazu (volitelné)</span>
            <input name="message" maxLength={300} placeholder="Všechno nejlepší k narozeninám!" className={input} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="send" className="size-4 accent-forest" /> Hned poslat e-mailem příjemci (s PDF)
        </label>
        <button className="rounded-lg bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-light">Vystavit</button>
      </ToastForm>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-cream-dark">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/vouchers?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              status === key ? "border-forest text-forest" : "border-transparent text-gray-soft hover:text-ink",
            )}
          >
            {label}
            <span className={cn("rounded-full px-1.5 py-0.5 font-mono text-[11px] leading-none", status === key ? "bg-forest/10 text-forest" : "bg-cream text-gray-soft")}>
              {counts[key] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={status} />
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input name="q" defaultValue={q} placeholder="Kód, e-mail, jméno…" className={cn(select, "w-64 pl-9")} />
        </label>
        <button className="rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest-light">Hledat</button>
        {q && (
          <Link href={`/admin/vouchers?status=${status}`} className="inline-flex items-center gap-1 text-sm text-gray-soft hover:text-ink">
            <X className="size-4" /> Zrušit
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">Žádné poukazy.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Kód</th>
                <th className="px-4 py-3 font-semibold">Stav</th>
                <th className="px-4 py-3 font-semibold text-right">Hodnota</th>
                <th className="px-4 py-3 font-semibold text-right">Zůstatek</th>
                <th className="px-4 py-3 font-semibold">Platí do</th>
                <th className="px-4 py-3 font-semibold">Příjemce</th>
                <th className="px-4 py-3 font-semibold">Původ / čerpání</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {rows.map((v) => {
                const st = STATUS[v.status] ?? STATUS.active;
                const reds = (v.gift_voucher_redemption ?? []) as { amount_czk: number; created_at: string; order: { number: string } | null }[];
                const origin = (v.order as { number: string } | null)?.number;
                return (
                  <tr key={v.id} className="hover:bg-cream/40">
                    <td className="px-4 py-3 font-mono font-semibold text-ink">{v.code}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", st.cls)}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{czk(v.value)}</td>
                    <td className="px-4 py-3 text-right font-mono">{czk(v.balance)}</td>
                    <td className="px-4 py-3 text-gray-soft">{v.valid_to ? dateFmt.format(new Date(v.valid_to)) : "bez omezení"}</td>
                    <td className="px-4 py-3">
                      {v.recipient_name && <div>{v.recipient_name}</div>}
                      <div className="text-xs text-gray-soft">{v.recipient_email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-soft">
                      {origin ? (
                        <div>
                          koupen v obj. <span className="font-mono">{origin}</span>
                        </div>
                      ) : (
                        <div>ručně{v.created_by ? ` (${v.created_by})` : ""}</div>
                      )}
                      {reds.map((r, i) => (
                        <div key={i}>
                          −{czk(r.amount_czk)} · obj. <span className="font-mono">{r.order?.number ?? "?"}</span>
                        </div>
                      ))}
                      {v.note && <div className="italic">{v.note}</div>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ToastForm action={resendVoucherAction} success="Odesláno" confirm={`Poslat poukaz ${v.code} e-mailem${v.recipient_email ? ` na ${v.recipient_email}` : ""}?`}>
                          <input type="hidden" name="id" value={v.id} />
                          {!v.recipient_email && <input name="email" type="email" required placeholder="e-mail" className="mr-1 w-40 rounded-md border border-cream-dark px-2 py-1 text-xs" />}
                          <button className="rounded-md px-2 py-1 text-xs font-medium text-forest hover:bg-forest/10">Poslat</button>
                        </ToastForm>
                        {v.status === "active" ? (
                          <ToastForm action={cancelVoucherAction} success="Zrušeno" confirm={`Zneplatnit poukaz ${v.code}?`}>
                            <input type="hidden" name="id" value={v.id} />
                            <button className="rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error/10">Zrušit</button>
                          </ToastForm>
                        ) : v.status === "cancelled" ? (
                          <ToastForm action={reactivateVoucherAction} success="Obnoveno">
                            <input type="hidden" name="id" value={v.id} />
                            <button className="rounded-md px-2 py-1 text-xs font-medium text-gray-soft hover:bg-cream hover:text-ink">Obnovit</button>
                          </ToastForm>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
