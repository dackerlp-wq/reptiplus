import { Box, Gift, PackageCheck, Pencil, Plus, Truck } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { SHIP_COUNTRIES, shippingPriceFor, FREE_SHIPPING_COUNTRIES, type ShippingPriceMethod } from "@/lib/shipping/price";
import { getBoxes } from "@/lib/shipping/boxes";
import { formatPrice } from "@/lib/i18n";
import { LangFields } from "@/components/admin/lang-fields";
import { ToastForm } from "@/components/admin/toast";
import { saveShippingMethodGridAction, saveBoxesAction } from "@/lib/admin/shipping-admin-actions";
import { deleteShippingMethodAction, saveShippingSettingsAction } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

const COUNTRY_NAME: Record<string, string> = { CZ: "Česko", SK: "Slovensko", DE: "Německo", AT: "Rakousko", PL: "Polsko" };
const CARRIER_NAME: Record<string, string> = {
  zasilkovna: "Zásilkovna",
  ppl: "PPL",
  balikovna: "Balíkovna",
  personal: "Osobní odběr",
  other: "Jiné",
};

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const card = "rounded-xl border border-cream-dark bg-white p-5";
const saveBtn = "rounded-lg bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-light";
const minor = (v: number | null | undefined) => (v == null ? "" : String(v / 100));
const czk = (m: number) => formatPrice(m, "cs");

type Method = ShippingPriceMethod & {
  id: string;
  code: string;
  name_i18n: Record<string, string> | null;
  carrier: string;
  is_active: boolean;
  pickup_point: boolean;
  sort_order: number;
  countries: string[] | null;
};

const offeredIn = (m: Method, c: string) => !m.countries || m.countries.length === 0 || m.countries.includes(c);

