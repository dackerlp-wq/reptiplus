-- Zákaznický účet: firemní údaje u adres, hlídání skladu, vlastní recenze.
begin;

-- 1) Adresy: firemní údaje (na fakturu) + štítek pro rozlišení v účtu.
alter table public.address
  add column if not exists ico text,
  add column if not exists dic text,
  add column if not exists label text,
  add column if not exists created_at timestamptz not null default now();

-- 2) Objednávky: fk na zákazníka nesmí bránit smazání účtu (objednávka zůstane bez vazby).
do $$
begin
  if exists (
    select 1 from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     where c.conname = 'order_customer_id_fkey' and t.relname = 'order'
       and c.confdeltype <> 'n'
  ) then
    alter table public."order" drop constraint order_customer_id_fkey;
    alter table public."order"
      add constraint order_customer_id_fkey
      foreign key (customer_id) references public.customer (id) on delete set null;
  end if;
end $$;

-- 3) Recenze: vlastník vidí i své neschválené a může smazat.
drop policy if exists "review owner read" on public.review;
create policy "review owner read" on public.review
  for select using (customer_id = auth.uid());
drop policy if exists "review owner delete" on public.review;
create policy "review owner delete" on public.review
  for delete using (customer_id = auth.uid());

-- 4) Hlídání skladu („dejte mi vědět, až bude skladem").
create table if not exists public.stock_alert (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product (id) on delete cascade,
  variant_id uuid references public.product_variant (id) on delete cascade,
  email text not null,
  customer_id uuid references public.customer (id) on delete set null,
  locale text not null default 'cs',
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
alter table public.stock_alert enable row level security;
-- Bez public policies → zápis i čtení jen service role (Server Action / admin).
create unique index if not exists stock_alert_unique_idx
  on public.stock_alert (product_id, variant_id, email) nulls not distinct;
create index if not exists stock_alert_open_idx
  on public.stock_alert (product_id) where notified_at is null;

commit;
