import "server-only";

/** Sjednocené rozhraní dopravců (Zásilkovna / PPL). */

export type CarrierCode = "zasilkovna" | "ppl";

export type ShipmentRecipient = {
  name: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string; // ISO2, default CZ
  email?: string;
  phone?: string;
  /** ID výdejního místa (Zásilkovna PUDO), pokud zákazník zvolil pobočku. */
  pickupPointId?: string;
};

export type ShipmentInput = {
  orderNumber: string;
  recipient: ShipmentRecipient;
  /** Hmotnost v kg (odhad, dopravce vyžaduje > 0). */
  weightKg: number;
  /** Dobírka v minor units (haléře/eurocenty); 0 = bez dobírky. */
  codMinor: number;
  /** Hodnota zásilky v minor units (pro pojištění/celní). */
  valueMinor: number;
  currency: string; // CZK | EUR
};

export type ShipmentResult = {
  /** Veřejný sledovací kód (barcode / číslo zásilky). */
  trackingNumber: string;
  /** Interní ID u dopravce pro tisk štítku. */
  shipmentId: string;
  /** Veřejný odkaz na sledování. */
  trackingUrl: string;
};

/** Výsledek volání dopravce — nikdy nevyhazuje, chyby vrací jako data. */
export type CarrierResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type LabelResult = CarrierResult<{
  /** PDF štítku zakódované v base64. */
  pdfBase64: string;
}>;

/** Minor units → hlavní jednotka měny (Kč/€) jako číslo (dopravci chtějí částku v Kč). */
export const toMajor = (minor: number): number =>
  Math.round(minor) / 100;
