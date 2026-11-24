import { redirect } from "next/navigation";

/** Doprava se přesunula do Nastavení → Doprava (stará adresa jen přesměruje). */
export default async function AdminShippingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/settings`);
}
