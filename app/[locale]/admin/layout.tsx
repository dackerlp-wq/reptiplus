import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingBag,
  Star,
  Settings,
  Ticket,
  Users,
  Lightbulb,
  Sparkles,
  ExternalLink,
  LogOut,
  FileText,
} from "lucide-react";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { signOutAction } from "@/lib/auth/actions";
import { Toaster, FlashToast } from "@/components/admin/toast";

const NAV = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard },
  { href: "/admin/products", label: "Produkty", icon: Package },
  { href: "/admin/categories", label: "Kategorie", icon: FolderTree },
  { href: "/admin/brands", label: "Značky", icon: Tag },
  { href: "/admin/orders", label: "Objednávky", icon: ShoppingBag },
  { href: "/admin/invoices", label: "Faktury", icon: FileText },
  { href: "/admin/ledx", label: "LEDX řady", icon: Sparkles },
  { href: "/admin/inquiries", label: "Poptávky LEDX", icon: Lightbulb },
  { href: "/admin/customers", label: "Zákazníci", icon: Users },
  { href: "/admin/discounts", label: "Slevy", icon: Ticket },
  { href: "/admin/reviews", label: "Recenze", icon: Star },
  { href: "/admin/settings", label: "Nastavení", icon: Settings },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);

  // Počet nových poptávek LEDX (bez reakce obchodu) → odznak v menu
  const { count: openInquiries } = await createServiceClient()
    .from("ledx_inquiry")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  const badges: Record<string, number> = { "/admin/inquiries": openInquiries ?? 0 };
  const Badge = ({ href }: { href: string }) =>
    badges[href] ? (
      <span className="ml-auto rounded-full bg-amber px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
        {badges[href]}
      </span>
    ) : null;

  return (
    <div className="min-h-dvh bg-cream">
      {/* Horní lišta */}
      <header className="sticky top-0 z-40 border-b border-cream-dark bg-white">
        <div className="flex items-center gap-4 px-4 py-3">
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
        {/* Mobilní navigace */}
        <nav className="flex gap-1 overflow-x-auto border-t border-cream px-2 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-charcoal hover:bg-cream"
            >
              <item.icon className="size-4" /> {item.label} <Badge href={item.href} />
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex">
        {/* Postranní menu */}
        <aside className="sticky top-[57px] hidden h-[calc(100dvh-57px)] w-56 shrink-0 flex-col gap-1 border-r border-cream-dark bg-white p-3 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal hover:bg-cream"
            >
              <item.icon className="size-4" /> {item.label}
              <Badge href={item.href} />
            </Link>
          ))}
        </aside>

        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>

      <Toaster />
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
