import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// SMTP transporter z env (Forpsi: smtp.forpsi.com:587 STARTTLS).
// Bez konfigurace e-mail tiše přeskočíme (např. lokální vývoj bez SMTP).
let cached: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!host || !user || !pass) return null;

  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit SSL; 587 = STARTTLS (requireTLS níže)
    requireTLS: port === 587,
    auth: { user, pass },
    // Timeouty, ať nedostupný SMTP nezablokuje pokladnu
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return cached;
}

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/** Odešle e-mail. Vrací true při úspěchu; chyby nepropadají ven (neblokuje flow). */
export async function sendMail(input: MailInput): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] SMTP nenakonfigurováno — přeskočeno: "${input.subject}"`);
    return false;
  }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER!;
  try {
    await tx.sendMail({ from, ...input });
    return true;
  } catch (e) {
    console.error("[email] Odeslání selhalo:", e);
    return false;
  }
}
