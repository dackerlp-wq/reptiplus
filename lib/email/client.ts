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

export type MailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
};

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
};

/** Odesílatel se zobrazeným jménem obchodu („Reptiplus <info@…>"). */
function fromAddress(): string {
  const raw = process.env.MAIL_FROM || process.env.SMTP_USER!;
  if (/</.test(raw)) return raw; // už obsahuje jméno
  const name = process.env.MAIL_FROM_NAME || "Reptiplus";
  return `"${name.replace(/"/g, "")}" <${raw}>`;
}

/** Odešle e-mail. Vrací true při úspěchu; chyby nepropadají ven (neblokuje flow). */
export async function sendMail(input: MailInput): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] SMTP nenakonfigurováno — přeskočeno: "${input.subject}"`);
    return false;
  }
  try {
    await tx.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content),
        contentType: a.contentType ?? "application/pdf",
      })),
    });
    return true;
  } catch (e) {
    console.error("[email] Odeslání selhalo:", e);
    return false;
  }
}
