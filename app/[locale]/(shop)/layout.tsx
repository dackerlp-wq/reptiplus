import type { Locale } from "@/i18n/routing";
import { Navbar } from "@/components/reptiplus/navbar";
import { Footer } from "@/components/reptiplus/footer";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar locale={locale as Locale} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
