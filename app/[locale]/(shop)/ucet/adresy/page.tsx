import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { requireCustomer, getAddresses } from "@/lib/account/queries";
import { AddressManager, type AddressItem } from "@/components/reptiplus/account/address-manager";

export default async function AccountAddressesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account");
  const { supabase } = await requireCustomer(locale);
  const addresses = (await getAddresses(supabase)) as AddressItem[];
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">{t("addresses")}</h2>
      <AddressManager addresses={addresses} />
    </div>
  );
}
