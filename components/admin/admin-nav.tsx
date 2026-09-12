"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
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
  FileText,
  Mail,
  Gift,
  PackageX,
  Menu,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }>; badgeTone?: "amber" | "gold" };
type Group = Item[];

/** Ploché menu seřazené podle četnosti práce, skupiny jen oddělené čarou. */
const GROUPS: Group[] = [
  [{ href: "/admin", label: "Přehled", icon: LayoutDashboard }],
  [
    { href: "/admin/orders", label: "Objednávky", icon: ShoppingBag, badgeTone: "amber" },
    { href: "/admin/invoices", label: "Faktury", icon: FileText },
    { href: "/admin/claims", label: "Reklamace a vrácení", icon: PackageX, badgeTone: "amber" },
    { href: "/admin/inquiries", label: "Poptávky LEDX", icon: Lightbulb, badgeTone: "amber" },
  ],
  [
    { href: "/admin/products", label: "Produkty", icon: Package, badgeTone: "gold" },
    { href: "/admin/categories", label: "Kategorie", icon: FolderTree },
    { href: "/admin/brands", label: "Značky", icon: Tag },
    { href: "/admin/ledx", label: "LEDX řady", icon: Sparkles },
  ],
  [
    { href: "/admin/customers", label: "Zákazníci", icon: Users },
    { href: "/admin/reviews", label: "Recenze", icon: Star, badgeTone: "amber" },
    { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  ],
  [
    { href: "/admin/discounts", label: "Slevy", icon: Ticket },
    { href: "/admin/vouchers", label: "Poukazy", icon: Gift },
  ],
  [{ href: "/admin/settings", label: "Nastavení", icon: Settings }],
];

/** Odznaky: `href → počet` (objednávky k vyřízení, nové reklamace, recenze ke schválení, docházející sklad, nové poptávky). */
export type AdminBadges = Record<string, number>;

function useActive() {
  const pathname = usePathname() ?? "";
  // /cs/admin/orders/123 → /admin/orders/123
  const path = pathname.replace(/^\/(cs|en|de)(?=\/|$)/, "") || "/";
  return (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
}

function NavList({ badges, onNavigate }: { badges: AdminBadges; onNavigate?: () => void }) {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-0.5">
      {GROUPS.map((group, gi) => (
        <div key={gi} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-2 border-t border-cream-dark pt-2")}>
          {group.map((item) => {
            const active = isActive(item.href);
            const count = badges[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-forest text-white" : "text-charcoal hover:bg-cream hover:text-forest",
                )}
              >
                <item.icon className={cn("size-4 shrink-0", active ? "text-white" : "text-gray-soft")} />
                <span className="truncate">{item.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none",
                      active ? "bg-white/20 text-white" : item.badgeTone === "gold" ? "bg-gold/20 text-earth" : "bg-amber text-white",
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Postranní menu (desktop). */
export function AdminSidebar({ badges }: { badges: AdminBadges }) {
  return (
    <aside className="sticky top-[57px] hidden h-[calc(100dvh-57px)] w-60 shrink-0 overflow-y-auto border-r border-cream-dark bg-white p-3 md:block">
      <NavList badges={badges} />
    </aside>
  );
}

/** Hamburger + vysouvací panel (mobil a tablet na výšku). */
export function AdminMobileNav({ badges }: { badges: AdminBadges }) {
  const [open, setOpen] = useState(false);
  const total = Object.values(badges).reduce((s, n) => s + n, 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
        className="relative flex items-center justify-center rounded-lg p-2 text-charcoal hover:bg-cream"
      >
        <Menu className="size-6" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-amber px-1 font-mono text-[10px] font-bold leading-4 text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Zavřít menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-reveal">
            <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
              <span className="font-display text-lg font-semibold">Administrace</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zavřít" className="rounded-lg p-1.5 text-gray-soft hover:bg-cream hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavList badges={badges} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
