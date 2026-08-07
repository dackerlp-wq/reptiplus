import type { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
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

/**
 * Sloučené PDF štítků pro více objednávek (hromadný tisk).
 * `?ids=a,b,c` — jen objednávky s vytvořenou zásilkou a API dopravcem.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return new Response("Forbidden", { status: 403 });

  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return new Response("Chybí objednávky.", { status: 400 });

  const svc = createServiceClient();
  const { data: orders } = await svc
    .from("order")
    .select("id, number, shipping_method, carrier_shipment_id")
    .in("id", ids);

  const merged = await PDFDocument.create();
  const printedIds: string[] = [];
  const failed: string[] = [];

  for (const order of orders ?? []) {
    if (!order.carrier_shipment_id) {
      failed.push(order.number);
      continue;
    }
    const carrier = await carrierForOrder(order.shipping_method);
    if (!carrier) {
      failed.push(order.number);
      continue;
    }
    const label = await getLabel(carrier, order.carrier_shipment_id);
    if (!label.ok) {
      failed.push(order.number);
      continue;
    }
    try {
      const src = await PDFDocument.load(
        Buffer.from(label.data.pdfBase64, "base64"),
      );
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
      printedIds.push(order.id);
    } catch {
      failed.push(order.number);
    }
  }

  if (printedIds.length === 0) {
    return new Response(
      `Žádný štítek se nepodařilo připravit${
        failed.length ? ` (${failed.join(", ")})` : ""
      }.`,
      { status: 400 },
    );
  }

  await svc
    .from("order")
    .update({ label_printed_at: new Date().toISOString() } as never)
    .in("id", printedIds);

  const bytes = await merged.save();
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stitky-${printedIds.length}.pdf"`,
    },
  });
}
