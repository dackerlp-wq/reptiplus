import { NextResponse, type NextRequest } from "next/server";
import { getEcomailConfig } from "@/lib/ecomail/client";
import { unsubscribeByEmail } from "@/lib/newsletter/service";

export const dynamic = "force-dynamic";

/**
 * Webhook z Ecomailu (Nastavení účtu → Webhook, URL i s tokenem `?t=`):
 * odhlášení v Ecomailu (list_unsubscribe / link_unsubscribe) → odhlásit i u nás.
 * Ecomail neposílá podpis, autorizace je tajným tokenem v URL.
 * Tělo: pole objektů `{ msys: { message_event: { type, rcpt_to, … } } }`.
 */
const UNSUB_TYPES = new Set(["list_unsubscribe", "link_unsubscribe", "unsubscribe"]);

export async function POST(req: NextRequest) {
  const c = await getEcomailConfig();
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!c.webhookToken || token !== c.webhookToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const events = Array.isArray(payload) ? payload : [payload];
  let unsubscribed = 0;
  for (const ev of events) {
    const e = (ev as { msys?: { message_event?: Record<string, unknown>; unsubscribe_event?: Record<string, unknown> } })?.msys;
    const me = e?.message_event ?? e?.unsubscribe_event ?? (ev as Record<string, unknown>);
    const type = String(me?.type ?? me?.event ?? "");
    const email = String(me?.rcpt_to ?? me?.email ?? "").trim().toLowerCase();
    if (!UNSUB_TYPES.has(type) || !email.includes("@")) continue;
    await unsubscribeByEmail(email);
    unsubscribed++;
  }
  return NextResponse.json({ ok: true, unsubscribed });
}
