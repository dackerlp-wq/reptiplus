import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { carrierForOrder, getLabel } from "@/lib/shipping";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("customer")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin" || profile?.role === "staff";
}

/** Vrátí PDF štítku pro objednávku (jen pro admina). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;

  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select("id, number, shipping_method, carrier_shipment_id")
    .eq("id", id)
    .maybeSingle();
  if (!order || !order.carrier_shipment_id) {
    return new Response("Zásilka ještě nebyla vytvořena.", { status: 400 });
  }

  const carrier = await carrierForOrder(order.shipping_method);
  if (!carrier) return new Response("Dopravce nepodporuje tisk štítku.", { status: 400 });

  const label = await getLabel(carrier, order.carrier_shipment_id);
  if (!label.ok) return new Response(label.error, { status: 502 });

  await svc
    .from("order")
    .update({ label_printed_at: new Date().toISOString() } as never)
    .eq("id", id);

  const pdf = Buffer.from(label.data.pdfBase64, "base64");
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stitek-${order.number}.pdf"`,
    },
  });
}
