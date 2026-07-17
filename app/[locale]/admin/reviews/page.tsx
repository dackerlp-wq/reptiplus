import { Star, Check, EyeOff, Trash2 } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import {
  approveReviewAction,
  deleteReviewAction,
} from "@/lib/admin/actions";
import { ToastForm } from "@/components/admin/toast";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: boolean;
  created_at: string;
  product: { slug: string; name: string } | null;
  customer: { full_name: string | null } | null;
};

const dateFmt = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export default async function AdminReviewsPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("review")
    .select(
      "id, rating, title, body, is_approved, created_at, product:product_id(slug,name), customer:customer_id(full_name)",
    )
    .order("is_approved", { ascending: true })
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as unknown as ReviewRow[];
  const pending = reviews.filter((r) => !r.is_approved).length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold">Recenze</h1>
        {pending > 0 && (
          <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
            {pending} ke schválení
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          Zatím žádné recenze.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`rounded-xl border bg-white p-4 ${
                r.is_approved ? "border-cream-dark" : "border-gold/40 bg-gold/5"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`size-4 ${
                            i <= r.rating
                              ? "fill-gold text-gold"
                              : "fill-transparent text-cream-dark"
                          }`}
                        />
                      ))}
                    </span>
                    {!r.is_approved && (
                      <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[11px] font-semibold text-gold">
                        Čeká na schválení
                      </span>
                    )}
                  </div>

                  {r.title && (
                    <p className="mt-2 font-semibold text-ink">{r.title}</p>
                  )}
                  {r.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal/80">
                      {r.body}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-soft">
                    {r.customer?.full_name?.trim() || "Zákazník"} ·{" "}
                    {dateFmt.format(new Date(r.created_at))}
                    {r.product && <> · {r.product.name}</>}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <ToastForm
                    action={approveReviewAction}
                    success={r.is_approved ? "Skryto" : "Schváleno"}
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="approved"
                      value={r.is_approved ? "0" : "1"}
                    />
                    {r.is_approved ? (
                      <button
                        title="Skrýt (zrušit schválení)"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark px-3 py-1.5 text-sm font-medium text-gray-soft hover:bg-cream"
                      >
                        <EyeOff className="size-4" /> Skrýt
                      </button>
                    ) : (
                      <button
                        title="Schválit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-sm font-semibold text-white hover:bg-forest-light"
                      >
                        <Check className="size-4" /> Schválit
                      </button>
                    )}
                  </ToastForm>
                  <ToastForm
                    action={deleteReviewAction}
                    success="Smazáno"
                    confirm="Smazat tuto recenzi?"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      title="Smazat"
                      className="rounded-lg border border-cream-dark p-2 text-gray-soft hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </ToastForm>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
