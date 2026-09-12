import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** ID produktů v oblíbených přihlášeného zákazníka (pro srdíčka na kartách). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ids: [], auth: false }, { headers: { "Cache-Control": "no-store" } });
  const { data } = await supabase.from("wishlist_item").select("product_id");
  return NextResponse.json(
    { ids: (data ?? []).map((r) => r.product_id), auth: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
