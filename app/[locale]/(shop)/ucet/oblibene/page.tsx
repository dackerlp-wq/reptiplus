import { getTranslations, setRequestLocale } from "next-intl/server";
import { X } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { requireCustomer, getWishlistIds } from "@/lib/account/queries";
import { getProductsByIds } from "@/lib/queries";
import { removeFromWishlistAction } from "@/lib/account/actions";
import { ProductCard } from "@/components/reptiplus/product-card";

export default async function AccountWishlistPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account");
  const { supabase } = await requireCustomer(locale);
  const ids = await getWishlistIds(supabase);
  const products = await getProductsByIds(ids);
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">{t("wishlist")}</h2>
      {products.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-6 text-sm text-gray-soft">{t("noWishlist")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} locale={locale} />
              <form action={removeFromWishlistAction} className="absolute left-2 top-2 z-10">
                <input type="hidden" name="product_id" value={p.id} />
                <button
                  title={t("removeFromWishlist")}
                  aria-label={t("removeFromWishlist")}
                  className="flex size-8 items-center justify-center rounded-full bg-white/90 text-gray-soft shadow hover:text-error"
                >
                  <X className="size-4" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
