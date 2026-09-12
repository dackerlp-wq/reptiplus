import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getInvoiceById } from "@/lib/invoices/issue";
import { invoiceFileName, renderInvoicePdf } from "@/lib/invoices/pdf";

export const dynamic = "force-dynamic";

/**
 * PDF dokladu. Přístup má admin/staff, přihlášený vlastník objednávky,
 * nebo kdokoli s číslem objednávky v `?o=` (odkaz z e-mailu a ze stránky
 * objednávky — číslo objednávky je náhodné a stránka objednávky je jím
 * chráněná stejně).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: order } = await createServiceClient()
    .from("order")
    .select("number, customer_id")
    .eq("id", inv.order_id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let allowed = req.nextUrl.searchParams.get("o") === order.number;
  if (!allowed) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      if (order.customer_id === user.id) allowed = true;
      else {
        const { data: profile } = await supabase
          .from("customer")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        allowed = profile?.role === "admin" || profile?.role === "staff";
      }
    }
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pdf = await renderInvoicePdf(inv);
  const inline = req.nextUrl.searchParams.get("dl") !== "1";
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${invoiceFileName(inv)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
