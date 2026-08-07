import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getShippingMethods, getPaymentMethods } from "@/lib/queries";
import { pickI18n } from "@/lib/i18n";
import { ManualOrderForm } from "@/components/admin/manual-order-form";

export default async function NewOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [shipping, payment] = await Promise.all([
    getShippingMethods(),
    getPaymentMethods(),
  ]);

  const shippingOptions = shipping.map((m) => ({
    code: m.code,
    name: pickI18n(m.name_i18n, "cs"),
    feeCzk: m.price_czk,
    feeEur: m.price_eur ?? m.price_czk,
  }));
  const paymentOptions = payment.map((m) => ({
    code: m.code,
    name: pickI18n(m.name_i18n, "cs"),
    feeCzk: m.fee_czk,
    feeEur: m.fee_eur ?? m.fee_czk,
  }));

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Objednávky
      </Link>
      <h1 className="mb-6 font-display text-3xl font-bold">Nová objednávka</h1>
      <ManualOrderForm
        locale={locale}
        shippingOptions={shippingOptions}
        paymentOptions={paymentOptions}
      />
    </div>
  );
}
