import { Search, X, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/admin/hint";
import { ToastForm } from "@/components/admin/toast";
import { CLAIM_STATUSES, CLAIM_STATUS_META, CLAIM_TYPE_LABEL, isClaimStatus, isClaimType } from "@/lib/claims/status";
import { deleteClaimAction, setClaimNoteAction, setClaimStatusAction } from "@/lib/admin/claim-actions";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
const select = "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

type Search = { status?: string; type?: string; q?: string; focus?: string };

export default async function AdminClaimsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = sp.status ?? "open";
  const type = sp.type ?? "";
  const q = (sp.q ?? "").trim();

  const svc = createServiceClient();
  let query = svc.from("claim").select("*, order:order_id(id, number, total, currency, payment_method)").order("created_at", { ascending: false }).limit(500);
  if (isClaimStatus(status)) query = query.eq("status", status);
  else if (status === "open") query = query.in("status", ["new", "in_progress"]);
  if (isClaimType(type)) query = query.eq("type", type);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, " ")}%`;
    query = query.or(`order_number.ilike.${like},email.ilike.${like},name.ilike.${like}`);
  }
  const [{ data }, { data: all }] = await Promise.all([query, svc.from("claim").select("status")]);
  const rows = data ?? [];
  const counts: Record<string, number> = { all: all?.length ?? 0, open: 0 };
  for (const c of all ?? []) {
    counts[c.status] = (counts[c.status] ?? 0) + 1;
    if (c.status === "new" || c.status === "in_progress") counts.open++;
  }
  const tabs: [string, string][] = [["open", "Otevřené"], ...CLAIM_STATUSES.map((s): [string, string] => [s, CLAIM_STATUS_META[s].label]), ["all", "Vše"]];
  const base = (s: string) => `/admin/claims?status=${s}${type ? `&type=${type}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Reklamace a vrácení</h1>
        <p className="mt-1 text-sm text-gray-soft">Reklamace vyřídit do 30 dnů, odstoupení: vrátit peníze do 14 dnů od doručení zboží zpět.</p>
      </div>
      <div className="mb-4">
        <Hint>
          Požadavky přicházejí z formulářů /reklamace a /odstoupeni-od-smlouvy (zákazník dostal potvrzení e-mailem). Vrácení peněz
          udělej v detailu objednávky (karta Vratka — vystaví dobropis a pošle e-mail), tady jen sleduj stav a piš si poznámky.
        </Hint>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-cream-dark">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={base(key)}
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
          <input name="q" defaultValue={q} placeholder="Číslo objednávky, e-mail, jméno…" className={cn(select, "w-72 pl-9")} />
        </label>
        <select name="type" defaultValue={type} className={select}>
          <option value="">Reklamace i vrácení</option>
          <option value="claim">Jen reklamace</option>
          <option value="withdrawal">Jen odstoupení</option>
        </select>
        <button className="rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest-light">Filtrovat</button>
        {(q || type) && (
          <Link href={`/admin/claims?status=${status}`} className="inline-flex items-center gap-1 text-sm text-gray-soft hover:text-ink">
            <X className="size-4" /> Zrušit filtry
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">Žádné požadavky.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((c) => {
            const meta = CLAIM_STATUS_META[isClaimStatus(c.status) ? c.status : "new"];
            const order = c.order as { id: string; number: string; total: number; currency: string; payment_method: string | null } | null;
            const focused = sp.focus === c.id;
            return (
              <div key={c.id} id={c.id} className={cn("rounded-xl border bg-white p-5", focused ? "border-forest ring-2 ring-forest/20" : "border-cream-dark")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-semibold text-charcoal">{CLAIM_TYPE_LABEL[isClaimType(c.type) ? c.type : "claim"]}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", meta.cls)}>{meta.label}</span>
                      <span className="text-xs text-gray-soft">{dateFmt.format(new Date(c.created_at))}</span>
                      <span className="text-xs uppercase text-gray-soft">{c.locale}</span>
                    </div>
                    <p className="mt-2 font-display text-lg font-semibold">
                      {order ? (
                        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 text-forest hover:underline">
                          {c.order_number} <ExternalLink className="size-3.5" />
                        </Link>
                      ) : (
                        <span>
                          {c.order_number} <span className="text-xs font-normal text-error">(objednávka nenalezena)</span>
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-charcoal">
                      {c.name} · <a href={`mailto:${c.email}`} className="text-forest hover:underline">{c.email}</a>
                      {c.phone && <> · {c.phone}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToastForm action={setClaimStatusAction} success="Stav uložen" className="flex items-center gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <select name="status" defaultValue={c.status} className={select}>
                        {CLAIM_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {CLAIM_STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-forest px-3 py-2 text-sm font-semibold text-forest hover:bg-forest hover:text-white">Uložit</button>
                    </ToastForm>
                    <ToastForm action={deleteClaimAction} success="Smazáno" confirm="Trvale smazat tento požadavek?">
                      <input type="hidden" name="id" value={c.id} />
                      <button className="rounded-lg px-2 py-2 text-xs font-medium text-error hover:bg-error/10">Smazat</button>
                    </ToastForm>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Zboží</dt>
                    <dd className="whitespace-pre-wrap">{c.items}</dd>
                  </div>
                  {c.reason && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Popis</dt>
                      <dd className="whitespace-pre-wrap">{c.reason}</dd>
                    </div>
                  )}
                  {c.bank_account && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Účet pro vrácení</dt>
                      <dd className="font-mono">{c.bank_account}</dd>
                    </div>
                  )}
                  {order && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Objednávka</dt>
                      <dd>
                        {(order.total / 100).toLocaleString("cs-CZ")} {order.currency} · platba {order.payment_method ?? "—"}
                      </dd>
                    </div>
                  )}
                </dl>

                <ToastForm action={setClaimNoteAction} success="Poznámka uložena" className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <input type="hidden" name="id" value={c.id} />
                  <textarea name="admin_note" rows={2} defaultValue={c.admin_note ?? ""} placeholder="Interní poznámka (co bylo dohodnuto, kam poslat, stav vrácení…)" className={cn(select, "flex-1")} />
                  <button className="rounded-lg border border-cream-dark px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">Uložit poznámku</button>
                </ToastForm>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
