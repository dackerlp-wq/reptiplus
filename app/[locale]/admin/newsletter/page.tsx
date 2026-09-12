import { Download, Search, X, MailCheck, MailX, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import { ToastForm } from "@/components/admin/toast";
import { Hint } from "@/components/admin/hint";
import { deleteSubscriberAction, unsubscribeSubscriberAction } from "@/lib/admin/newsletter-actions";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
const select =
  "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

type Search = { status?: string; q?: string };
type Status = "confirmed" | "pending" | "unsubscribed";

function statusOf(r: { confirmed_at: string | null; unsubscribed_at: string | null }): Status {
  if (r.unsubscribed_at) return "unsubscribed";
  return r.confirmed_at ? "confirmed" : "pending";
}

const STATUS_META: Record<Status, { label: string; cls: string; icon: typeof MailCheck }> = {
  confirmed: { label: "Potvrzený", cls: "bg-success/10 text-success", icon: MailCheck },
  pending: { label: "Čeká na potvrzení", cls: "bg-gold/15 text-earth", icon: Clock },
  unsubscribed: { label: "Odhlášený", cls: "bg-cream text-gray-soft", icon: MailX },
};

export default async function AdminNewsletterPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = sp.status ?? "confirmed";
  const q = (sp.q ?? "").trim();

  const svc = createServiceClient();
  let query = svc
    .from("newsletter_subscriber")
    .select("id, email, locale, source, created_at, confirmed_at, unsubscribed_at, discount_code_id, customer_id")
    .order("created_at", { ascending: false });
  if (status === "confirmed") query = query.not("confirmed_at", "is", null).is("unsubscribed_at", null);
  else if (status === "pending") query = query.is("confirmed_at", null).is("unsubscribed_at", null);
  else if (status === "unsubscribed") query = query.not("unsubscribed_at", "is", null);
  if (q) query = query.ilike("email", `%${q.replace(/[%_,]/g, " ")}%`);

  const [{ data }, { data: allRows }] = await Promise.all([
    query,
    svc.from("newsletter_subscriber").select("confirmed_at, unsubscribed_at"),
  ]);
  const rows = data ?? [];

  // Kódy použité = discount_code.used_count > 0 (jen pro zobrazené řádky).
  const codeIds = rows.map((r) => r.discount_code_id).filter((x): x is string => Boolean(x));
  const { data: codes } = codeIds.length
    ? await svc.from("discount_code").select("id, code, used_count, valid_to").in("id", codeIds)
    : { data: [] };
  const codeById = new Map((codes ?? []).map((c) => [c.id, c]));

  const counts = { confirmed: 0, pending: 0, unsubscribed: 0, all: allRows?.length ?? 0 };
  for (const r of allRows ?? []) counts[statusOf(r)]++;

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const exportHref = `/api/admin/newsletter/export?${params.toString()}`;

  const tabs: [string, string, number][] = [
    ["confirmed", "Potvrzení", counts.confirmed],
    ["pending", "Čekající", counts.pending],
    ["unsubscribed", "Odhlášení", counts.unsubscribed],
    ["all", "Vše", counts.all],
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Newsletter</h1>
          <p className="mt-1 text-sm text-gray-soft">{counts.confirmed} aktivních odběratelů</p>
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest"
        >
          <Download className="size-4" /> Export CSV
        </a>
      </div>

      <div className="mb-4">
        <Hint>
          Odběr funguje jako double opt-in: po přihlášení dostane zákazník potvrzovací e-mail, po potvrzení uvítací
          e-mail s jednorázovým slevovým kódem (výše slevy v Nastavení → Obchod). Do rozesílky (Ecomail, Mailchimp…)
          exportuj jen záložku „Potvrzení“.
        </Hint>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-cream-dark">
        {tabs.map(([key, label, n]) => (
          <Link
            key={key}
            href={`/admin/newsletter?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              status === key ? "border-forest text-forest" : "border-transparent text-gray-soft hover:text-ink",
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 font-mono text-[11px] leading-none",
                status === key ? "bg-forest/10 text-forest" : "bg-cream text-gray-soft",
              )}
            >
              {n}
            </span>
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={status} />
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input name="q" defaultValue={q} placeholder="E-mail…" className={cn(select, "w-64 pl-9")} />
        </label>
        <button className="rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest-light">
          Hledat
        </button>
        {q && (
          <Link href={`/admin/newsletter?status=${status}`} className="inline-flex items-center gap-1 text-sm text-gray-soft hover:text-ink">
            <X className="size-4" /> Zrušit
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          {q ? "Žádný odběratel neodpovídá hledání." : "Zatím žádní odběratelé."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Stav</th>
                <th className="px-4 py-3 font-semibold">Jazyk</th>
                <th className="px-4 py-3 font-semibold">Zdroj</th>
                <th className="px-4 py-3 font-semibold">Přihlášen</th>
                <th className="px-4 py-3 font-semibold">Slevový kód</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {rows.map((r) => {
                const st = statusOf(r);
                const meta = STATUS_META[st];
                const code = r.discount_code_id ? codeById.get(r.discount_code_id) : null;
                return (
                  <tr key={r.id} className="hover:bg-cream/40">
                    <td className="px-4 py-3">
                      {r.customer_id ? (
                        <Link href={`/admin/customers/${r.customer_id}`} className="font-medium text-forest hover:underline">
                          {r.email}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{r.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", meta.cls)}>
                        <meta.icon className="size-3.5" /> {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 uppercase text-gray-soft">{r.locale}</td>
                    <td className="px-4 py-3 text-gray-soft">{r.source ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-soft">{dateFmt.format(new Date(r.created_at))}</td>
                    <td className="px-4 py-3">
                      {code ? (
                        <span className="font-mono text-xs">
                          {code.code}
                          <span className={cn("ml-2", code.used_count > 0 ? "text-success" : "text-gray-soft")}>
                            {code.used_count > 0 ? "použit" : "nepoužit"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-soft">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {st !== "unsubscribed" && (
                          <ToastForm action={unsubscribeSubscriberAction} success="Odhlášeno" confirm={`Odhlásit ${r.email} z odběru?`}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="rounded-md px-2 py-1 text-xs font-medium text-gray-soft hover:bg-cream hover:text-ink">
                              Odhlásit
                            </button>
                          </ToastForm>
                        )}
                        <ToastForm action={deleteSubscriberAction} success="Smazáno" confirm={`Trvale smazat ${r.email}?`}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error/10">Smazat</button>
                        </ToastForm>
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
