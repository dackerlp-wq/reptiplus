import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncSupplierFeed } from "@/lib/suppliers/sync";

export const maxDuration = 300;

/** Denní načtení aktivních feedů dodavatelů (chráněno CRON_SECRET). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: feeds } = await createServiceClient().from("supplier_feed").select("id, name").eq("is_active", true);
  const results: Record<string, unknown> = {};
  for (const f of feeds ?? []) results[f.name] = await syncSupplierFeed(f.id);
  return NextResponse.json(results);
}
