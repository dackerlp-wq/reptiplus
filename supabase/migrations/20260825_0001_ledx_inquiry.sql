-- Poptávky prémiového osvětlení LEDX (formulář u řad na stránce Profi osvětlení).
create table if not exists public.ledx_inquiry (
  id uuid primary key default gen_random_uuid(),
  rada text,
  model text,
  cct text,
  uhel text,
  pocet integer,
  stmivani text,
  poznamka text,
  name text not null,
  email text not null,
  phone text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ledx_inquiry enable row level security;
-- Bez public policies → čte/zapisuje jen service role (admin + Server Action).

create index if not exists ledx_inquiry_created_idx on public.ledx_inquiry (created_at desc);
