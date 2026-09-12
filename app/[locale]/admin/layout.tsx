import { ExternalLink, LogOut } from "lucide-react";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { signOutAction } from "@/lib/auth/actions";
import { Toaster, FlashToast } from "@/components/admin/toast";
import { AdminSidebar, AdminMobileNav, type AdminBadges } from "@/components/admin/admin-nav";
import { effectiveStock } from "@/lib/stock-alerts/low-stock";


export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);

  // Odznaky v menu: co čeká na vyřízení (jeden dotaz na každou oblast, jen počty).
  const svc = createServiceClient();
  const [inq, ordersOpen, claimsNew, reviewsPending, products] = await Promise.all([
    svc.from("ledx_inquiry").select("id", { count: "exact", head: true }).eq("status", "new"),
    svc.from("order").select("id", { count: "exact", head: true }).in("status", ["new", "paid", "processing"]),
    svc.from("claim").select("id", { count: "exact", head: true }).eq("status", "new"),
    svc.from("review").select("id", { count: "exact", head: true }).eq("is_approved", false),
    svc.from("product").select("stock_qty, low_stock_threshold, is_gift_voucher, product_variant(stock_qty)").eq("is_published", true).limit(2000),
  ]);
  const lowStock = (products.data ?? []).filter((p) => !p.is_gift_voucher && effectiveStock(p) <= (p.low_stock_threshold ?? 5)).length;
  const badges: AdminBadges = {
    "/admin/inquiries": inq.count ?? 0,
    "/admin/orders": ordersOpen.count ?? 0,
    "/admin/claims": claimsNew.count ?? 0,
    "/admin/reviews": reviewsPending.count ?? 0,
    "/admin/products": lowStock,
  };

  return (
    <div className="min-h-dvh bg-cream">
      {/* Horní lišta */}
      <header className="sticky top-0 z-40 border-b border-cream-dark bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <AdminMobileNav badges={badges} />
          <Link href="/admin" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Reptiplus" className="h-7 w-auto" />
            <span className="rounded-md bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest">
              Admin
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-soft hover:bg-cream"
            >
              <ExternalLink className="size-4" /> Zpět na web
            </Link>
            <form action={signOutAction}>
              <input type="hidden" name="redirectTo" value={`/${locale}`} />
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-soft hover:bg-cream">
                <LogOut className="size-4" /> Odhlásit
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        <AdminSidebar badges={badges} />

        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>

      <Toaster />
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
