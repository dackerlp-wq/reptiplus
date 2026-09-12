"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star, Loader2, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  saveAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  type AccountState,
} from "@/lib/account/actions";

export type AddressItem = {
  id: string;
  type: "billing" | "shipping";
  label: string | null;
  full_name: string | null;
  company: string | null;
  ico: string | null;
  dic: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  is_default: boolean;
};

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const field = "flex flex-col gap-1.5";

const ERR_KEY: Record<string, string> = {
  AUTH: "errAuth",
  ADDRESS: "errAddress",
  SERVER: "errServer",
};

/** Formulář adresy (nová / úprava). */
export function AddressForm({
  address,
  onDone,
}: {
  address?: AddressItem | null;
  onDone: () => void;
}) {
  const t = useTranslations("Account");
  const tc = useTranslations("Checkout");
  const [state, action, pending] = useActionState<AccountState, FormData>(saveAddressAction, undefined);
  const [company, setCompany] = useState(Boolean(address?.company || address?.ico));

  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-forest/30 bg-white p-5">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          <span className={legend}>{t("addressLabel")}</span>
          <input name="label" defaultValue={address?.label ?? ""} className={input} />
        </label>
        <label className={field}>
          <span className={legend}>{t("addressType")}</span>
          <select name="type" defaultValue={address?.type ?? "shipping"} className={input}>
            <option value="shipping">{t("typeShipping")}</option>
            <option value="billing">{t("typeBilling")}</option>
          </select>
        </label>
        <label className={`${field} sm:col-span-2`}>
          <span className={legend}>{tc("fullName")}</span>
          <input name="full_name" required defaultValue={address?.full_name ?? ""} className={input} />
        </label>
        <label className={`${field} sm:col-span-2`}>
          <span className={legend}>{tc("street")}</span>
          <input name="street" required defaultValue={address?.street ?? ""} className={input} />
        </label>
        <label className={field}>
          <span className={legend}>{tc("city")}</span>
          <input name="city" required defaultValue={address?.city ?? ""} className={input} />
        </label>
        <label className={field}>
          <span className={legend}>{tc("postalCode")}</span>
          <input name="postal_code" required defaultValue={address?.postal_code ?? ""} className={input} />
        </label>
        <label className={field}>
          <span className={legend}>{tc("country")}</span>
          <select name="country" defaultValue={address?.country ?? "CZ"} className={input}>
            <option value="CZ">{tc("countryCZ")}</option>
            <option value="SK">{tc("countrySK")}</option>
          </select>
        </label>
        <label className={field}>
          <span className={legend}>{tc("phone")}</span>
          <input name="phone" type="tel" defaultValue={address?.phone ?? ""} className={input} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={company} onChange={(e) => setCompany(e.target.checked)} className="size-4 accent-forest" />
        <Building2 className="size-4 text-gray-soft" /> {tc("companyToggle")}
      </label>
      {company && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={field}>
            <span className={legend}>{t("company")}</span>
            <input name="company" defaultValue={address?.company ?? ""} className={input} />
          </label>
          <label className={field}>
            <span className={legend}>{t("ico")}</span>
            <input name="ico" defaultValue={address?.ico ?? ""} className={input} />
          </label>
          <label className={field}>
            <span className={legend}>{t("dic")}</span>
            <input name="dic" defaultValue={address?.dic ?? ""} className={input} />
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="is_default" defaultChecked={address?.is_default ?? false} className="size-4 accent-forest" />
        {t("isDefault")}
      </label>

      {state?.error && <p className="text-sm text-error">{t(ERR_KEY[state.error] ?? "errServer")}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} {t("save")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-cream">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Seznam adres + přidání / úprava / smazání / výchozí. */
export function AddressManager({ addresses }: { addresses: AddressItem[] }) {
  const t = useTranslations("Account");
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing !== "new" && (
        <p className="rounded-xl border border-cream-dark bg-white p-6 text-sm text-gray-soft">{t("noAddresses")}</p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="sm:col-span-2">
              <AddressForm address={a} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={a.id} className={cn("rounded-xl border bg-white p-5", a.is_default ? "border-forest/40" : "border-cream-dark")}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-cream px-2 py-0.5 text-xs font-semibold text-charcoal">
                  {a.type === "billing" ? t("typeBilling") : t("typeShipping")}
                </span>
                {a.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest">
                    <Star className="size-3" /> {t("default")}
                  </span>
                )}
                {a.label && <span className="text-xs text-gray-soft">{a.label}</span>}
              </div>
              <p className="text-sm text-ink">
                <span className="font-semibold">{a.full_name}</span>
                {a.company && (
                  <>
                    <br />
                    {a.company}
                    {a.ico ? ` · ${t("ico")} ${a.ico}` : ""}
                    {a.dic ? ` · ${t("dic")} ${a.dic}` : ""}
                  </>
                )}
                <br />
                {a.street}
                <br />
                {a.postal_code} {a.city}, {a.country}
                {a.phone && (
                  <>
                    <br />
                    {a.phone}
                  </>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <button type="button" onClick={() => setEditing(a.id)} className="inline-flex items-center gap-1 font-semibold text-forest hover:underline">
                  <Pencil className="size-3.5" /> {t("editAddress")}
                </button>
                {!a.is_default && (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="inline-flex items-center gap-1 font-semibold text-forest hover:underline">
                      <Star className="size-3.5" /> {t("setDefault")}
                    </button>
                  </form>
                )}
                <form
                  action={deleteAddressAction}
                  onSubmit={(e) => {
                    if (!window.confirm(t("confirmDelete"))) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={a.id} />
                  <button className="inline-flex items-center gap-1 font-semibold text-error hover:underline">
                    <Trash2 className="size-3.5" /> {t("deleteAddress")}
                  </button>
                </form>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <AddressForm onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
        >
          <Plus className="size-4" /> {t("addAddress")}
        </button>
      )}
    </div>
  );
}
