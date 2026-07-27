begin;

-- Historie cen produktů — pro zobrazení „nejnižší cena za 30 dní" u slev
-- (povinnost dle směrnice Omnibus / § 12a zákona o ochraně spotřebitele).
create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product(id) on delete cascade,
  price_czk integer not null,
  price_eur integer,
  recorded_at timestamptz not null default now()
);

create index if not exists price_history_product_idx
  on public.product_price_history (product_id, recorded_at desc);

alter table public.product_price_history enable row level security;
drop policy if exists price_history_read on public.product_price_history;
-- Ceny jsou veřejné → čtení pro všechny (výpočet minima na detailu produktu).
create policy price_history_read on public.product_price_history
  for select using (true);

-- Výchozí záznam = aktuální ceny (aby bylo z čeho počítat hned od začátku).
insert into public.product_price_history (product_id, price_czk, price_eur)
select id, price_czk, price_eur from public.product where price_czk > 0;

commit;
