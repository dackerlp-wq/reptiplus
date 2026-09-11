import {
  ArrowLeft,
  Mail,
  Phone,
  AlertTriangle,
  CalendarClock,
  StickyNote,
  Banknote,
  ShieldOff,
  Send,
  ArrowRightLeft,
  History,
  Globe,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { cn } from "@/lib/utils";
import {
  EMAIL_KIND_META,
  INQUIRY_STATUSES,
  STATUS_META,
  formatQuote,
  isEmailKind,
  isFollowUpDue,
  isInquiryStatus,
  isOpenStatus,
  isOverdue,
} from "@/lib/ledx/inquiry-status";
import { buildAllInquiryDrafts } from "@/lib/ledx/inquiry-drafts";
import {
  addInquiryNoteAction,
  saveInquiryQuoteAction,
  setInquiryFollowUpAction,
  setInquiryStatusAction,
} from "@/lib/admin/inquiry-actions";
import { ToastForm } from "@/components/admin/toast";
import { InquiryStatusBadge } from "@/components/admin/inquiry-status-badge";
import { InquiryEmailComposer } from "@/components/admin/inquiry-email-composer";
import { InquiryDangerZone } from "@/components/admin/inquiry-danger-zone";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
const dayFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "long" });

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const card = "rounded-xl border border-cream-dark bg-white p-5";
const btn =
  "inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-light";

type Meta = Record<string, string | number | null | undefined>;

