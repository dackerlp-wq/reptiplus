-- Reptiplus — nastavení (vč. API klíčů), doprava a platební metody
begin;

-- Klíč-hodnota nastavení (integrace/klíče, obecné nastavení). JEN service role.
create table if not exists public.app_setting (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_setting_set_updated_at on public.app_setting;
create trigger app_setting_set_updated_at before update on public.app_setting
  for each row execute function public.set_updated_at();

-- Dopravci / platební providery
do $$ begin
  create type public.carrier as enum ('ppl','zasilkovna','balikovna','personal','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_provider as enum ('comgate','cod','bank_transfer');
exception when duplicate_object then null; end $$;

create table if not exists public.shipping_method (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name_i18n  jsonb not null default '{}'::jsonb,
  carrier    public.carrier not null default 'other',
  price_czk  integer not null default 0,
  price_eur  integer,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_method (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name_i18n  jsonb not null default '{}'::jsonb,
  provider   public.payment_provider not null default 'comgate',
  fee_czk    integer not null default 0,
  fee_eur    integer,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Objednávka: tracking + interní poznámka pro admin
alter table public."order" add column if not exists tracking_number text;
alter table public."order" add column if not exists admin_note text;

-- RLS
alter table public.app_setting enable row level security;      -- žádná policy → jen service role
alter table public.shipping_method enable row level security;
alter table public.payment_method enable row level security;

create policy "shipping public read" on public.shipping_method
  for select using (is_active = true);
create policy "payment public read" on public.payment_method
  for select using (is_active = true);

commit;
