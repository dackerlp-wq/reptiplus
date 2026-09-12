import { NextResponse, type NextRequest } from "next/server";
import { confirmSubscription } from "@/lib/newsletter/service";

export const dynamic = "force-dynamic";

/** Potvrzení odběru z e-mailu → přesměrování na homepage s hláškou. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const base = req.nextUrl.origin;
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.redirect(`${base}/cs?newsletter=invalid`);
  const res = await confirmSubscription(token);
  return NextResponse.redirect(`${base}/${res.locale}?newsletter=${res.ok ? "confirmed" : "invalid"}`);
}
