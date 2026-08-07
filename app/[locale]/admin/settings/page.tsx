import { createServiceClient } from "@/lib/supabase/service";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { LangFields } from "@/components/admin/lang-fields";
import { Hint } from "@/components/admin/hint";
import { ToastForm } from "@/components/admin/toast";
import { THEMES, isThemeKey, DEFAULT_THEME } from "@/lib/themes";
import {
  saveGeneralAction,
  saveThemeAction,
  saveHeroStyleAction,
  saveComgateAction,
  savePplAction,
  saveZasilkovnaAction,
  saveAiAction,
  saveShippingMethodAction,
  deleteShippingMethodAction,
  savePaymentMethodAction,
  deletePaymentMethodAction,
  saveLegalAction,
  saveAboutAction,
} from "@/lib/admin/actions";

type I18nText = { cs?: string; en?: string; de?: string };

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
  const terms = get("legal.terms") as I18nText;
  const privacy = get("legal.privacy") as I18nText;
  const claims = get("legal.claims") as I18nText;
  const about = get("content.about") as I18nText;
  const appearance = get("appearance.theme") as { theme?: string };
  const activeTheme = isThemeKey(appearance.theme)
    ? appearance.theme
    : DEFAULT_THEME;
  const heroRaw = (get("appearance.hero") as { style?: string }).style;
  const heroStyle =
    heroRaw === "logo" || heroRaw === "logo-dark" ? heroRaw : "light";

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 font-display text-3xl font-bold">Nastavení</h1>

      <AdminTabs
        tabs={["Vzhled", "Obchod", "Integrace", "Doprava", "Platby", "Právní", "O nás"]}
      >
        {/* ── Vzhled ─────────────────────────────────────────────── */}
        <div className="space-y-6">
        <ToastForm action={saveThemeAction} className={`${card} space-y-4`}>
          <div>
            <h2 className="font-display text-lg font-semibold">
              Barevná varianta webu
            </h2>
            <p className="text-sm text-gray-soft">
              Dočasné ladění barev podle loga. Vybraná varianta se projeví na
              celém webu pro všechny návštěvníky.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {THEMES.map((t) => (
              <label
                key={t.key}
                className="flex cursor-pointer gap-3 rounded-xl border border-cream-dark p-3 transition-colors has-[:checked]:border-forest has-[:checked]:bg-forest/5 has-[:checked]:ring-2 has-[:checked]:ring-forest/25"
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.key}
                  defaultChecked={activeTheme === t.key}
                  className="sr-only"
                />
                <span className="mt-0.5 flex shrink-0 gap-1">
                  {[t.swatch.primary, t.swatch.light, t.swatch.accent, t.swatch.bg].map(
                    (c, i) => (
                      <span
                        key={i}
                        className="size-6 rounded-full border border-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ),
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {t.name}
                  </span>
                  <span className="block text-xs text-gray-soft">
                    {t.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <button className={saveBtn}>Uložit vzhled</button>
        </ToastForm>

        <ToastForm action={saveHeroStyleAction} className={`${card} space-y-4`}>
          <div>
            <h2 className="font-display text-lg font-semibold">
              Styl carouselu na homepage
            </h2>
            <p className="text-sm text-gray-soft">
              Barevné pojetí hlavního carouselu na úvodní stránce.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                key: "light",
                name: "Světlý",
                description: "Světlé pozadí, tmavý text – vzdušný vzhled.",
                bg: "#f2f5ee",
                fg: "#1b1f17",
              },
              {
                key: "logo",
                name: "Barva loga",
                description: "Zelená z loga (#77ad2e), tmavý text a tmavé prvky.",
                bg: "#77ad2e",
                fg: "#1a2d12",
              },
              {
                key: "logo-dark",
                name: "Barva loga tmavá",
                description: "Tmavě zelené pozadí, světlý text, zlaté akcenty.",
                bg: "#1a2d12",
                fg: "#f7f4ef",
              },
            ].map((o) => (
              <label
                key={o.key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-cream-dark p-3 transition-colors has-[:checked]:border-forest has-[:checked]:bg-forest/5 has-[:checked]:ring-2 has-[:checked]:ring-forest/25"
              >
                <input
                  type="radio"
                  name="hero"
                  value={o.key}
                  defaultChecked={heroStyle === o.key}
                  className="sr-only"
                />
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-lg border border-black/10 text-xs font-bold"
                  style={{ backgroundColor: o.bg, color: o.fg }}
                >
                  Aa
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {o.name}
                  </span>
                  <span className="block text-xs text-gray-soft">
                    {o.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <button className={saveBtn}>Uložit styl carouselu</button>
        </ToastForm>
        </div>

        {/* ── Obchod ─────────────────────────────────────────────── */}
        <ToastForm action={saveGeneralAction} className={`${card} space-y-4`}>
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

          <p className="text-sm text-gray-soft">
            Identifikace prodejce (povinné údaje na webu) — zobrazí se na
            právních stránkách a v patičce.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={legend}>IČO</span>
              <input name="ico" defaultValue={String(general.ico ?? "")} className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>DIČ (je-li plátce DPH)</span>
              <input name="dic" defaultValue={String(general.dic ?? "")} className={input} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={legend}>Sídlo / adresa</span>
              <input name="address" defaultValue={String(general.address ?? "")} className={input} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={legend}>
                Zápis v rejstříku (např. živnostenský rejstřík — město)
              </span>
              <input name="registration" defaultValue={String(general.registration ?? "")} className={input} />
            </label>
          </div>
          <button className={saveBtn}>Uložit</button>
        </ToastForm>

        {/* ── Integrace ──────────────────────────────────────────── */}
        <div className="space-y-6">
          <Hint>
            API klíče se ukládají zabezpečeně v databázi a používají se výhradně
            na serveru (nikdy se neposílají do prohlížeče). Doplníš je až budeš
            mít smlouvu u jednotlivých poskytovatelů.
          </Hint>

          <ToastForm action={saveComgateAction} className={`${card} space-y-3`}>
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
          </ToastForm>

          <ToastForm action={savePplAction} className={`${card} space-y-3`}>
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
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Typ produktu</span>
                <input name="productType" defaultValue={String(ppl.productType ?? "")} placeholder="BUSINESS" className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Odesílatel — název</span>
                <input name="senderName" defaultValue={String(ppl.senderName ?? "")} className={input} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Odesílatel — ulice</span>
                <input name="senderStreet" defaultValue={String(ppl.senderStreet ?? "")} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Město</span>
                <input name="senderCity" defaultValue={String(ppl.senderCity ?? "")} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>PSČ</span>
                <input name="senderZip" defaultValue={String(ppl.senderZip ?? "")} className={input} />
              </label>
            </div>
            <button className={saveBtn}>Uložit PPL</button>
          </ToastForm>

          <ToastForm action={saveZasilkovnaAction} className={`${card} space-y-3`}>
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
            <label className="flex flex-col gap-1.5">
              <span className={legend}>ID dopravce — doručení na adresu</span>
              <input
                name="homeCarrierId"
                defaultValue={String(zas.homeCarrierId ?? "")}
                placeholder="např. 106 (Zásilkovna domů CZ)"
                className={input}
              />
              <span className="text-xs text-gray-soft">
                Potřeba jen pro doručení na adresu; pro výdejní místa se
                nevyplňuje. ID zjistíš z ceníku / nastavení Zásilkovny.
              </span>
            </label>
            <button className={saveBtn}>Uložit Zásilkovnu</button>
          </ToastForm>

          <ToastForm action={saveAiAction} className={`${card} space-y-3`}>
            <div>
              <h2 className="font-display text-lg font-semibold">AI překlady</h2>
              <p className="text-sm text-gray-soft">
                Překlady (tlačítko „Přeložit z ČJ") běží přes{" "}
                <strong>Vercel AI Gateway</strong>. Nastav na Vercelu proměnnou{" "}
                <code>AI_GATEWAY_API_KEY</code> (a volitelně model přes{" "}
                <code>AI_GATEWAY_MODEL</code>, výchozí{" "}
                <code>anthropic/claude-haiku-4.5</code>). Pole níže je zastaralé
                (přímý Anthropic klíč) a už se nepoužívá.
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
          </ToastForm>
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

        {/* ── Právní ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Hint>
            Text se zobrazí na stránkách v patičce (Obchodní podmínky, Zpracování
            osobních údajů). Piš prostý text — odstavce oddělíš prázdným řádkem.
            Prázdné pole = návštěvníkovi se ukáže jen upozornění „dokument
            připravujeme". EN/DE můžeš doplnit tlačítkem AI překladu.
          </Hint>

          <ToastForm action={saveLegalAction} className={`${card} space-y-4`}>
            <input type="hidden" name="doc" value="terms" />
            <h2 className="font-display text-lg font-semibold">
              Obchodní podmínky
            </h2>
            <LangFields
              fields={[
                { name: "content", label: "Obsah", type: "rich", values: terms },
              ]}
            />
            <button className={saveBtn}>Uložit obchodní podmínky</button>
          </ToastForm>

          <ToastForm action={saveLegalAction} className={`${card} space-y-4`}>
            <input type="hidden" name="doc" value="privacy" />
            <h2 className="font-display text-lg font-semibold">
              Zpracování osobních údajů
            </h2>
            <LangFields
              fields={[
                { name: "content", label: "Obsah", type: "rich", values: privacy },
              ]}
            />
            <button className={saveBtn}>Uložit GDPR</button>
          </ToastForm>

          <ToastForm action={saveLegalAction} className={`${card} space-y-4`}>
            <input type="hidden" name="doc" value="claims" />
            <h2 className="font-display text-lg font-semibold">
              Reklamační řád
            </h2>
            <LangFields
              fields={[
                { name: "content", label: "Obsah", type: "rich", values: claims },
              ]}
            />
            <button className={saveBtn}>Uložit reklamační řád</button>
          </ToastForm>
        </div>

        {/* ── O nás ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Hint>
            Text stránky „O nás" (zobrazí se na /o-nas). Můžeš přidávat nadpisy,
            odkazy i <strong>obrázky</strong> (ikona obrázku v liště editoru).
            EN/DE doplníš tlačítkem AI překladu.
          </Hint>
          <ToastForm action={saveAboutAction} className={`${card} space-y-4`}>
            <h2 className="font-display text-lg font-semibold">
              Stránka „O nás"
            </h2>
            <LangFields
              fields={[
                { name: "content", label: "Obsah", type: "rich", values: about },
              ]}
            />
            <button className={saveBtn}>Uložit stránku O nás</button>
          </ToastForm>
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
        <ToastForm
          action={deleteAction}
          success="Smazáno"
          confirm="Opravdu smazat tuto metodu?"
          className="absolute right-3 top-3"
        >
          <input type="hidden" name="id" value={id} />
          <button
            title="Smazat"
            className="rounded-md px-2 py-1 text-xs text-gray-soft hover:bg-error/10 hover:text-error"
          >
            Smazat
          </button>
        </ToastForm>
      )}
    </div>
  );
}

function ShippingCard({ m }: { m?: any }) {
  return (
    <MethodShell id={m?.id} deleteAction={deleteShippingMethodAction}>
      <ToastForm action={saveShippingMethodAction} className="space-y-3">
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pickup_point" defaultChecked={m?.pickup_point ?? false} className="size-4 accent-forest" />
          Výdejní místo (spustí Zásilkovna widget v pokladně)
        </label>
        <button className={saveBtn}>{m ? "Uložit" : "Přidat"}</button>
      </ToastForm>
    </MethodShell>
  );
}

function PaymentCard({ m }: { m?: any }) {
  return (
    <MethodShell id={m?.id} deleteAction={deletePaymentMethodAction}>
      <ToastForm action={savePaymentMethodAction} className="space-y-3">
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
      </ToastForm>
    </MethodShell>
  );
}