export default async function AdminShippingPage() {
  const svc = createServiceClient();
  const [{ data }, boxes, { data: settingsRow }] = await Promise.all([
    svc.from("shipping_method").select("*").order("sort_order"),
    getBoxes(),
    svc.from("app_setting").select("value").eq("key", "shipping.settings").maybeSingle(),
  ]);
  const methods = (data ?? []) as unknown as Method[];
  const shippingSettings = (settingsRow?.value ?? {}) as { freeFromCzk?: number | null; freeFromEur?: number | null };

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Doprava</h1>
        <p className="mt-1 text-sm text-gray-soft">
          Ceny dopravy podle země a hmotnosti, krabice pro balení a doprava zdarma. Přístupy k API Zásilkovny a PPL
          jsou v Nastavení → Integrace.
        </p>
      </div>

      {/* ── Přehled ────────────────────────────────────────────── */}
      <section className={card}>
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
          <Truck className="size-5 text-forest" /> Přehled cen
        </h2>
        <p className="mb-4 text-sm text-gray-soft">
          Cena v Kč vč. DPH: <strong>lehký / těžký balík</strong>. U výdejního místa rozhoduje země pobočky, u doručení
          domů země adresy. „—“ = v zemi se nenabízí.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark text-left">
                <th className="py-2 pr-3 font-semibold">Doprava</th>
                {SHIP_COUNTRIES.map((c) => (
                  <th key={c} className="px-2 py-2 text-center font-semibold">
                    {COUNTRY_NAME[c]}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.id} className={`border-b border-cream last:border-0 ${m.is_active ? "" : "opacity-50"}`}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink">{m.name_i18n?.cs || m.code}</p>
                    <p className="text-xs text-gray-soft">
                      {CARRIER_NAME[m.carrier] ?? m.carrier}
                      {m.pickup_point && " · výdejní místo"}
                      {m.heavy_from_kg ? ` · těžký nad ${String(m.heavy_from_kg).replace(".", ",")} kg` : ""}
                      {!m.is_active && " · neaktivní"}
                    </p>
                  </td>
                  {SHIP_COUNTRIES.map((c) => {
                    if (!offeredIn(m, c))
                      return (
                        <td key={c} className="px-2 text-center text-gray-soft">
                          —
                        </td>
                      );
                    const light = shippingPriceFor(m, 0, "CZK", c);
                    const heavy = m.heavy_from_kg ? shippingPriceFor(m, Number(m.heavy_from_kg) + 1, "CZK", c) : light;
                    return (
                      <td key={c} className="whitespace-nowrap px-2 text-center font-mono text-xs tabular-nums">
                        {light === 0 ? "zdarma" : czk(light)}
                        {heavy !== light && <span className="text-gray-soft"> / {czk(heavy)}</span>}
                      </td>
                    );
                  })}
                  <td className="pl-2 text-right">
                    <a href={`#m-${m.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
                      <Pencil className="size-3" /> Upravit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Doprava zdarma ─────────────────────────────────────── */}
      <ToastForm action={saveShippingSettingsAction} className={`${card} space-y-3`}>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Gift className="size-5 text-forest" /> Doprava zdarma
        </h2>
        <p className="text-sm text-gray-soft">
          Od této hodnoty zboží je doprava zdarma — jen do zemí {FREE_SHIPPING_COUNTRIES.map((c) => COUNTRY_NAME[c]).join(" a ")}
          (do zahraničí se vždy platí). Prázdné = vypnuto.
        </p>
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Od částky (Kč)</span>
            <input name="freeFromCzk" inputMode="decimal" defaultValue={minor(shippingSettings.freeFromCzk)} placeholder="např. 2000" className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Od částky (€)</span>
            <input name="freeFromEur" inputMode="decimal" defaultValue={minor(shippingSettings.freeFromEur)} placeholder="např. 80" className={input} />
          </label>
        </div>
        <button className={saveBtn}>Uložit</button>
      </ToastForm>

      {/* ── Úprava metod ───────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Způsoby dopravy</h2>
        {methods.map((m) => (
          <MethodEditor key={m.id} m={m} />
        ))}
        <details className={card}>
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-forest">
            <Plus className="size-4" /> Přidat způsob dopravy
          </summary>
          <div className="mt-4">
            <MethodEditor />
          </div>
        </details>
      </section>

      {/* ── Krabice ────────────────────────────────────────────── */}
      <ToastForm action={saveBoxesAction} className={`${card} space-y-3`}>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Box className="size-5 text-forest" /> Krabice pro balení
        </h2>
        <p className="text-sm text-gray-soft">
          Při odesílání objednávky vybereš krabici a rozměry se vyplní samy; hmotnost krabice se přičte k odhadu. Pro
          smazání vymaž název.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-soft">
                <th className="pb-1 pr-2 font-semibold">Název</th>
                <th className="px-1 pb-1 font-semibold">Délka cm</th>
                <th className="px-1 pb-1 font-semibold">Šířka cm</th>
                <th className="px-1 pb-1 font-semibold">Výška cm</th>
                <th className="px-1 pb-1 font-semibold">Hmotnost krabice kg</th>
              </tr>
            </thead>
            <tbody>
              {[...boxes, ...Array.from({ length: 3 }, () => null)].map((b, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input name="box_name" defaultValue={b?.name ?? ""} placeholder={b ? "" : "nová krabice"} className={input} />
                  </td>
                  {(["lengthCm", "widthCm", "heightCm", "weightKg"] as const).map((k, j) => (
                    <td key={k} className="px-1 py-1">
                      <input
                        name={["box_l", "box_w", "box_h", "box_kg"][j]}
                        inputMode="decimal"
                        defaultValue={b ? String(b[k]).replace(".", ",") : ""}
                        className={input}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className={saveBtn}>Uložit krabice</button>
      </ToastForm>

      <p className="flex items-center gap-2 text-xs text-gray-soft">
        <PackageCheck className="size-4" /> Podmínky balíků (max. hmotnost a rozměry) podle ceníku Zásilkovny kontroluje panel
        „Zabalit a odeslat“ v detailu objednávky.
      </p>
    </div>
  );
}

/** Úprava jednoho způsobu dopravy: základní údaje + mřížka cen podle země. */
function MethodEditor({ m }: { m?: Method }) {
  const cp = (m?.country_prices ?? {}) as Record<string, Record<string, number | null>>;
  const value = (c: string, k: "price_czk" | "price_eur" | "heavy_price_czk" | "heavy_price_eur") =>
    c === "CZ" ? minor(m?.[k] as number | null | undefined) : minor(cp[c]?.[k]);

  return (
    <div id={m ? `m-${m.id}` : undefined} className={m ? `${card} scroll-mt-20` : ""}>
      <ToastForm action={saveShippingMethodGridAction} className="space-y-4">
        {m && <input type="hidden" name="id" value={m.id} />}
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Kód</span>
            <input name="code" required defaultValue={m?.code ?? ""} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Dopravce</span>
            <select name="carrier" defaultValue={m?.carrier ?? "zasilkovna"} className={input}>
              {Object.entries(CARRIER_NAME).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Pořadí</span>
            <input name="sort_order" inputMode="numeric" defaultValue={m?.sort_order ?? 0} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Těžký balík nad (kg)</span>
            <input name="heavy_from_kg" inputMode="decimal" defaultValue={m?.heavy_from_kg ?? ""} placeholder="např. 5" className={input} />
          </label>
        </div>
        <LangFields compact fields={[{ name: "name", label: "Název v pokladně", values: m?.name_i18n ?? undefined }]} />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={m?.is_active ?? true} className="size-4 accent-forest" />
            Aktivní
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="pickup_point" defaultChecked={m?.pickup_point ?? false} className="size-4 accent-forest" />
            Výdejní místo (v pokladně otevře mapu Zásilkovny)
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-soft">
                <th className="pb-1 pr-2 font-semibold">Země</th>
                <th className="px-1 pb-1 text-center font-semibold">Nabízet</th>
                <th className="px-1 pb-1 font-semibold">Kč</th>
                <th className="px-1 pb-1 font-semibold">€</th>
                <th className="px-1 pb-1 font-semibold">Těžký Kč</th>
                <th className="px-1 pb-1 font-semibold">Těžký €</th>
              </tr>
            </thead>
            <tbody>
              {SHIP_COUNTRIES.map((c) => (
                <tr key={c}>
                  <td className="py-1 pr-2 whitespace-nowrap">
                    {COUNTRY_NAME[c]}
                    {c === "CZ" && <span className="block text-[11px] text-gray-soft">základní cena</span>}
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input
                      type="checkbox"
                      name={`offer_${c}`}
                      defaultChecked={m ? !m.countries || m.countries.length === 0 || m.countries.includes(c) : c === "CZ" || c === "SK"}
                      className="size-4 accent-forest"
                    />
                  </td>
                  {(["price_czk", "price_eur", "heavy_price_czk", "heavy_price_eur"] as const).map((k) => (
                    <td key={k} className="px-1 py-1">
                      <input
                        name={`p_${c}_${k}`}
                        inputMode="decimal"
                        defaultValue={value(c, k)}
                        placeholder={c === "CZ" ? "" : "jako CZ"}
                        className={input}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-gray-soft">
            Prázdná cena u země = stejná jako Česko. Těžká cena platí nad limitem hmotnosti košíku (hmotnost produktů).
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button className={saveBtn}>{m ? "Uložit" : "Přidat"}</button>
        </div>
      </ToastForm>
      {m && (
        <ToastForm
          action={deleteShippingMethodAction}
          success="Smazáno"
          confirm="Opravdu smazat tento způsob dopravy?"
          className="mt-2 text-right"
        >
          <input type="hidden" name="id" value={m.id} />
          <button className="text-xs text-gray-soft hover:text-error">Smazat způsob dopravy</button>
        </ToastForm>
      )}
    </div>
  );
}
