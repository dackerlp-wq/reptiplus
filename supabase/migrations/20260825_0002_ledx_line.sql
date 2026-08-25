-- Řady prémiového osvětlení LEDX — spravovatelné v adminu.
create table if not exists public.ledx_line (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  name text not null,
  subtitle text,
  tagline text,
  landing_desc text,
  landing_pills jsonb not null default '[]',
  detail_lead text,
  detail_pills jsonb not null default '[]',
  models_note text,
  models jsonb not null default '[]',        -- [[model, výkon, tok, rozměry, hmotnost], ...]
  params jsonb not null default '[]',        -- [[klíč, hodnota], ...]
  uses_title text,
  uses jsonb not null default '[]',
  images jsonb not null default '[]',        -- [url, ...] (první = hlavní)
  form_models jsonb not null default '[]',
  form_cct jsonb not null default '[]',
  form_cct_fixed text,                        -- pokud vyplněno, barva světla je pevná (Grow)
  form_uhel jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.ledx_line enable row level security;
-- Veřejné čtení publikovaných řad (stránka Profi osvětlení).
drop policy if exists ledx_line_public_read on public.ledx_line;
create policy ledx_line_public_read on public.ledx_line
  for select using (is_published = true);

create index if not exists ledx_line_sort_idx on public.ledx_line (sort_order);
