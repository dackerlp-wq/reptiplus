import { NextResponse, type NextRequest } from "next/server";
import { generateObject, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getContentI18n } from "@/lib/settings";

// Model přes Vercel AI Gateway (creator/model). Lze změnit přes env.
const GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || "anthropic/claude-haiku-4.5";
// Model při přímém volání Anthropic API (bez gateway). Lze změnit přes env.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

type Provider = "anthropic" | "gateway";

/**
 * Vybere, kudy překlad poběží. Přímý Anthropic klíč (admin → Nastavení →
 * AI překlady, nebo env ANTHROPIC_API_KEY) má přednost — AI Gateway ve free
 * tieru k modelům Anthropic nepustí a překlad končil chybou.
 */
async function resolveModel(): Promise<{ model: LanguageModel; provider: Provider; id: string }> {
  let key = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  try {
    const ai = await getContentI18n("integrations.ai");
    const fromAdmin = (ai.anthropicKey ?? "").trim();
    if (fromAdmin) key = fromAdmin;
  } catch {
    // app_setting nedostupné → zůstane env / gateway
  }
  if (key) {
    const anthropic = createAnthropic({ apiKey: key });
    return { model: anthropic(ANTHROPIC_MODEL), provider: "anthropic", id: ANTHROPIC_MODEL };
  }
  return { model: GATEWAY_MODEL, provider: "gateway", id: GATEWAY_MODEL };
}

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

/** Srozumitelná hláška pro admina podle toho, kudy překlad běžel a co selhalo. */
function describeError(provider: Provider, modelId: string, detail: string): string {
  const isAuth = /api key|unauthorized|authentication|oidc|forbidden|401|403/i.test(detail);
  if (provider === "gateway") {
    if (/free tier/i.test(detail)) {
      return (
        `Vercel AI Gateway je ve free tieru a model ${modelId} nepovolí. ` +
        "Buď dobij kredity AI Gateway ve Vercelu (AI → Top up), nebo v adminu " +
        "(Nastavení → AI překlady) vyplň Anthropic API klíč — překlad pak poběží přímo přes Anthropic."
      );
    }
    if (isAuth) {
      return "AI Gateway odmítl ověření. Zkontroluj AI_GATEWAY_API_KEY ve Vercel → Settings → Environment Variables, nebo v adminu vyplň Anthropic API klíč.";
    }
    return `Překlad přes AI Gateway (${modelId}) selhal: ${detail}`;
  }
  if (isAuth) {
    return "Anthropic API odmítlo klíč. Zkontroluj Anthropic API klíč v adminu (Nastavení → AI překlady).";
  }
  if (/credit|billing|balance/i.test(detail)) {
    return `Anthropic API hlásí problém s kreditem/účtováním: ${detail}`;
  }
  return `Překlad přes Anthropic (${modelId}) selhal: ${detail}`;
}

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

  const { model, provider, id: modelId } = await resolveModel();

  try {
    const { object } = await generateObject({
      model,
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
    console.error(`[translate] provider=${provider} model=${modelId}`, err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: describeError(provider, modelId, detail) },
      { status: 500 },
    );
  }
}
