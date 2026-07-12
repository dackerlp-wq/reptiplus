import { NextResponse, type NextRequest } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  // Autorizace — jen admin/staff
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("customer")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { texts?: Record<string, string> };
  const entries = Object.entries(body.texts ?? {}).filter(
    ([, v]) => typeof v === "string" && v.trim(),
  );
  if (entries.length === 0) return NextResponse.json({ en: {}, de: {} });

  // API klíč z nastavení (admin) nebo z env
  const svc = createServiceClient();
  const { data: setting } = await svc
    .from("app_setting")
    .select("value")
    .eq("key", "integrations.ai")
    .maybeSingle();
  const apiKey =
    (setting?.value as { anthropicKey?: string })?.anthropicKey ||
    process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NO_KEY" }, { status: 400 });

  const anthropic = createAnthropic({ apiKey });
  const prompt = `Jsi překladatel e-shopu s teraristickým vybavením (chov plazů a exotických zvířat).
Přelož následující ČESKÉ texty do angličtiny (klíč "en") a němčiny (klíč "de").
Zachovej názvy značek a modelů (Arcadia, Zoo Med, Exo Terra, UVB, T5, LED, D3…) beze změny.
Vrať POUZE validní JSON ve tvaru {"en":{...},"de":{...}} se stejnými klíči jako vstup, bez markdownu.

Vstup (JSON):
${JSON.stringify(Object.fromEntries(entries))}`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
    });
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json({ en: parsed.en ?? {}, de: parsed.de ?? {} });
  } catch {
    return NextResponse.json({ error: "TRANSLATE_FAILED" }, { status: 500 });
  }
}
