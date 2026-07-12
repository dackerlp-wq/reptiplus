import { createServiceClient } from "@/lib/supabase/service";
import {
  saveGeneralAction,
  saveComgateAction,
  savePplAction,
  saveZasilkovnaAction,
  saveShippingMethodAction,
  savePaymentMethodAction,
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

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="font-display text-3xl font-bold">Nastavení</h1>

      {/* Obecné */}
      <form action={saveGeneralAction} className={card}>
        <h2 className="mb-4 font-display text-lg font-semibold">Obchod</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Název</span>
            <input name="name" defaultValue={String(general.name ?? "")} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>E-mail</span>
            <input name="email" defaultValue={String(general.email ?? "")} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Telefon</span>
            <input name="phone" defaultValue={String(general.phone ?? "")} className={input} />
          </label>
        </div>
        <button className={`${saveBtn} mt-4`}>Uložit</button>
      </form>

      {/* Integrace / klíče */}
      <div className={card}>
        <h2 className="mb-1 font-display text-lg font-semibold">
          Integrace &amp; API klíče
        </h2>
        <p className="mb-6 text-sm text-gray-soft">
          Klíče se ukládají bezpečně a používají jen na serveru.
        </p>

        <form action={saveComgateAction} className="mb-6 space-y-3">
          <p className={legend}>Comgate (platby)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="merchant" placeholder="Merchant ID" defaultValue={String(comgate.merchant ?? "")} className={input} />
            <input name="secret" placeholder="Secret" defaultValue={String(comgate.secret ?? "")} className={input} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="test" defaultChecked={Boolean(comgate.test)} className="size-4 accent-forest" />
            Testovací režim
          </label>
          <button className={saveBtn}>Uložit Comgate</button>
        </form>

        <form action={savePplAction} className="mb-6 space-y-3 border-t border-cream pt-6">
          <p className={legend}>PPL</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="clientId" placeholder="Client ID" defaultValue={String(ppl.clientId ?? "")} className={input} />
            <input name="clientSecret" placeholder="Client Secret" defaultValue={String(ppl.clientSecret ?? "")} className={input} />
          </div>
          <button className={saveBtn}>Uložit PPL</button>
        </form>

        <form action={saveZasilkovnaAction} className="space-y-3 border-t border-cream pt-6">
          <p className={legend}>Zásilkovna</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="apiKey" placeholder="API klíč" defaultValue={String(zas.apiKey ?? "")} className={input} />
            <input name="apiPassword" placeholder="API heslo" defaultValue={String(zas.apiPassword ?? "")} className={input} />
            <input name="eshopId" placeholder="Eshop ID" defaultValue={String(zas.eshopId ?? "")} className={input} />
          </div>
          <button className={saveBtn}>Uložit Zásilkovnu</button>
        </form>
      </div>

      {/* Doprava */}
      <div className={card}>
        <h2 className="mb-4 font-display text-lg font-semibold">Doprava</h2>
        <div className="space-y-3">
          {(shipping ?? []).map((m) => (
            <ShippingRow key={m.id} m={m} />
          ))}
          <ShippingRow />
        </div>
      </div>

      {/* Platby */}
      <div className={card}>
        <h2 className="mb-4 font-display text-lg font-semibold">Platby</h2>
        <div className="space-y-3">
          {(payments ?? []).map((m) => (
            <PaymentRow key={m.id} m={m} />
          ))}
          <PaymentRow />
        </div>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ShippingRow({ m }: { m?: any }) {
  const n: Record<string, string> = m?.name_i18n ?? {};
  return (
    <form
      action={saveShippingMethodAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-cream p-3"
    >
      {m && <input type="hidden" name="id" value={m.id} />}
      <input name="code" placeholder="kód" defaultValue={m?.code ?? ""} required className={`${input} w-24`} />
      <input name="name_cs" placeholder="Název CZ" defaultValue={n.cs ?? ""} className={`${input} w-40`} />
      <input name="name_en" placeholder="EN" defaultValue={n.en ?? ""} className={`${input} w-28`} />
      <input name="name_de" placeholder="DE" defaultValue={n.de ?? ""} className={`${input} w-28`} />
      <select name="carrier" defaultValue={m?.carrier ?? "other"} className={`${input} w-32`}>
        <option value="ppl">PPL</option>
        <option value="zasilkovna">Zásilkovna</option>
        <option value="balikovna">Balíkovna</option>
        <option value="personal">Osobní odběr</option>
        <option value="other">Jiné</option>
      </select>
      <input name="price_czk" placeholder="Kč" defaultValue={minor(m?.price_czk)} className={`${input} w-20`} />
      <input name="price_eur" placeholder="€" defaultValue={minor(m?.price_eur)} className={`${input} w-20`} />
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" name="is_active" defaultChecked={m?.is_active ?? true} className="size-4 accent-forest" />
        aktivní
      </label>
      <button className="rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-white hover:bg-forest-light">
        {m ? "Uložit" : "Přidat"}
      </button>
    </form>
  );
}

function PaymentRow({ m }: { m?: any }) {
  const n: Record<string, string> = m?.name_i18n ?? {};
  return (
    <form
      action={savePaymentMethodAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-cream p-3"
    >
      {m && <input type="hidden" name="id" value={m.id} />}
      <input name="code" placeholder="kód" defaultValue={m?.code ?? ""} required className={`${input} w-24`} />
      <input name="name_cs" placeholder="Název CZ" defaultValue={n.cs ?? ""} className={`${input} w-40`} />
      <input name="name_en" placeholder="EN" defaultValue={n.en ?? ""} className={`${input} w-28`} />
      <input name="name_de" placeholder="DE" defaultValue={n.de ?? ""} className={`${input} w-28`} />
      <select name="provider" defaultValue={m?.provider ?? "comgate"} className={`${input} w-32`}>
        <option value="comgate">Comgate</option>
        <option value="cod">Dobírka</option>
        <option value="bank_transfer">Převod</option>
      </select>
      <input name="fee_czk" placeholder="Kč" defaultValue={minor(m?.fee_czk)} className={`${input} w-20`} />
      <input name="fee_eur" placeholder="€" defaultValue={minor(m?.fee_eur)} className={`${input} w-20`} />
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" name="is_active" defaultChecked={m?.is_active ?? true} className="size-4 accent-forest" />
        aktivní
      </label>
      <button className="rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-white hover:bg-forest-light">
        {m ? "Uložit" : "Přidat"}
      </button>
    </form>
  );
}
