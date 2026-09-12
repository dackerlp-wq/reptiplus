import { getTranslations, setRequestLocale } from "next-intl/server";
import { Star, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n";
import { requireCustomer, getMyReviews } from "@/lib/account/queries";
import { deleteReviewAction } from "@/lib/account/actions";

export default async function AccountReviewsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account");
  const { user } = await requireCustomer(locale);
  const reviews = await getMyReviews(user.id);
  const dateFmt = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : locale === "de" ? "de-DE" : "en-GB", { dateStyle: "medium" });

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">{t("reviews")}</h2>
      {reviews.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-6 text-sm text-gray-soft">{t("noReviews")}</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const product = r.product as { slug: string; name: string; name_i18n: unknown } | null;
            return (
              <li key={r.id} className="rounded-xl border border-cream-dark bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {product && (
                      <Link href={`/produkt/${product.slug}`} className="font-semibold text-ink hover:text-forest">
                        {pickI18n(product.name_i18n as Record<string, string>, locale, product.name)}
                      </Link>
                    )}
                    <p className="mt-1 flex items-center gap-2 text-xs text-gray-soft">
                      <span className="inline-flex text-gold">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-current" : "opacity-30"}`} />
                        ))}
                      </span>
                      {dateFmt.format(new Date(r.created_at))}
                      <span className={`rounded-md px-1.5 py-0.5 font-semibold ${r.is_approved ? "bg-success/15 text-success" : "bg-amber/15 text-amber"}`}>
                        {r.is_approved ? t("reviewApproved") : t("reviewPending")}
                      </span>
                    </p>
                  </div>
                  <form action={deleteReviewAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-error hover:underline">
                      <Trash2 className="size-3.5" /> {t("deleteReview")}
                    </button>
                  </form>
                </div>
                {r.title && <p className="mt-2 font-semibold text-ink">{r.title}</p>}
                {r.body && <p className="mt-1 whitespace-pre-line text-sm text-charcoal">{r.body}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
