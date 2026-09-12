import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Locale } from "@/i18n/routing";

const FONT_CACHE = new Map<string, Uint8Array>();
async function font(rel: string): Promise<Uint8Array> {
  let bytes = FONT_CACHE.get(rel);
  if (!bytes) {
    bytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", "fonts", rel)));
    FONT_CACHE.set(rel, bytes);
  }
  return bytes;
}

const COPY = {
  cs: { title: "DÁRKOVÝ POUKAZ", value: "Hodnota", code: "Kód poukazu", validTo: "Platí do", howto: "Kód zadejte v pokladně do pole „Dárkový poukaz“. Lze čerpat postupně, zbytek zůstane na poukazu.", message: "Vzkaz" },
  en: { title: "GIFT VOUCHER", value: "Value", code: "Voucher code", validTo: "Valid until", howto: "Enter the code in the “Gift voucher” field at checkout. It can be used in several orders until the balance is spent.", message: "Message" },
  de: { title: "GESCHENKGUTSCHEIN", value: "Wert", code: "Gutscheincode", validTo: "Gültig bis", howto: "Geben Sie den Code an der Kasse im Feld „Geschenkgutschein“ ein. Der Gutschein kann in mehreren Bestellungen eingelöst werden.", message: "Nachricht" },
} as const;

const czk = (minor: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(minor / 100);

/** Jednoduchý poukaz A5 na šířku (pdf-lib + Liberation Sans kvůli diakritice). */
export async function renderVoucherPdf(v: { code: string; valueCzk: number; validTo: string | null; locale: Locale; shopName: string; message?: string | null }): Promise<Uint8Array> {
  const c = COPY[v.locale] ?? COPY.cs;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(await font("LiberationSans-Regular.ttf"), { subset: true });
  const bold = await doc.embedFont(await font("LiberationSans-Bold.ttf"), { subset: true });
  const W = 595.28;
  const H = 419.53; // A5 na šířku
  const page = doc.addPage([W, H]);
  const forest = rgb(0.247, 0.416, 0.18);
  const ink = rgb(0.15, 0.14, 0.11);
  const muted = rgb(0.54, 0.54, 0.5);
  const cream = rgb(0.969, 0.961, 0.937);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: cream });
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: forest, borderWidth: 2 });
  page.drawRectangle({ x: 24, y: H - 96, width: W - 48, height: 72, color: forest });
  page.drawText(v.shopName, { x: 44, y: H - 62, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText(c.title, { x: W - 44 - bold.widthOfTextAtSize(c.title, 16), y: H - 62, size: 16, font: bold, color: rgb(1, 1, 1) });

  const valueStr = czk(v.valueCzk);
  page.drawText(c.value, { x: 44, y: H - 140, size: 11, font: regular, color: muted });
  page.drawText(valueStr, { x: 44, y: H - 180, size: 36, font: bold, color: forest });

  page.drawText(c.code, { x: 44, y: H - 222, size: 11, font: regular, color: muted });
  page.drawRectangle({ x: 44, y: H - 268, width: 260, height: 36, color: rgb(1, 1, 1), borderColor: forest, borderWidth: 1 });
  page.drawText(v.code, { x: 58, y: H - 256, size: 20, font: bold, color: ink });

  if (v.validTo) {
    const d = new Intl.DateTimeFormat(v.locale === "cs" ? "cs-CZ" : v.locale === "de" ? "de-DE" : "en-GB", { dateStyle: "long" }).format(new Date(v.validTo));
    page.drawText(`${c.validTo}: ${d}`, { x: 44, y: H - 292, size: 11, font: regular, color: ink });
  }

  // Vzkaz (max ~3 řádky) a návod, zalamování na šířku.
  const wrap = (text: string, size: number, maxW: number, f = regular) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(t, size) > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  let y = H - 322;
  if (v.message?.trim()) {
    page.drawText(`${c.message}:`, { x: 44, y, size: 10, font: bold, color: ink });
    y -= 14;
    for (const line of wrap(v.message.trim(), 10, W - 88).slice(0, 3)) {
      page.drawText(line, { x: 44, y, size: 10, font: regular, color: ink });
      y -= 13;
    }
    y -= 4;
  }
  for (const line of wrap(c.howto, 9, W - 88)) {
    page.drawText(line, { x: 44, y, size: 9, font: regular, color: muted });
    y -= 12;
  }
  return doc.save();
}
