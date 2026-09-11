-- LEDX poptávky: workflow stavů, nabídka, follow-up, historie událostí.
begin;

-- Stav místo boolean `handled` (sloupec zůstává kvůli zpětné kompatibilitě,
-- kód ho už nečte; drží se v souladu triggerem níže).
alter table public.ledx_inquiry
  add column if not exists status text not null default 'new',
  add column if not exists quote_amount integer,          -- minor units (haléře / centy)
  add column if not exists quote_currency text,           -- CZK | EUR
  add column if not exists quote_valid_until date,
  add column if not exists quote_number text,
  add column if not exists follow_up_at date,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists anonymized_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ledx_inquiry_status_check'
  ) then
    alter table public.ledx_inquiry
      add constraint ledx_inquiry_status_check
      check (status in ('new', 'in_progress', 'quoted', 'won', 'lost', 'cancelled'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'ledx_inquiry_quote_currency_check'
  ) then
    alter table public.ledx_inquiry
      add constraint ledx_inquiry_quote_currency_check
      check (quote_currency is null or quote_currency in ('CZK', 'EUR'));
  end if;
end $$;

-- Dosud „vyřízené" poptávky → uzavřené (objednáno); nevyřízené zůstávají nové.
update public.ledx_inquiry set status = 'won'
 where handled = true and status = 'new';

-- `handled` = uzavřený stav (won / lost / cancelled), ať staré dotazy dál fungují.
create or replace function public.ledx_inquiry_sync_handled()
returns trigger
language plpgsql
as $$
begin
  new.handled := new.status in ('won', 'lost', 'cancelled');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ledx_inquiry_sync_handled on public.ledx_inquiry;
create trigger ledx_inquiry_sync_handled
  before insert or update on public.ledx_inquiry
  for each row execute function public.ledx_inquiry_sync_handled();

create index if not exists ledx_inquiry_status_idx
  on public.ledx_inquiry (status, created_at desc);
create index if not exists ledx_inquiry_follow_up_idx
  on public.ledx_inquiry (follow_up_at)
  where follow_up_at is not null;

-- Historie poptávky: interní poznámky, změny stavu, odeslané e-maily, nabídky.
create table if not exists public.ledx_inquiry_event (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.ledx_inquiry (id) on delete cascade,
  type text not null check (type in ('note', 'status', 'email', 'quote', 'follow_up', 'system')),
  body text,                          -- text poznámky / tělo e-mailu
  meta jsonb not null default '{}',   -- {from,to,status,subject,kind,amount,currency,...}
  author_id uuid,
  author_email text,
  created_at timestamptz not null default now()
);

alter table public.ledx_inquiry_event enable row level security;
-- Bez public policies → čte/zapisuje jen service role (admin).

create index if not exists ledx_inquiry_event_inquiry_idx
  on public.ledx_inquiry_event (inquiry_id, created_at desc);

commit;
