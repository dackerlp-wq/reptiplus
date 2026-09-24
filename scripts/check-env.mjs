// Kontrola a oprava .env.local před `npm run dev` (spouští se jako `predev`).
// Řeší typické chyby na Windows: soubor uložený jako .env.local.txt, kódování UTF-16
// (Poznámkový blok „Unicode“, Out-File), chybějící soubor, chybějící proměnné.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, ".env.local");
const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const TEMPLATE = `# Lokální prostředí (soubor není v Gitu). Tajné klíče: Supabase → Project Settings → API Keys.
NEXT_PUBLIC_SUPABASE_URL=https://duaihkobtgfzprufqjmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_KGZBXh6sBM29vJmsPyU6Iw_vKr5YrPv
# Service role (secret) — bez něj nefunguje admin, hostovský košík ani e-maily:
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
`;

const log = (m) => console.log(`[env] ${m}`);
const warn = (m) => console.warn(`[env] ⚠ ${m}`);

// 1) Špatný název souboru (.env.local.txt, env.local, .env.local.env …)
if (!existsSync(envPath)) {
  for (const alt of [".env.local.txt", "env.local", "env.local.txt", ".env.local.env", ".env.local.txt.txt"]) {
    const p = resolve(root, alt);
    if (existsSync(p)) {
      renameSync(p, envPath);
      log(`Soubor „${alt}“ přejmenován na „.env.local“.`);
      break;
    }
  }
}

// 2) Chybějící soubor → založit šablonu
if (!existsSync(envPath)) {
  writeFileSync(envPath, TEMPLATE, "utf8");
  warn("Soubor .env.local neexistoval, založil jsem ho s veřejnými klíči. Doplň SUPABASE_SERVICE_ROLE_KEY.");
}

// 3) Kódování: UTF-16 (BOM FF FE / FE FF nebo nulové bajty) → převést na UTF-8
let buf = readFileSync(envPath);
let text;
if ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff) || buf.includes(0)) {
  const le = !(buf[0] === 0xfe && buf[1] === 0xff);
  const body = buf[0] === 0xff || buf[0] === 0xfe ? buf.subarray(2) : buf;
  text = le ? body.toString("utf16le") : Buffer.from(body).swap16().toString("utf16le");
  writeFileSync(envPath, text, "utf8");
  log("Soubor .env.local byl v UTF-16, převeden na UTF-8 (Next.js UTF-16 neumí číst).");
} else {
  text = buf.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
    writeFileSync(envPath, text, "utf8");
    log("Odstraněn BOM ze začátku .env.local.");
  }
}

// 4) Rozparsovat a zkontrolovat proměnné (tolerantně: mezery kolem =, uvozovky)
const vars = {};
let fixed = false;
const lines = text.split(/\r?\n/).map((line) => {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!m) return line;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  const norm = `${m[1]}=${v}`;
  if (norm !== line) fixed = true;
  vars[m[1]] = v;
  return norm;
});
if (fixed) {
  writeFileSync(envPath, lines.join("\n"), "utf8");
  log("Upraven formát řádků v .env.local (mezery kolem „=“, uvozovky).");
}

const missing = REQUIRED.filter((k) => !vars[k]);
if (missing.length) {
  warn(`V .env.local chybí nebo je prázdné: ${missing.join(", ")}.`);
  if (missing.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    warn("Service role klíč: Supabase → projekt Reptiplus → Project Settings → API Keys → service_role (secret).");
  }
  if (missing.includes("NEXT_PUBLIC_SUPABASE_URL")) {
    warn("Bez NEXT_PUBLIC_SUPABASE_URL web nenastartuje (chyba „supabaseUrl is required“).");
  }
} else {
  log("OK — .env.local je v pořádku.");
}
