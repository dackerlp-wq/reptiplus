import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, Building2 } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { getShopContact } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { localizedAlternates } from "@/lib/seo";
import { ContactForm } from "@/components/reptiplus/contact-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("title"), description: t("metaDescription"), alternates: localizedAlternates(locale, "kontakt") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, contact, supabase] = await Promise.all([getTranslations("Contact"), getShopContact(), createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("customer").select("full_name").eq("id", user.id).maybeSingle() : { data: null };

  const rows: { icon: typeof Mail; label: string; value: React.ReactNode }[] = [];
  if (contact.email) rows.push({ icon: Mail, label: t("emailLabel"), value: <a href={`mailto:${contact.email}`} className="hover:text-forest">{contact.email}</a> });
  if (contact.phone) rows.push({ icon: Phone, label: t("phoneLabel"), value: <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="hover:text-forest">{contact.phone}</a> });
  if (contact.address) rows.push({ icon: MapPin, label: t("addressLabel"), value: contact.address });
  if (contact.openingHours) rows.push({ icon: Clock, label: t("hoursLabel"), value: <span className="whitespace-pre-line">{contact.openingHours}</span> });

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-gray-soft">{t("intro")}</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-cream-dark bg-white p-6">
            <p className="font-display text-lg font-semibold">{contact.name}</p>
            <ul className="mt-4 space-y-3 text-sm text-charcoal">
              {rows.map((r) => (
                <li key={r.label} className="flex gap-3">
                  <r.icon className="mt-0.5 size-4 shrink-0 text-forest" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-soft">{r.label}</p>
                    <div>{r.value}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {(contact.ico || contact.dic) && (
            <div className="rounded-xl border border-cream-dark bg-white p-6 text-sm text-charcoal">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-soft">
                <Building2 className="size-4 text-forest" /> {t("companyLabel")}
              </p>
              {contact.ico && <p className="mt-2">IČO: {contact.ico}</p>}
              {contact.dic && <p>DIČ: {contact.dic}</p>}
              {contact.registration && <p className="mt-1 text-xs text-gray-soft">{contact.registration}</p>}
            </div>
          )}
        </aside>
        <div>
          <h2 className="mb-4 font-display text-2xl font-semibold">{t("formTitle")}</h2>
          <ContactForm defaultEmail={user?.email ?? undefined} defaultName={profile?.full_name ?? undefined} />
        </div>
      </div>
    </section>
  );
}
