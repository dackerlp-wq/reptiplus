import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Hint } from "@/components/admin/hint";
import { StockImportForm } from "@/components/admin/stock-import-form";

export default function AdminStockImportPage() {
  return (
    <div className="max-w-4xl">
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Produkty
      </Link>
      <h1 className="mb-2 font-display text-3xl font-bold">Import skladu a cen (CSV)</h1>
      <div className="mb-6">
        <Hint>
          CSV s hlavičkou: <code>sku;stock;price_czk;price_eur</code> (oddělovač středník, čárka nebo tabulátor; sloupce v libovolném
          pořadí, česky i anglicky: <code>sklad</code>, <code>cena</code>). Řádky se párují podle SKU produktu nebo varianty. Prázdná
          buňka = hodnota se nemění. Ceny v korunách / eurech s desetinnou čárkou nebo tečkou. Nejdřív uvidíš náhled, zapíše se až po potvrzení.
        </Hint>
      </div>
      <StockImportForm />
    </div>
  );
}
