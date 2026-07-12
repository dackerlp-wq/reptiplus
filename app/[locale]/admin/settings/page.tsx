import { createServiceClient } from "@/lib/supabase/service";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { LangFields } from "@/components/admin/lang-fields";
import { Hint } from "@/components/admin/hint";
import {
  saveGeneralAction,
  saveComgateAction,
  savePplAction,
  saveZasilkovnaAction,
  saveAiAction,
  saveShippingMethodAction,
  deleteShippingMethodAction,
  savePaymentMethodAction,
  deletePaymentMethodAction,
} from "@/lib/admin/actions";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const card = "rounded-xl border border-cream-dark bg-white p-6";
const saveBtn =
  "rounded-lg bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-light";
const minor = (v: number | null | undefined) => (v == null ? "" : String(v / 100));

export default async function AdminSettingsPage() {
  const svc = createServiceClient();
  const [{ data: settings }, { data: shipping }, { data: payments }] =
    await Promise.all([
      svc.from("app_setting").select("key,value"),
      svc.from("shipping_method").select("*").order("sort_order"),
      svc.from("payment_method").select("*").order("sort_order"),
    ]);

  const get = (k: string): Record<string, unknown> =>
    (settings?.find((s) => s.key === k)?.value as Record<string, unknown>) ?? {};
  const general = get("shop.general");
  const comgate = get("integrations.comgate");
  const ppl = get("integrations.ppl");
  const zas = get("integrations.zasilkovna");
  const ai = get("integrations.ai");

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 font-display text-3xl font-bold">Nastavení</h1>

      <AdminTabs tabs={["Obchod", "Integrace", "Doprava", "Platby"]}>
        {/* ── Obchod ─────────────────────────────────────────────── */}
        <form action={saveGeneralAction} className={`${card} space-y-4`}>
          <div>
            <h2 className="font-display text-lg font-semibold">Údaje obchodu</h2>
            <p className="text-sm text-gray-soft">
              Základní kontaktní údaje zobrazované zákazníkům.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={legend}>Název</span>
              <input name="name" defaultValue={String(general.name ?? "")} className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>E-mail</span>
              <input name="email" type="email" defaultValue={String(general.email ?? "")} className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>Telefon</span>
              <input name="phone" defaultValue={String(general.phone ?? "")} className={input} />
            </label>
          </div>
          <button className={saveBtn}>Uložit</button>
        </form>

        {/* ── Integrace ──────────────────────────────────────────── */}
        <div className="space-y-6">
          <Hint>
            API klíče se ukládají zabezpečeně v databázi a používají se výhradně
            na serveru (nikdy se neposílají do prohlížeče). Doplníš je až budeš
            mít smlouvu u jednotlivých poskytovatelů.
          </Hint>

          <form action={saveComgateAction} className={`${card} space-y-3`}>
            <div>
              <h2 className="font-display text-lg font-semibold">Comgate</h2>
              <p className="text-sm text-gray-soft">
                Platební brána (karty, Apple/Google Pay, bankovní tlačítka).
                Údaje najdeš v Comgate portálu → Obchody → Napojení eshopu.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Merchant ID</span>
                <input name="merchant" defaultValue={String(comgate.merchant ?? "")} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Secret</span>
                <input name="secret" type="password" defaultValue={String(comgate.secret ?? "")} className={input} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="test" defaultChecked={Boolean(comgate.test)} className="size-4 accent-forest" />
              Testovací režim (platby se neúčtují)
            </label>
            <button className={saveBtn}>Uložit Comgate</button>
          </form>

          <form action={savePplAction} className={`${card} space-y-3`}>
            <div>
              <h2 className="font-display text-lg font-semibold">PPL</h2>
              <p className="text-sm text-gray-soft">
                Doručení na adresu a výdejní místa. Klíče získáš přes PPL
                CPL API (myAPI) po aktivaci u obchodního zástupce.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Client ID</span>
                <input name="clientId" defaultValue={String(ppl.clientId ?? "")} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Client Secret</span>
                <input name="clientSecret" type="password" defaultValue={String(ppl.clientSecret ?? "")} className={input} />
              </label>
            </div>
            <button className={saveBtn}>Uložit PPL</button>
          </form>

          <form action={saveZasilkovnaAction} className={`${card} space-y-3`}>
            <div>
              <h2 className="font-display text-lg font-semibold">Zásilkovna (Packeta)</h2>
              <p className="text-sm text-gray-soft">
                Výdejní místa a doručení. API klíč a heslo najdeš v Klientské
                sekci Zásilkovny → Nastavení → API.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className={legend}>API klíč</span>
                <input name="apiKey" defaultValue={String(zas.apiKey ?? "")} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>API heslo</span>
                <input name="apiPassword" type="password" defaultValue={String(zas.apiPassword ?? "")} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Eshop ID</span>
                <input name="eshopId" defaultValue={String(zas.eshopId ?? "")} className={input} />
              </label>
            </div>
            <button className={saveBtn}>Uložit Zásilkovnu</button>
          </form>

          <form action={saveAiAction} className={`${card} space-y-3`}>
            <div>
              <h2 className="font-display text-lg font-semibold">AI překlady</h2>
              <p className="text-sm text-gray-soft">
                Klíč pro automatický překlad textů (tlačítko „Přeložit z ČJ" u
                produktů, kategorií, značek). Vlož Anthropic API klíč z
                console.anthropic.com. Bez klíče tlačítko překladu nefunguje.
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>Anthropic API klíč</span>
              <input
                name="anthropicKey"
                type="password"
                placeholder="sk-ant-..."
                defaultValue={String(ai.anthropicKey ?? "")}
                className={input}
              />
            </label>
            <button className={saveBtn}>Uložit AI klíč</button>
          </form>
        </div>

        {/* ── Doprava ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Hint>
            Způsoby dopravy nabízené v pokladně. Cenu zadáváš v Kč i €; pro
            zákazníka se zobrazí podle jeho jazyka. Neaktivní metody se v
            pokladně nenabízejí.
          </Hint>
          {(shipping ?? []).map((m) => (
            <ShippingCard key={m.id} m={m} />
          ))}
          <div className={card}>
            <p className="mb-3 font-display font-semibold">Přidat dopravu</p>
            <ShippingCard />
          </div>
        </div>

        {/* ── Platby ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Hint>
            Platební metody v pokladně. Poplatek (např. dobírka) se přičte k
            objednávce. Comgate metody vyžadují vyplněné klíče v záložce
            Integrace.
          </Hint>
          {(payments ?? []).map((m) => (
            <PaymentCard key={m.id} m={m} />
          ))}
          <div className={card}>
            <p className="mb-3 font-display font-semibold">Přidat platbu</p>
            <PaymentCard />
          </div>
        </div>
      </AdminTabs>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function MethodShell({
  children,
  deleteAction,
  id,
}: {
  children: React.ReactNode;
  deleteAction?: (fd: FormData) => Promise<void>;
  id?: string;
}) {
  return (
    <div className="relative rounded-xl border border-cream-dark bg-white p-4">
      {children}
      {id && deleteAction && (
        <form action={deleteAction} className="absolute right-3 top-3">
          <input type="hidden" name="id" value={id} />
          <button
            title="Smazat"
            className="rounded-md px-2 py-1 text-xs text-gray-soft hover:bg-error/10 hover:text-error"
          >
            Smazat
          </button>
        </form>
      )}
    </div>
  );
}

function ShippingCard({ m }: { m?: any }) {
  return (
    <MethodShell id={m?.id} deleteAction={deleteShippingMethodAction}>
      <form action={saveShippingMethodAction} className="space-y-3">
        {m && <input type="hidden" name="id" value={m.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Kód</span>
            <input name="code" required defaultValue={m?.code ?? ""} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Dopravce</span>
            <select name="carrier" defaultValue={m?.carrier ?? "other"} className={input}>
              <option value="ppl">PPL</option>
              <option value="zasilkovna">Zásilkovna</option>
              <option value="balikovna">Balíkovna</option>
              <option value="personal">Osobní odběr</option>
              <option value="other">Jiné</option>
            </select>
          </label>
        </div>
        <LangFields compact fields={[{ name: "name", label: "Název", values: m?.name_i18n }]} />
        <div className="grid items-end gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Cena Kč</span>
            <input name="price_czk" inputMode="decimal" defaultValue={minor(m?.price_czk)} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Cena €</span>
            <input name="price_eur" inputMode="decimal" defaultValue={minor(m?.price_eur)} className={input} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={m?.is_active ?? true} className="size-4 accent-forest" />
            Aktivní
          </label>
        </div>
        <button className={saveBtn}>{m ? "Uložit" : "Přidat"}</button>
      </form>
    </MethodShell>
  );
}

function PaymentCard({ m }: { m?: any }) {
  return (
    <MethodShell id={m?.id} deleteAction={deletePaymentMethodAction}>
      <form action={savePaymentMethodAction} className="space-y-3">
        {m && <input type="hidden" name="id" value={m.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Kód</span>
            <input name="code" required defaultValue={m?.code ?? ""} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Poskytovatel</span>
            <select name="provider" defaultValue={m?.provider ?? "comgate"} className={input}>
              <option value="comgate">Comgate</option>
              <option value="cod">Dobírka</option>
              <option value="bank_transfer">Bankovní převod</option>
            </select>
          </label>
        </div>
        <LangFields compact fields={[{ name: "name", label: "Název", values: m?.name_i18n }]} />
        <div className="grid items-end gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Poplatek Kč</span>
            <input name="fee_czk" inputMode="decimal" defaultValue={minor(m?.fee_czk)} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Poplatek €</span>
            <input name="fee_eur" inputMode="decimal" defaultValue={minor(m?.fee_eur)} className={input} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={m?.is_active ?? true} className="size-4 accent-forest" />
            Aktivní
          </label>
        </div>
        <button className={saveBtn}>{m ? "Uložit" : "Přidat"}</button>
      </form>
    </MethodShell>
  );
}
