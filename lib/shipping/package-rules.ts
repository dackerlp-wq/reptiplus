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

/**
 * Z-Point / doručení domů: „standardní" do 5 kg jen do strany 60 cm a součtu 120 cm (individuální podmínky
 * Zásilkovny pro Reptiplus, 25. 11. 2026); větší nebo těžší = „nadrozměrná" (do 15 kg, strana 120, součet 150).
 */
const PP_STANDARD = { maxKg: 15, maxSide: 120, maxSum: 150, lightTier: { maxKg: 5, maxSide: 60, maxSum: 120 } };
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

/** Rozměry jednoho kusu zboží v cm. */
export type ItemDims = [number, number, number];

/** Vejde se kus do schránky (libovolně natočený)? */
export function fitsInside(item: ItemDims, box: readonly [number, number, number]): boolean {
  const a = desc([...item]);
  const b = desc([...box]);
  return a[0] <= b[0] && a[1] <= b[1] && a[2] <= b[2];
}

/**
 * Vejde se zboží do schránky? Každý kus se musí vejít sám a součet objemů nesmí přesáhnout
 * 90 % schránky (rezerva na balení). Kusy bez rozměrů se nepočítají — nevíme o nich.
 */
export function itemsFitBox(items: ItemDims[], box: readonly [number, number, number]): boolean {
  if (items.length === 0) return true;
  if (!items.every((i) => fitsInside(i, box))) return false;
  const vol = items.reduce((s, [l, w, h]) => s + l * w * h, 0);
  return vol <= 0.9 * box[0] * box[1] * box[2];
}

/** Schránky výdejních míst, kam se zboží nemusí vejít (pro pokladnu). */
export const LOCKERS = { zbox: RULES["CZ-ZBOX"].box!, inpost: RULES["PL-INPOST"].box! } as const;

/** Nejmenší krabice (podle objemu), do které se zboží vejde; null = žádná nebo neznámé rozměry. */
export function suggestBox<B extends { name: string; lengthCm: number; widthCm: number; heightCm: number }>(
  items: ItemDims[],
  boxes: B[],
): B | null {
  if (items.length === 0) return null;
  const sorted = [...boxes].sort((x, y) => x.lengthCm * x.widthCm * x.heightCm - y.lengthCm * y.widthCm * y.heightCm);
  return sorted.find((b) => itemsFitBox(items, [b.lengthCm, b.widthCm, b.heightCm])) ?? null;
}
