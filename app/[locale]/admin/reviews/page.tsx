import { Star, Check, EyeOff, Trash2, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { approveReviewAction, deleteReviewAction } from "@/lib/admin/actions";
import { ToastForm } from "@/components/admin/toast";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: boolean;
  created_at: string;
  product: { id: string; slug: string; name: string } | null;
  customer: { full_name: string | null } | null;
  verified_purchase: boolean;
};

const dateFmt = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

type Group = {
  key: string;
  product: ReviewRow["product"];
  reviews: ReviewRow[];
  pending: number;
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const onlyPending = filter === "pending";

  const svc = createServiceClient();
  const { data } = await svc
    .from("review")
    .select(
      "id, rating, title, body, is_approved, verified_purchase, created_at, product:product_id(id,slug,name), customer:customer_id(full_name)",
    )
    .order("created_at", { ascending: false });

  const all = (data ?? []) as unknown as ReviewRow[];
  const pending = all.filter((r) => !r.is_approved).length;
  const reviews = onlyPending ? all.filter((r) => !r.is_approved) : all;

  // Seskupit podle produktu (abecedně), v rámci produktu nejdřív neschválené, pak od nejnovější.
  const groups = new Map<string, Group>();
  for (const r of reviews) {
    const key = r.product?.id ?? "-";
    const g = groups.get(key) ?? {
      key,
      product: r.product,
      reviews: [],
      pending: 0,
    };
    g.reviews.push(r);
    if (!r.is_approved) g.pending += 1;
    groups.set(key, g);
  }
  const sorted = [...groups.values()].sort((a, b) =>
    (a.product?.name ?? "").localeCompare(b.product?.name ?? "", "cs"),
  );
  for (const g of sorted) {
    g.reviews.sort((a, b) => Number(a.is_approved) - Number(b.is_approved));
  }

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium transition-colors ${
      active ? "bg-forest text-white" : "bg-white text-gray-soft hover:text-ink"
    }`;

  return (
    <div className="max-w-4xl">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">Recenze</h1>
        {pending > 0 && (
          <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
            {pending} ke schválení
          </span>
        )}
        <div className="ml-auto inline-flex gap-1 rounded-full border border-cream-dark bg-white p-0.5">
          <Link href="/admin/reviews" className={pill(!onlyPending)}>
            Vše
          </Link>
          <Link
            href="/admin/reviews?filter=pending"
            className={pill(onlyPending)}
          >
            Ke schválení
          </Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-soft">
        Recenze od přihlášených zákazníků, kteří si produkt u nás koupili, se
        zveřejňují automaticky se štítkem „Ověřený nákup“. Ostatní čekají na
        schválení.
      </p>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          {onlyPending ? "Nic nečeká na schválení." : "Zatím žádné recenze."}
        </p>
      ) : (
        <div className="space-y-8">
          {sorted.map((g) => (
            <section key={g.key}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-ink">
                  {g.product?.name ?? "Smazaný produkt"}
                </h2>
                <span className="text-xs text-gray-soft">
                  {g.reviews.length}{" "}
                  {g.reviews.length === 1
                    ? "recenze"
                    : g.reviews.length < 5
                      ? "recenze"
                      : "recenzí"}
                </span>
                {g.pending > 0 && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                    {g.pending} ke schválení
                  </span>
                )}
                {g.product && (
                  <Link
                    href={`/produkt/${g.product.slug}`}
                    target="_blank"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-gray-soft hover:text-forest"
                  >
                    Zobrazit na webu <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
              <ul className="space-y-3">
                {g.reviews.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-xl border bg-white p-4 ${
                      r.is_approved
                        ? "border-cream-dark"
                        : "border-gold/40 bg-gold/5"
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
                          <p className="mt-2 font-semibold text-ink">
                            {r.title}
                          </p>
                        )}
                        {r.body && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal/80">
                            {r.body}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-gray-soft">
                          {r.customer?.full_name?.trim() || "Zákazník"} ·{" "}
                          {dateFmt.format(new Date(r.created_at))}
                          {r.verified_purchase && (
                            <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                              Ověřený nákup
                            </span>
                          )}
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
