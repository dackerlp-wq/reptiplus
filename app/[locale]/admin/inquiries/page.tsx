import { Download, Search, AlertTriangle, CalendarClock, ChevronRight, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import {
  INQUIRY_STATUSES,
  STATUS_META,
  formatQuote,
  isFollowUpDue,
  isInquiryStatus,
  isOverdue,
  RESPONSE_SLA_DAYS,
} from "@/lib/ledx/inquiry-status";
import { InquiryStatusBadge } from "@/components/admin/inquiry-status-badge";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
const dayFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium" });

const select =
  "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

type Search = { status?: string; rada?: string; locale?: string; q?: string };

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "open";
  const rada = sp.rada ?? "";
  const loc = sp.locale ?? "";
  const q = (sp.q ?? "").trim();

  const svc = createServiceClient();

  // Počty pro záložky a seznam řad (tabulka je malá — jeden dotaz stačí).
  const { data: all } = await svc.from("ledx_inquiry").select("status, rada");
  const counts: Record<string, number> = { all: 0, open: 0 };
  const radaSet = new Set<string>();
  for (const r of all ?? []) {
    counts.all++;
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    if (["new", "in_progress", "quoted"].includes(r.status)) counts.open++;
    if (r.rada) radaSet.add(r.rada);
  }
  const rady = [...radaSet].sort((a, b) => a.localeCompare(b, "cs"));

  let query = svc
    .from("ledx_inquiry")
    .select("*")
    .order("created_at", { ascending: false });
  if (isInquiryStatus(status)) query = query.eq("status", status);
  else if (status === "open") query = query.in("status", ["new", "in_progress", "quoted"]);
  if (rada) query = query.eq("rada", rada);
  if (loc) query = query.eq("locale", loc);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, " ")}%`;
    query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }
  const { data } = await query;
  const rows = data ?? [];
  const now = new Date();

  const overdue = rows.filter((r) => isOverdue(r.status, r.created_at, now)).length;
  const followDue = rows.filter(
    (r) => ["new", "in_progress", "quoted"].includes(r.status) && isFollowUpDue(r.follow_up_at, now),
  ).length;

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (rada) params.set("rada", rada);
  if (loc) params.set("locale", loc);
  if (q) params.set("q", q);
  const exportHref = `/api/admin/inquiries/export?${params.toString()}`;
  const hasFilter = Boolean(rada || loc || q);

  const tabs: [string, string, number][] = [
    ["open", "Otevřené", counts.open],
    ...INQUIRY_STATUSES.map((s): [string, string, number] => [s, STATUS_META[s].label, counts[s] ?? 0]),
    ["all", "Vše", counts.all],
  ];
  const tabHref = (s: string) => {
    const p = new URLSearchParams(params);
    p.set("status", s);
    return `/admin/inquiries?${p.toString()}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Poptávky LEDX</h1>
          <p className="mt-1 text-sm text-gray-soft">
            Zákazníkům slibujeme odpověď do {RESPONSE_SLA_DAYS} pracovních dnů.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1 text-sm font-semibold text-error">
              <AlertTriangle className="size-4" /> {overdue} po lhůtě
            </span>
          )}
          {followDue > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-earth">
              <CalendarClock className="size-4" /> {followDue} ke kontaktování
            </span>
          )}
          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest"
          >
            <Download className="size-4" /> Export CSV
          </a>
        </div>
      </div>

      {/* Záložky stavů */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-cream-dark">
        {tabs.map(([key, label, n]) => (
          <Link
            key={key}
            href={tabHref(key)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              status === key
                ? "border-forest text-forest"
                : "border-transparent text-gray-soft hover:text-ink",
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

      {/* Filtry */}
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={status} />
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Jméno, e-mail, telefon…"
            className={cn(select, "w-64 pl-9")}
          />
        </label>
        <select name="rada" defaultValue={rada} className={select}>
          <option value="">Všechny řady</option>
          {rady.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select name="locale" defaultValue={loc} className={select}>
          <option value="">Všechny jazyky</option>
          <option value="cs">CS</option>
          <option value="en">EN</option>
          <option value="de">DE</option>
        </select>
        <button className="rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest-light">
          Filtrovat
        </button>
        {hasFilter && (
          <Link
            href={`/admin/inquiries?status=${status}`}
            className="inline-flex items-center gap-1 text-sm text-gray-soft hover:text-ink"
          >
            <X className="size-4" /> Zrušit filtry
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          {hasFilter || status !== "all" ? "Žádné poptávky neodpovídají filtru." : "Zatím žádné poptávky."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Přijato</th>
                <th className="px-4 py-3 font-semibold">Zákazník</th>
                <th className="px-4 py-3 font-semibold">Poptávka</th>
                <th className="px-4 py-3 font-semibold">Stav</th>
                <th className="px-4 py-3 font-semibold text-right">Nabídka</th>
                <th className="px-4 py-3 font-semibold">Další kontakt</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const late = isOverdue(r.status, r.created_at, now);
                const due =
                  ["new", "in_progress", "quoted"].includes(r.status) &&
                  isFollowUpDue(r.follow_up_at, now);
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-t border-cream align-top transition-colors hover:bg-paper",
                      r.status === "new" && "bg-amber/[0.04]",
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-soft">
                      {dateFmt.format(new Date(r.created_at))}
                      {late && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-error">
                          <AlertTriangle className="size-3.5" /> bez reakce
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/inquiries/${r.id}`}
                        className="font-semibold text-ink hover:text-forest"
                      >
                        {r.name}
                      </Link>
                      <div className="text-xs text-gray-soft">{r.email}</div>
                      {r.phone && <div className="text-xs text-gray-soft">{r.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest">
                          {r.rada ?? "—"}
                        </span>
                        {r.locale !== "cs" && (
                          <span className="rounded-md bg-gold/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-earth">
                            {r.locale}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-charcoal">
                        {[r.model, r.pocet ? `${r.pocet} ks` : null, r.cct, r.uhel]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <InquiryStatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs">
                      {r.quote_amount !== null ? (
                        <>
                          <div className="font-semibold text-ink">
                            {formatQuote(r.quote_amount, r.quote_currency)}
                          </div>
                          {r.quote_valid_until && (
                            <div className="text-gray-soft">do {dayFmt.format(new Date(r.quote_valid_until))}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-soft">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {r.follow_up_at ? (
                        <span className={cn("inline-flex items-center gap-1", due ? "font-semibold text-earth" : "text-gray-soft")}>
                          <CalendarClock className="size-3.5" />
                          {dayFmt.format(new Date(r.follow_up_at))}
                        </span>
                      ) : (
                        <span className="text-gray-soft">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Link
                        href={`/admin/inquiries/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-forest hover:bg-forest/10"
                      >
                        Detail <ChevronRight className="size-3.5" />
                      </Link>
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