function eventTitle(type: string, meta: Meta): { icon: typeof Mail; title: string } {
  switch (type) {
    case "status": {
      const from = isInquiryStatus(meta.from) ? STATUS_META[meta.from].label : String(meta.from ?? "—");
      const to = isInquiryStatus(meta.to) ? STATUS_META[meta.to].label : String(meta.to ?? "—");
      return { icon: ArrowRightLeft, title: `Stav: ${from} → ${to}` };
    }
    case "email": {
      const kind = isEmailKind(meta.kind) ? EMAIL_KIND_META[meta.kind].label : "E-mail";
      return { icon: Send, title: `${kind} — odesláno na ${meta.to ?? "?"}` };
    }
    case "quote": {
      const amount = typeof meta.amount === "number" ? formatQuote(meta.amount, String(meta.currency ?? "CZK")) : "bez částky";
      const extra = [
        meta.valid_until ? `platí do ${dayFmt.format(new Date(String(meta.valid_until)))}` : null,
        meta.number ? `č. ${meta.number}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return { icon: Banknote, title: `Nabídka: ${amount}${extra ? ` (${extra})` : ""}` };
    }
    case "follow_up":
      return {
        icon: CalendarClock,
        title: meta.to ? `Další kontakt: ${dayFmt.format(new Date(String(meta.to)))}` : "Další kontakt zrušen",
      };
    case "note":
      return { icon: StickyNote, title: "Interní poznámka" };
    default:
      return { icon: History, title: "Systém" };
  }
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const svc = createServiceClient();
  const [{ data: inq }, { data: events }, shop] = await Promise.all([
    svc.from("ledx_inquiry").select("*").eq("id", id).maybeSingle(),
    svc
      .from("ledx_inquiry_event")
      .select("*")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: false }),
    getShopContact(),
  ]);
  if (!inq) notFound();

  const now = new Date();
  const overdue = isOverdue(inq.status, inq.created_at, now);
  const followDue = isOpenStatus(inq.status) && isFollowUpDue(inq.follow_up_at, now);
  const anonymized = Boolean(inq.anonymized_at);
  const drafts = buildAllInquiryDrafts(inq, shop);

  const spec: [string, string | number | null][] = [
    ["Řada", inq.rada],
    ["Model / výkon", inq.model],
    ["Barva světla", inq.cct],
    ["Úhel vyzařování", inq.uhel],
    ["Počet kusů", inq.pocet],
    ["Stmívání", inq.stmivani === "Bez" ? "bez stmívání" : inq.stmivani],
  ];

  return (
    <div>
      <Link
        href="/admin/inquiries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Zpět na poptávky
      </Link>

      {/* Hlavička */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <InquiryStatusBadge status={inq.status} size="md" />
            {inq.locale !== "cs" && (
              <span
                title="Poptávka z cizojazyčné verze webu — odpovídejte ve stejném jazyce"
                className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 font-mono text-xs font-semibold uppercase text-earth"
              >
                <Globe className="size-3.5" /> {inq.locale}
              </span>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded-md bg-error/10 px-2 py-1 text-xs font-semibold text-error">
                <AlertTriangle className="size-3.5" /> Bez reakce déle než 2 pracovní dny
              </span>
            )}
            {followDue && (
              <span className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-earth">
                <CalendarClock className="size-3.5" /> Dnes kontaktovat
              </span>
            )}
            {anonymized && (
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-soft/20 px-2 py-1 text-xs font-semibold text-gray-soft">
                <ShieldOff className="size-3.5" /> Anonymizováno
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">{inq.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-soft">
            {!anonymized && (
              <a href={`mailto:${inq.email}`} className="inline-flex items-center gap-1.5 hover:text-forest">
                <Mail className="size-3.5" /> {inq.email}
              </a>
            )}
            {inq.phone && (
              <a href={`tel:${inq.phone}`} className="inline-flex items-center gap-1.5 hover:text-forest">
                <Phone className="size-3.5" /> {inq.phone}
              </a>
            )}
            <span>Přijato {dateFmt.format(new Date(inq.created_at))}</span>
          </p>
        </div>

        <ToastForm action={setInquiryStatusAction} success="Stav změněn" className="flex items-center gap-2">
          <input type="hidden" name="id" value={inq.id} />
          <label className="flex items-center gap-2 text-sm text-gray-soft">
            Stav
            <select name="status" defaultValue={inq.status} className={cn(input, "w-auto")}>
              {INQUIRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <button className={btn}>Změnit</button>
        </ToastForm>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Levý sloupec ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <section className={card}>
            <h2 className="mb-3 font-display text-lg font-semibold">Co zákazník poptává</h2>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {spec
                .filter(([, v]) => v !== null && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-cream py-1.5 text-sm">
                    <dt className="text-gray-soft">{k}</dt>
                    <dd className="font-semibold text-ink">{v}</dd>
                  </div>
                ))}
            </dl>
            {inq.poznamka ? (
              <div className="mt-4">
                <p className={legend}>Poznámka zákazníka</p>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-paper p-3 text-sm text-charcoal">{inq.poznamka}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-soft">Bez poznámky.</p>
            )}
          </section>

          <InquiryEmailComposer
            inquiryId={inq.id}
            customerEmail={inq.email}
            locale={inq.locale}
            status={inq.status}
            drafts={drafts}
            disabled={anonymized}
          />

          <section className={card}>
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <History className="size-5 text-forest" /> Historie
            </h2>
            {!events || events.length === 0 ? (
              <p className="text-sm text-gray-soft">Zatím žádná aktivita. Poptávka přišla {dateFmt.format(new Date(inq.created_at))}.</p>
            ) : (
              <ol className="space-y-4">
                {events.map((ev) => {
                  const meta = (ev.meta ?? {}) as Meta;
                  const { icon: Icon, title } = eventTitle(ev.type, meta);
                  return (
                    <li key={ev.id} className="flex gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{title}</p>
                        <p className="text-xs text-gray-soft">
                          {dateFmt.format(new Date(ev.created_at))}
                          {ev.author_email ? ` · ${ev.author_email}` : ""}
                        </p>
                        {ev.type === "email" && ev.body ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-forest hover:underline">
                              {meta.subject ? String(meta.subject) : "Zobrazit text e-mailu"}
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-3 font-sans text-sm text-charcoal">{ev.body}</pre>
                          </details>
                        ) : ev.body ? (
                          <p className="mt-1 whitespace-pre-line rounded-lg bg-paper p-3 text-sm text-charcoal">{ev.body}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
                    <Mail className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">Poptávka přijata z webu</p>
                    <p className="text-xs text-gray-soft">
                      {dateFmt.format(new Date(inq.created_at))} · zákazníkovi odesláno potvrzení
                    </p>
                  </div>
                </li>
              </ol>
            )}
          </section>
        </div>

        {/* ── Pravý sloupec ────────────────────────────────────────── */}
        <div className="space-y-6">
          <ToastForm action={saveInquiryQuoteAction} success="Nabídka uložena" className={cn(card, "space-y-3")}>
            <input type="hidden" name="id" value={inq.id} />
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Banknote className="size-5 text-forest" /> Nabídka
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className={legend}>Cena celkem</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={inq.quote_amount !== null ? (inq.quote_amount / 100).toString() : ""}
                  placeholder="např. 24900"
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Měna</span>
                <select name="currency" defaultValue={inq.quote_currency ?? (inq.locale === "cs" ? "CZK" : "EUR")} className={input}>
                  <option>CZK</option>
                  <option>EUR</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>Platnost do</span>
              <input type="date" name="valid_until" defaultValue={inq.quote_valid_until ?? ""} className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>Číslo nabídky (interní, i jako VS)</span>
              <input name="number" defaultValue={inq.quote_number ?? ""} placeholder="např. N2026-014" className={input} />
            </label>
            {inq.status !== "quoted" && (
              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input type="checkbox" name="mark_quoted" className="size-4 accent-forest" />
                Přepnout stav na „Nabídka odeslána“
              </label>
            )}
            <p className="text-xs text-gray-soft">
              Částka a platnost se doplní do e-mailu „Cenová nabídka“ a „Potvrzení objednání“.
            </p>
            <button className={btn}>Uložit nabídku</button>
          </ToastForm>

          <ToastForm action={setInquiryFollowUpAction} success="Termín uložen" className={cn(card, "space-y-3")}>
            <input type="hidden" name="id" value={inq.id} />
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <CalendarClock className="size-5 text-forest" /> Další kontakt
            </h2>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>Připomenout dne</span>
              <input type="date" name="follow_up_at" defaultValue={inq.follow_up_at ?? ""} className={input} />
            </label>
            <p className="text-xs text-gray-soft">
              Po tomto datu se poptávka v seznamu zvýrazní jako „ke kontaktování“. Prázdné = bez připomínky.
            </p>
            <button className={btn}>Uložit</button>
          </ToastForm>

          <ToastForm action={addInquiryNoteAction} success="Poznámka přidána" className={cn(card, "space-y-3")}>
            <input type="hidden" name="id" value={inq.id} />
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <StickyNote className="size-5 text-forest" /> Interní poznámka
            </h2>
            <textarea
              name="body"
              rows={4}
              required
              maxLength={5000}
              placeholder="Např. telefonát 11. 9. — chce 6 ks, čeká na schválení rozpočtu…"
              className={input}
            />
            <p className="text-xs text-gray-soft">Zákazník poznámky nevidí. Uloží se do historie.</p>
            <button className={btn}>Přidat poznámku</button>
          </ToastForm>

          <InquiryDangerZone inquiryId={inq.id} anonymized={anonymized} />
        </div>
      </div>
    </div>
  );
}
