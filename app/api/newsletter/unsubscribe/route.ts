import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeByToken } from "@/lib/newsletter/service";

export const dynamic = "force-dynamic";

/** Odhlášení odběru z odkazu v e-mailu. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const base = req.nextUrl.origin;
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.redirect(`${base}/cs?newsletter=invalid`);
  const res = await unsubscribeByToken(token);
  return NextResponse.redirect(`${base}/${res.locale}?newsletter=${res.ok ? "unsubscribed" : "invalid"}`);
}
