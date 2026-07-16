export type TranslateResult =
  | { ok: true; en: Record<string, string>; de: Record<string, string> }
  | { ok: false; error: string };

/** Přeloží české texty (klíč→text) do EN a DE přes /api/admin/translate. */
export async function translateFromCs(
  texts: Record<string, string>,
): Promise<TranslateResult> {
  try {
    const res = await fetch("/api/admin/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "TRANSLATE_FAILED" };
    return { ok: true, en: data.en ?? {}, de: data.de ?? {} };
  } catch {
    return { ok: false, error: "TRANSLATE_FAILED" };
  }
}
