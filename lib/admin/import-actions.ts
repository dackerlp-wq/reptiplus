"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkLowStock } from "@/lib/stock-alerts/low-stock";
import { notifyStockAlerts } from "@/lib/stock-alerts/notify";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("customer").select("role").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) throw new Error("Forbidden");
}

export type ImportRow = {
  line: number;
  sku: string;
  stock: number | null;
  priceCzk: number | null; // minor units
  priceEur: number | null;
  /** Co bylo nalezeno podle SKU. */
  target: { kind: "product" | "variant"; id: string; productId: string; name: string; stock: number; priceCzk: number | null; priceEur: number | null } | null;
  error: string | null;
};

export type ImportState =
  | { status: "idle" }
  | { status: "preview"; rows: ImportRow[]; csv: string; delimiter: string }
  | { status: "done"; updated: number; skipped: number }
  | { status: "error"; message: string };

const HEADER_ALIASES: Record<string, keyof Pick<ImportRow, "sku" | "stock" | "priceCzk" | "priceEur">> = {
  sku: "sku",
  kod: "sku",
  kód: "sku",
  code: "sku",
  stock: "stock",
  stock_qty: "stock",
  sklad: "stock",
  skladem: "stock",
  qty: "stock",
  price_czk: "priceCzk",
  cena: "priceCzk",
  cena_czk: "priceCzk",
  czk: "priceCzk",
  price_eur: "priceEur",
  cena_eur: "priceEur",
  eur: "priceEur",
};

function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/)[0] ?? "";
  const counts = [";", ",", "\t"].map((d) => [d, first.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ";";
}

function splitLine(line: string, d: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === d) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const parseInt0 = (v: string): number | null => {
  if (!v) return null;
  const n = parseInt(v.replace(/\s/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const parseMoney = (v: string): number | null => {
  if (!v) return null;
  const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** Rozparsuje CSV (hlavička: sku; stock; price_czk; price_eur — pořadí libovolné, česky i anglicky). */
export async function parseImportCsv(text: string): Promise<{ rows: Omit<ImportRow, "target">[]; delimiter: string; error?: string }> {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], delimiter: ";", error: "Soubor neobsahuje hlavičku a aspoň jeden řádek dat." };
  const d = detectDelimiter(clean);
  const header = splitLine(lines[0], d).map((h) => HEADER_ALIASES[h.toLowerCase().replace(/[^a-z_čá]/g, "")] ?? null);
  if (!header.includes("sku")) return { rows: [], delimiter: d, error: "Chybí sloupec „sku“ (kód produktu / varianty)." };
  if (!header.includes("stock") && !header.includes("priceCzk") && !header.includes("priceEur")) {
    return { rows: [], delimiter: d, error: "Chybí sloupec se skladem (stock / sklad) nebo cenou (price_czk / price_eur)." };
  }
  const rows = lines.slice(1).map((line, i) => {
    const cells = splitLine(line, d);
    const get = (k: string) => {
      const idx = header.indexOf(k as never);
      return idx >= 0 ? (cells[idx] ?? "") : "";
    };
    const sku = get("sku");
    const stock = parseInt0(get("stock"));
    const priceCzk = parseMoney(get("priceCzk"));
    const priceEur = parseMoney(get("priceEur"));
    let error: string | null = null;
    if (!sku) error = "Prázdné SKU";
    else if (Number.isNaN(stock)) error = "Neplatný sklad";
    else if (Number.isNaN(priceCzk) || Number.isNaN(priceEur)) error = "Neplatná cena";
    return { line: i + 2, sku, stock: Number.isNaN(stock) ? null : stock, priceCzk: Number.isNaN(priceCzk) ? null : priceCzk, priceEur: Number.isNaN(priceEur) ? null : priceEur, error };
  });
  return { rows, delimiter: d };
}

/** Krok 1: nahraný CSV → náhled řádků s dohledáním podle SKU (produkt nebo varianta). */
export async function previewImportAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  await assertAdmin();
  const file = fd.get("file");
  const text = file instanceof File ? await file.text() : String(fd.get("csv") ?? "");
  if (!text.trim()) return { status: "error", message: "Vyber CSV soubor." };
  if (text.length > 2_000_000) return { status: "error", message: "Soubor je příliš velký (max 2 MB)." };
  const parsed = await parseImportCsv(text);
  if (parsed.error) return { status: "error", message: parsed.error };

  const svc = createServiceClient();
  const skus = Array.from(new Set(parsed.rows.map((r) => r.sku).filter(Boolean)));
  const [{ data: products }, { data: variants }] = await Promise.all([
    svc.from("product").select("id, sku, name, stock_qty, price_czk, price_eur").in("sku", skus),
    svc.from("product_variant").select("id, sku, name, product_id, stock_qty, price_czk, price_eur, product:product_id(name)").in("sku", skus),
  ]);
  const bySku = new Map<string, ImportRow["target"]>();
  for (const p of products ?? []) if (p.sku) bySku.set(p.sku.toLowerCase(), { kind: "product", id: p.id, productId: p.id, name: p.name, stock: p.stock_qty, priceCzk: p.price_czk, priceEur: p.price_eur });
  for (const v of variants ?? []) {
    if (!v.sku) continue;
    const parent = (v as unknown as { product: { name: string } | null }).product;
    bySku.set(v.sku.toLowerCase(), { kind: "variant", id: v.id, productId: v.product_id, name: `${parent?.name ?? ""} – ${v.name}`, stock: v.stock_qty, priceCzk: v.price_czk, priceEur: v.price_eur });
  }
  const rows: ImportRow[] = parsed.rows.map((r) => {
    const target = bySku.get(r.sku.toLowerCase()) ?? null;
    return { ...r, target, error: r.error ?? (target ? null : "SKU nenalezeno") };
  });
  return { status: "preview", rows, csv: text, delimiter: parsed.delimiter };
}

/** Krok 2: potvrzení náhledu → zápis skladu a cen, kontrola limitů a hlídání skladu. */
export async function applyImportAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  await assertAdmin();
  const preview = await previewImportAction({ status: "idle" }, fd);
  if (preview.status !== "preview") return preview;

  const svc = createServiceClient();
  let updated = 0;
  let skipped = 0;
  const touched = new Set<string>();
  for (const r of preview.rows) {
    if (r.error || !r.target) {
      skipped++;
      continue;
    }
    const patch: { stock_qty?: number; price_czk?: number; price_eur?: number } = {};
    if (r.stock != null) patch.stock_qty = r.stock;
    if (r.priceCzk != null) patch.price_czk = r.priceCzk;
    if (r.priceEur != null) patch.price_eur = r.priceEur;
    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }
    const { error } =
      r.target.kind === "product"
        ? await svc.from("product").update(patch).eq("id", r.target.id)
        : await svc.from("product_variant").update(patch).eq("id", r.target.id);
    if (error) {
      skipped++;
      continue;
    }
    updated++;
    touched.add(r.target.productId);
  }
  const ids = Array.from(touched);
  for (const id of ids) await notifyStockAlerts(id);
  await checkLowStock(ids);
  revalidatePath("/", "layout");
  return { status: "done", updated, skipped };
}
