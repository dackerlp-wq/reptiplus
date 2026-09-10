-- LEDX: překlady řad (EN/DE), jazyk + antispam u poptávek.

-- Překlady textů řady: {"en": {...}, "de": {...}}; klíče = názvy sloupců
-- (subtitle, tagline, landing_desc, landing_pills, detail_lead, detail_pills,
--  models_note, models, params, uses_title, uses, form_models, form_cct,
--  form_cct_fixed, form_uhel). Čeština zůstává v základních sloupcích = fallback.
alter table public.ledx_line
  add column if not exists translations jsonb not null default '{}';

-- Poptávky: jazyk webu, ze kterého přišla (odpovídat ve stejném jazyce),
-- a hash IP adresy pro rate limit (neukládáme IP v čitelné podobě).
alter table public.ledx_inquiry
  add column if not exists locale text not null default 'cs',
  add column if not exists ip_hash text;

create index if not exists ledx_inquiry_ip_idx
  on public.ledx_inquiry (ip_hash, created_at desc);
create index if not exists ledx_inquiry_email_idx
  on public.ledx_inquiry (email, created_at desc);
create index if not exists ledx_inquiry_open_idx
  on public.ledx_inquiry (handled) where handled = false;
