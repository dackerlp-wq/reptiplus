import { NextResponse, type NextRequest } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

// Model přes Vercel AI Gateway (creator/model). Lze změnit přes env.
const MODEL = process.env.AI_GATEWAY_MODEL || "anthropic/claude-haiku-4.5";

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

  const prompt = `Jsi překladatel e-shopu s teraristickým vybavením (chov plazů a exotických zvířat).
Přelož následující ČESKÉ texty do angličtiny (klíč "en") a němčiny (klíč "de").

Pravidla:
- Některé hodnoty obsahují HTML formátování (značky <p>, <strong>, <em>, <s>, <ul>, <ol>, <li>, <a>, <h2>, <h3>). VŠECHNY HTML značky i jejich atributy zachovej PŘESNĚ beze změny — překládej pouze viditelný text mezi značkami.
- Názvy značek a modelů (Arcadia, Zoo Med, Exo Terra, Repashy, UVB, T5, LED, D3…) nech beze změny.
- Čísla, jednotky a technické hodnoty (35 W, 12 %, 54W, 90 g…) nech beze změny.
- Vrať POUZE validní JSON ve tvaru {"en":{...},"de":{...}} se stejnými klíči jako vstup, bez markdownu.

Vstup (JSON):
${JSON.stringify(Object.fromEntries(entries))}`;

  try {
    const { text } = await generateText({ model: MODEL, prompt });
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json({ en: parsed.en ?? {}, de: parsed.de ?? {} });
  } catch {
    return NextResponse.json({ error: "TRANSLATE_FAILED" }, { status: 500 });
  }
}
