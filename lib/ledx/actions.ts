"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { sendMail } from "@/lib/email/client";
import { ledxInquiryConfirmationEmail } from "@/lib/email/templates";
import { routing, type Locale } from "@/i18n/routing";

export type InquiryState =
  | { status: "idle" }
  | { status: "ok"; mailed: boolean }
  | { status: "error"; error: "FORM" | "GDPR" | "RATE" | "SERVER" };

/* Limity proti spamu / zneužití. */
const MIN_FILL_MS = 2500; // rychlejší odeslání = bot
const IP_LIMIT = 5; // max poptávek z jedné IP…
const IP_WINDOW_MIN = 60; // …za hodinu
const EMAIL_LIMIT = 3; // max poptávek z jednoho e-mailu…
const EMAIL_WINDOW_MIN = 30; // …za 30 minut
const MAX_LINKS = 3; // víc odkazů v poznámce = spam

const s = (fd: FormData, k: string, max = 200) =>
  String(fd.get(k) ?? "").trim().slice(0, max);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  if (!ip) return null;
  const salt = process.env.RATE_LIMIT_SALT || "reptiplus-ledx";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Tichý „úspěch" pro boty — nic neuložíme, ale bot se nedozví proč. */
const fakeOk: InquiryState = { status: "ok", mailed: false };

/** Odeslání poptávky prémiového osvětlení LEDX — uloží do DB + e-mail obchodu a zákazníkovi. */
export async function submitLedxInquiry(
  _prev: InquiryState,
  fd: FormData,
): Promise<InquiryState> {
  // 1) Honeypot + příliš rychlé odeslání
  if (s(fd, "company_website")) return fakeOk;
  const ts = Number(s(fd, "ts"));
  if (ts && Date.now() - ts < MIN_FILL_MS) return fakeOk;

  // 2) Validace
  const name = s(fd, "jmeno", 120);
  const email = s(fd, "email", 200).toLowerCase();
  const model = s(fd, "model");
  if (!name || !isEmail(email) || !model) return { status: "error", error: "FORM" };
  if (fd.get("gdpr") !== "on") return { status: "error", error: "GDPR" };

  const poznamka = s(fd, "poznamka", 3000) || null;
  if (poznamka && (poznamka.match(/https?:\/\/|www\./gi)?.length ?? 0) > MAX_LINKS) {
    return fakeOk;
  }

  const localeRaw = s(fd, "locale", 5);
  const locale: Locale = (routing.locales as readonly string[]).includes(localeRaw)
    ? (localeRaw as Locale)
    : routing.defaultLocale;

  const pocetRaw = parseInt(s(fd, "pocet", 6), 10);
  const pocet = Number.isFinite(pocetRaw) && pocetRaw > 0 ? pocetRaw : null;

  const svc = createServiceClient();

  // 3) Rate limit (IP hash + e-mail) — při chybě DB raději pustíme dál
  const ipHash = await clientIpHash();
  try {
    const [byIp, byEmail] = await Promise.all([
      ipHash
        ? svc
            .from("ledx_inquiry")
            .select("id", { count: "exact", head: true })
            .eq("ip_hash", ipHash)
            .gte("created_at", minutesAgo(IP_WINDOW_MIN))
        : Promise.resolve({ count: 0, error: null }),
      svc
        .from("ledx_inquiry")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", minutesAgo(EMAIL_WINDOW_MIN)),
    ]);
    if (!byIp.error && (byIp.count ?? 0) >= IP_LIMIT) return { status: "error", error: "RATE" };
    if (!byEmail.error && (byEmail.count ?? 0) >= EMAIL_LIMIT) return { status: "error", error: "RATE" };
  } catch (e) {
    console.error("[ledx] kontrola limitu selhala:", e);
  }

  const row = {
    rada: s(fd, "rada", 120) || null,
    model,
    cct: s(fd, "cct") || null,
    uhel: s(fd, "uhel") || null,
    pocet,
    stmivani: s(fd, "stmivani", 40) || null,
    poznamka,
    name,
    email,
    phone: s(fd, "telefon", 40) || null,
  };

  // 4) Uložení (fallback bez nových sloupců, kdyby ještě neproběhla migrace)
  let { error } = await svc
    .from("ledx_inquiry")
    .insert({ ...row, locale, ip_hash: ipHash });
  if (error && /locale|ip_hash/.test(error.message)) {
    ({ error } = await svc.from("ledx_inquiry").insert(row));
  }
  if (error) {
    console.error("[ledx] uložení poptávky selhalo:", error.message);
    return { status: "error", error: "SERVER" };
  }

  // 5) E-maily (uložení už proběhlo, e-maily jsou best-effort)
  const contact = await getShopContact().catch(() => null);
  const shopEmail = contact?.email || process.env.SHOP_NOTIFY_EMAIL || "";

  const notifyShop = async () => {
    if (!shopEmail) return;
    const rows: [string, string | number | null][] = [
      ["Řada", row.rada],
      ["Model / výkon", row.model],
      ["Barva světla", row.cct],
      ["Úhel vyzařování", row.uhel],
      ["Počet kusů", row.pocet],
      ["Stmívání", row.stmivani],
      ["Poznámka", row.poznamka],
      ["Jméno", row.name],
      ["E-mail", row.email],
      ["Telefon", row.phone],
      ["Jazyk webu", locale.toUpperCase()],
    ];
    const filled = rows.filter(([, v]) => v !== null && v !== "");
    const trs = filled
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px;color:#6b7160;border-bottom:1px solid #eee">${k}</td><td style="padding:6px 12px;border-bottom:1px solid #eee"><strong>${esc(String(v))}</strong></td></tr>`,
      )
      .join("");
    const html = `<h2 style="font-family:sans-serif">Nová poptávka LEDX${row.rada ? " — " + esc(row.rada) : ""}</h2><table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${trs}</table>`;
    const text = filled.map(([k, v]) => `${k}: ${v}`).join("\n");
    await sendMail({
      to: shopEmail,
      subject: `Poptávka LEDX: ${row.rada ?? "—"}${row.model ? " · " + row.model : ""}${locale !== "cs" ? ` [${locale.toUpperCase()}]` : ""}`,
      html,
      text,
      replyTo: email,
    });
  };

  const confirmCustomer = async () => {
    const mail = ledxInquiryConfirmationEmail({
      locale,
      name: row.name,
      rada: row.rada,
      model: row.model,
      cct: row.cct,
      uhel: row.uhel,
      pocet: row.pocet,
      stmivani: row.stmivani,
      phone: row.phone,
      poznamka: row.poznamka,
    });
    return sendMail({ to: email, ...mail, replyTo: shopEmail || undefined });
  };

  const [, confirmed] = await Promise.allSettled([notifyShop(), confirmCustomer()]);
  const mailed = confirmed.status === "fulfilled" && confirmed.value === true;
  if (confirmed.status === "rejected") {
    console.error("[ledx] potvrzení zákazníkovi se nepodařilo odeslat:", confirmed.reason);
  }

  return { status: "ok", mailed };
}
