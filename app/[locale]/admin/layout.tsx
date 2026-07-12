import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingBag,
  Settings,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/admin/auth";
import { signOutAction } from "@/lib/auth/actions";

const NAV = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard },
  { href: "/admin/products", label: "Produkty", icon: Package },
  { href: "/admin/categories", label: "Kategorie", icon: FolderTree },
  { href: "/admin/brands", label: "Značky", icon: Tag },
  { href: "/admin/orders", label: "Objednávky", icon: ShoppingBag },
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

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 md:flex">
        <p className="mb-3 px-3 font-display text-lg font-bold text-forest">
          Reptiplus Admin
        </p>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal hover:bg-white"
          >
            <item.icon className="size-4" /> {item.label}
          </Link>
        ))}

        <div className="mt-auto flex flex-col gap-1 pt-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-soft hover:bg-white"
          >
            <ExternalLink className="size-4" /> Zpět na web
          </Link>
          <form action={signOutAction}>
            <input type="hidden" name="redirectTo" value={`/${locale}`} />
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-soft hover:bg-white"
            >
              <LogOut className="size-4" /> Odhlásit
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
