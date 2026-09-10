import { NextResponse, type NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Model přes Vercel AI Gateway (creator/model). Lze změnit přes env.
const MODEL = process.env.AI_GATEWAY_MODEL || "anthropic/claude-haiku-4.5";

// Delší popisy produktů se do výchozího limitu serverless funkce nevejdou.
export const maxDuration = 60;

const SYSTEM = `Jsi překladatel e-shopu s teraristickým vybavením (chov plazů a exotických zvířat).
Překládáš české texty do angličtiny a němčiny.

Pravidla:
- Některé hodnoty obsahují HTML formátování (značky <p>, <strong>, <em>, <s>, <ul>, <ol>, <li>, <a>, <h2>, <h3>). VŠECHNY HTML značky i jejich atributy zachovej PŘESNĚ beze změny — překládej pouze viditelný text mezi značkami.
- Názvy značek a modelů (Arcadia, Zoo Med, Exo Terra, Repashy, UVB, T5, LED, D3…) nech beze změny.
- Čísla, jednotky a technické hodnoty (35 W, 12 %, 54W, 90 g…) nech beze změny; jen desetinnou čárku a oddělovač tisíců převeď na zvyklost cílového jazyka (EN: 2.45 kg, 6,000 lm; DE: 2,45 kg, 6.000 lm).
- Zachovej PŘESNĚ strukturu textu: zalomení řádků (\\n) i oddělovače sloupců „ | " — každý řádek přelož samostatně, nespojuj ani nepřidávej řádky.
- Každý klíč vrať přeložený; nevynechávej ani nepřidávej klíče.`;

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

  // Schéma se staví z klíčů vstupu, takže model nemůže vrátit jiný tvar
  // a odpadá ruční parsování JSONu z volného textu.
  const perLocale = z.object(
    Object.fromEntries(entries.map(([k]) => [k, z.string()])),
  );
  const schema = z.object({ en: perLocale, de: perLocale });

  const source = JSON.stringify(Object.fromEntries(entries));

  // Dva jazyky, tedy zhruba dvojnásobek vstupu. Bez tohohle se delší popisy
  // tiše usekly uprostřed a odpověď pak nešla rozparsovat.
  const maxOutputTokens = Math.min(32000, Math.max(4000, Math.ceil(source.length * 0.9)));

  try {
    const { object } = await generateObject({
      model: MODEL,
      schema,
      schemaName: "Translations",
      schemaDescription: "Anglické a německé překlady zadaných českých textů.",
      system: SYSTEM,
      prompt: `Přelož tyto české texty (JSON klíč→text):\n${source}`,
      maxOutputTokens,
    });
    return NextResponse.json({ en: object.en ?? {}, de: object.de ?? {} });
  } catch (err: unknown) {
    // Bez tohohle logu nebylo z čeho poznat, co selhalo.
    console.error("[translate]", err);
    const detail = err instanceof Error ? err.message : String(err);
    const isAuth = /api key|unauthorized|authentication|oidc|forbidden|401|403/i.test(detail);
    return NextResponse.json(
      {
        error: isAuth
          ? "AI Gateway odmítl ověření. Zkontroluj AI_GATEWAY_API_KEY ve Vercel → Settings → Environment Variables."
          : `Překlad selhal: ${detail}`,
      },
      { status: isAuth ? 503 : 500 },
    );
  }
}
