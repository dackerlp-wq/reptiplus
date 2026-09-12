"use client";

import { LayoutDashboard, Package, MapPin, Heart, Star, UserCog } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/ucet", key: "navOverview", icon: LayoutDashboard, exact: true },
  { href: "/ucet/objednavky", key: "navOrders", icon: Package },
  { href: "/ucet/adresy", key: "navAddresses", icon: MapPin },
  { href: "/ucet/oblibene", key: "navWishlist", icon: Heart },
  { href: "/ucet/recenze", key: "navReviews", icon: Star },
  { href: "/ucet/profil", key: "navProfile", icon: UserCog },
] as const;

export function AccountNav({ labels }: { labels: Record<(typeof ITEMS)[number]["key"], string> }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Account">
      {ITEMS.map((it) => {
        const active = "exact" in it && it.exact ? pathname === it.href : pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-forest text-white" : "text-charcoal hover:bg-white hover:text-forest",
            )}
          >
            <Icon className="size-4" /> {labels[it.key]}
          </Link>
        );
      })}
    </nav>
  );
}
