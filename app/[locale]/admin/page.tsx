import { Package, FolderTree, Tag, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";

type CountTable = "product" | "category" | "brand" | "order";

async function count(table: CountTable): Promise<number> {
  const svc = createServiceClient();
  const { count } = await svc
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminDashboard() {
  const [products, categories, brands, orders] = await Promise.all([
    count("product"),
    count("category"),
    count("brand"),
    count("order"),
  ]);

  const cards = [
    { label: "Produkty", value: products, icon: Package, href: "/admin/products" },
    { label: "Kategorie", value: categories, icon: FolderTree, href: "/admin/products" },
    { label: "Značky", value: brands, icon: Tag, href: "/admin/products" },
    { label: "Objednávky", value: orders, icon: ShoppingBag, href: "/admin" },
  ];

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-bold">Přehled</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-cream-dark bg-white p-5 transition-colors hover:border-forest"
          >
            <c.icon className="size-5 text-forest" />
            <p className="mt-3 font-mono text-3xl font-bold text-ink">
              {c.value}
            </p>
            <p className="text-sm text-gray-soft">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
