"use client";

import { useActionState, useState } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { submitReviewAction, type ReviewState } from "@/lib/reviews/actions";
import type { Review } from "@/lib/reviews/queries";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";

function StarsDisplay({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            className,
            i <= Math.round(value)
              ? "fill-gold text-gold"
              : "fill-transparent text-cream-dark",
          )}
        />
      ))}
    </span>
  );
}

export function ProductReviews({
  productId,
  reviews,
  average,
  count,
  isLoggedIn,
}: {
  productId: string;
  reviews: Review[];
  average: number;
  count: number;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("Reviews");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    submitReviewAction,
    { status: "idle" },
  );
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const dateFmt = new Intl.DateTimeFormat(
    locale === "cs" ? "cs-CZ" : locale === "de" ? "de-DE" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <section className="mt-14">
      <h2 className="mb-5 font-display text-2xl font-bold">{t("title")}</h2>

      {count > 0 ? (
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-3xl font-bold text-ink">
            {average.toFixed(1)}
          </span>
          <div>
            <StarsDisplay value={average} className="size-5" />
            <p className="text-sm text-gray-soft">{t("count", { count })}</p>
          </div>
        </div>
      ) : (
        <p className="mb-6 text-gray-soft">{t("none")}</p>
      )}

      {reviews.length > 0 && (
        <ul className="mb-8 space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-cream-dark bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <StarsDisplay value={r.rating} />
                <span className="text-xs text-gray-soft">
                  {dateFmt.format(new Date(r.createdAt))}
                </span>
              </div>
              {r.title && (
                <p className="mt-2 font-semibold text-ink">{r.title}</p>
              )}
              {r.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal/80">
                  {r.body}
                </p>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-soft">
                <span>{r.author || t("anonymous")}</span>
                {r.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                    <CheckCircle2 className="size-3" /> {t("verified")}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-cream-dark bg-paper p-5">
        <h3 className="mb-3 font-display text-lg font-semibold">{t("write")}</h3>

        {!isLoggedIn ? (
          <p className="text-sm text-gray-soft">
            {t("loginPrompt")}{" "}
            <Link
              href="/prihlaseni"
              className="font-medium text-forest hover:underline"
            >
              {t("login")}
            </Link>
          </p>
        ) : state.status === "ok" ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" /> {t("submitted")}
          </p>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="rating" value={rating} />

            <div>
              <p className="mb-1.5 text-sm font-medium">{t("yourRating")}</p>
              <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i}`}
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setRating(i)}
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        i <= (hover || rating)
                          ? "fill-gold text-gold"
                          : "fill-transparent text-cream-dark",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t("reviewTitle")}</span>
              <input name="title" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t("reviewBody")}</span>
              <textarea name="body" rows={4} required className={inputClass} />
            </label>

            {state.status === "error" && (
              <p className="text-sm text-error">{t(`errors.${state.error}`)}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-50"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t("submit")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
