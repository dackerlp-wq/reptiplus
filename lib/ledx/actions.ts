"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { sendMail } from "@/lib/email/client";

export type InquiryState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: "FORM" | "GDPR" | "SERVER" };

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Odeslání poptávky prémiového osvětlení LEDX — uloží do DB + e-mail obchodu. */
export async function submitLedxInquiry(
  _prev: InquiryState,
  fd: FormData,
): Promise<InquiryState> {
  const name = s(fd, "jmeno");
  const email = s(fd, "email");
  if (!name || !isEmail(email)) return { status: "error", error: "FORM" };
  if (fd.get("gdpr") !== "on") return { status: "error", error: "GDPR" };

  const pocetRaw = s(fd, "pocet");
  const pocet = pocetRaw ? parseInt(pocetRaw, 10) : null;

  const row = {
    rada: s(fd, "rada") || null,
    model: s(fd, "model") || null,
    cct: s(fd, "cct") || null,
    uhel: s(fd, "uhel") || null,
    pocet: Number.isFinite(pocet) ? pocet : null,
    stmivani: s(fd, "stmivani") || null,
    poznamka: s(fd, "poznamka") || null,
    name,
    email,
    phone: s(fd, "telefon") || null,
  };

  const svc = createServiceClient();
  const { error } = await svc.from("ledx_inquiry").insert(row);
  if (error) {
    console.error("[ledx] uložení poptávky selhalo:", error.message);
    return { status: "error", error: "SERVER" };
  }

  // Notifikace obchodu (uložení už proběhlo, e-mail je best-effort).
  try {
    const contact = await getShopContact();
    const to = contact.email || process.env.SHOP_NOTIFY_EMAIL;
    if (to) {
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
      ];
      const trs = rows
        .filter(([, v]) => v !== null && v !== "")
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px;color:#6b7160;border-bottom:1px solid #eee">${k}</td><td style="padding:6px 12px;border-bottom:1px solid #eee"><strong>${esc(String(v))}</strong></td></tr>`,
        )
        .join("");
      const html = `<h2 style="font-family:sans-serif">Nová poptávka LEDX${row.rada ? " — " + esc(row.rada) : ""}</h2><table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${trs}</table>`;
      const text = rows
        .filter(([, v]) => v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      await sendMail({
        to,
        subject: `Poptávka LEDX: ${row.rada ?? "—"}${row.model ? " · " + row.model : ""}`,
        html,
        text,
        replyTo: email,
      });
    }
  } catch (e) {
    console.error("[ledx] e-mail o poptávce se nepodařilo odeslat:", e);
  }

  return { status: "ok" };
}
