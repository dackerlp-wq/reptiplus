/**
 * Podmínky balíku pro služby Zásilkovny (ceníky Reptiplus k 24. 11. 2026 → „Důležité informace a parametry").
 * Čisté funkce bez server-only — kontrolu počítá panel balení v prohlížeči i server před odesláním.
 */

export type PackageDims = {
  weightKg: number;
  /** Rozměry v cm (pořadí nehraje roli). */
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type ServiceRule = {
  /** Interní kód služby (např. `CZ-PP`, `CZ-ZBOX`, `DE-6373`). */
  code: string;
  label: string;
  maxKg: number;
  /** Nejdelší strana (cm). */
  maxSide?: number;
  /** Součet všech tří stran (cm). */
  maxSum?: number;
  /** Box / schránka — balík se musí vejít do těchto rozměrů (cm). */
  box?: [number, number, number];
  /**
   * Levná váhová kategorie (do 5 kg) platí jen do těchto rozměrů — větší balík Zásilkovna
   * účtuje jako nejvyšší kategorii (u Z-Pointů a doručení domů v CZ/SK/PL).
   */
  lightTier?: { maxKg: number; maxSide: number; maxSum: number };
};

/** Minimální rozměry u všech služeb: 10 × 7 × 1 cm. */
const MIN_DIMS: [number, number, number] = [10, 7, 1];

const PP_STANDARD = { maxKg: 15, maxSide: 120, maxSum: 150, lightTier: { maxKg: 5, maxSide: 70, maxSum: 120 } };
const SMALL_70_120 = { maxKg: 15, maxSide: 70, maxSum: 120 };

const RULES: Record<string, ServiceRule> = {
  "CZ-PP": { code: "CZ-PP", label: "Z-Point Zásilkovny (CZ)", ...PP_STANDARD },
  "SK-PP": { code: "SK-PP", label: "Z-Point Packeta (SK)", ...PP_STANDARD },
  "PL-PP": { code: "PL-PP", label: "Z-Point Packeta (PL)", ...PP_STANDARD },
  "CZ-ZBOX": { code: "CZ-ZBOX", label: "Z-BOX (CZ)", maxKg: 15, box: [60, 43, 35] },
  "CZ-HD": { code: "CZ-HD", label: "Zásilkovna domů (CZ)", ...PP_STANDARD },
  "SK-HD": { code: "SK-HD", label: "Packeta Home (SK)", ...SMALL_70_120 },
  "DE-HD": { code: "DE-HD", label: "Hermes domů (DE)", ...SMALL_70_120 },
  "DE-PP": { code: "DE-PP", label: "Hermes výdejní místo (DE)", ...SMALL_70_120 },
  "AT-HD": { code: "AT-HD", label: "DPD domů (AT)", ...SMALL_70_120 },
  "PL-HD": { code: "PL-HD", label: "DPD domů (PL)", ...SMALL_70_120 },
  "PL-INPOST": { code: "PL-INPOST", label: "InPost Paczkomat (PL)", maxKg: 15, box: [64, 41, 38] },
  "PL-POST": { code: "PL-POST", label: "Poczta Polska výdejní místo (PL)", maxKg: 15, maxSide: 70, maxSum: 190 },
};

/** ID externích dopravců výdejních míst → služba. */
const EXTERNAL_PICKUP: Record<string, string> = { "6828": "DE-PP", "14052": "PL-POST", "3060": "PL-INPOST" };

/** Údaje o doručení z `order.shipping_address` (JSONB) potřebné k určení služby. */
export type DeliveryInfo = {
  country?: string | null;
  pickup_point_id?: string | null;
  pickup_point_country?: string | null;
  pickup_point_group?: string | null;
  pickup_carrier_point?: string | null;
};

/** Služba Zásilkovny pro objednávku (null = neznámá kombinace, kontrolují se jen obecné limity). */
export function packetaServiceFor(a: DeliveryInfo | null | undefined): ServiceRule | null {
  if (!a) return null;
  if (a.pickup_point_id) {
    if (a.pickup_carrier_point) return RULES[EXTERNAL_PICKUP[String(a.pickup_point_id)] ?? ""] ?? null;
    const country = (a.pickup_point_country || a.country || "CZ").toUpperCase();
    if (a.pickup_point_group === "zbox") return RULES[`${country}-ZBOX`] ?? RULES["CZ-ZBOX"];
    return RULES[`${country}-PP`] ?? null;
  }
  return RULES[`${(a.country || "CZ").toUpperCase()}-HD`] ?? null;
}

/** Obecné limity, když službu neznáme (např. PPL): jen hmotnost a minimální rozměry. */
export const GENERIC_RULE: ServiceRule = { code: "GENERIC", label: "Dopravce", maxKg: 30 };

export type PackageCheck = {
  /** Balík nejde odeslat — tlačítko odeslání se zablokuje. */
  errors: string[];
  /** Jde odeslat, ale je na co upozornit (vyšší cena…). */
  warnings: string[];
};

const desc = (d: number[]) => [...d].sort((x, y) => y - x);
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/**
 * Zkontroluje balík proti podmínkám služby.
 * `paidTier` = jakou cenu dopravy zákazník zaplatil (do 5 kg / nad 5 kg; null = nevíme, např. doprava zdarma).
 */
export function checkPackage(
  rule: ServiceRule,
  p: PackageDims,
  paidTier: "light" | "heavy" | null = null,
): PackageCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dims = [p.lengthCm, p.widthCm, p.heightCm];

  if (!(p.weightKg > 0)) errors.push("Zadej hmotnost zváženého balíku.");
  if (dims.some((d) => !(d > 0))) errors.push("Zadej všechny tři rozměry balíku.");
  if (errors.length > 0) return { errors, warnings };

  const [a, b, c] = desc(dims);
  const sum = a + b + c;

  if (p.weightKg > rule.maxKg) errors.push(`Balík váží ${fmt(p.weightKg)} kg, ${rule.label} bere max. ${rule.maxKg} kg.`);
  if (a < MIN_DIMS[0] || b < MIN_DIMS[1] || c < MIN_DIMS[2])
    errors.push("Balík je menší než minimum 10 × 7 × 1 cm — použij větší krabici nebo obálku.");
  if (rule.box) {
    const [x, y, z] = desc(rule.box);
    if (a > x || b > y || c > z)
      errors.push(`Balík ${fmt(a)} × ${fmt(b)} × ${fmt(c)} cm se nevejde do schránky ${rule.label} (max. ${x} × ${y} × ${z} cm).`);
  }
  if (rule.maxSide && a > rule.maxSide)
    errors.push(`Nejdelší strana ${fmt(a)} cm — ${rule.label} bere max. ${rule.maxSide} cm.`);
  if (rule.maxSum && sum > rule.maxSum)
    errors.push(`Součet stran ${fmt(sum)} cm — ${rule.label} bere max. ${rule.maxSum} cm.`);

  if (errors.length > 0) return { errors, warnings };

  const oversizeForLight =
    rule.lightTier != null &&
    p.weightKg <= rule.lightTier.maxKg &&
    (a > rule.lightTier.maxSide || sum > rule.lightTier.maxSum);
  if (oversizeForLight)
    warnings.push(
      `Rozměry přes ${rule.lightTier!.maxSide} cm na straně / ${rule.lightTier!.maxSum} cm součet — Zásilkovna balík naúčtuje jako nejvyšší váhovou kategorii${paidTier === "light" ? ", ale zákazník zaplatil dopravu do 5 kg" : ""}. Zkus menší krabici.`,
    );
  if (paidTier === "light" && p.weightKg > 5)
    warnings.push(
      "Balík váží přes 5 kg, ale zákazník zaplatil dopravu do 5 kg — rozdíl doplatíš ty (asi chybí hmotnost u některého produktu).",
    );

  return { errors, warnings };
}
