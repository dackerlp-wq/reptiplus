-- Objednávky: jazyk zákazníka, sazby DPH, historie objednávky, faktury a dobropisy.
begin;

-- 1) Jazyk, ve kterém zákazník objednal (e-maily a odkazy v jeho jazyce).
alter table public."order"
  add column if not exists locale text not null default 'cs';
update public."order" set locale = 'en' where currency <> 'CZK' and locale = 'cs';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_locale_check') then
    alter table public."order"
      add constraint order_locale_check check (locale in ('cs', 'en', 'de'));
  end if;
end $$;

-- 2) Sazba DPH: na produktu (výchozí 21 %), snapshot na položce objednávky.
alter table public.product
  add column if not exists vat_rate integer not null default 21;
alter table public.order_item
  add column if not exists vat_rate integer not null default 21;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_vat_rate_check') then
    alter table public.product
      add constraint product_vat_rate_check check (vat_rate in (0, 12, 21));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_item_vat_rate_check') then
    alter table public.order_item
      add constraint order_item_vat_rate_check check (vat_rate in (0, 12, 21));
  end if;
end $$;

-- 3) place_order: ukládat locale objednávky a vat_rate položek (z payloadu,
--    fallback na sazbu produktu). Zbytek beze změny.
create or replace function public.place_order(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  it        jsonb;
  v_order   uuid;
  v_number  text := payload->>'number';
  v_disc_id uuid := nullif(payload->>'discount_code_id','')::uuid;
  v_cart    uuid := nullif(payload->>'cart_id','')::uuid;
  v_variant uuid;
  v_locale  text := coalesce(nullif(payload->>'locale',''), 'cs');
begin
  if v_locale not in ('cs', 'en', 'de') then v_locale := 'cs'; end if;

  -- Atomicky sniž sklad; UPDATE drží řádkový zámek do konce transakce.
  for it in select * from jsonb_array_elements(payload->'items') loop
    v_variant := nullif(it->>'variant_id','')::uuid;
    if v_variant is not null then
      update public.product_variant
         set stock_qty = stock_qty - (it->>'qty')::int
       where id = v_variant
         and stock_qty >= (it->>'qty')::int;
    else
      update public.product
         set stock_qty = stock_qty - (it->>'qty')::int
       where id = (it->>'product_id')::uuid
         and stock_qty >= (it->>'qty')::int;
    end if;
    if not found then
      raise exception 'INSUFFICIENT_STOCK:%', it->>'name';
    end if;
  end loop;

  insert into public."order" (
    number, customer_id, email, status, payment_status,
    subtotal, shipping, discount, total, currency,
    discount_code_id, shipping_method, payment_method, payment_fee,
    billing_address, shipping_address, note, locale
  ) values (
    v_number,
    nullif(payload->>'customer_id','')::uuid,
    payload->>'email', 'new', 'pending',
    (payload->>'subtotal')::int, (payload->>'shipping')::int,
    (payload->>'discount')::int, (payload->>'total')::int,
    payload->>'currency',
    v_disc_id, payload->>'shipping_method', payload->>'payment_method',
    coalesce((payload->>'payment_fee')::int, 0),
    payload->'billing_address', payload->'shipping_address',
    nullif(payload->>'note',''), v_locale
  ) returning id into v_order;

  insert into public.order_item (order_id, product_id, variant_id, name, sku, unit_price, qty, line_total, vat_rate)
  select v_order,
         (elem->>'product_id')::uuid,
         nullif(elem->>'variant_id','')::uuid,
         elem->>'name', nullif(elem->>'sku',''),
         (elem->>'unit_price')::int, (elem->>'qty')::int, (elem->>'line_total')::int,
         coalesce(
           nullif(elem->>'vat_rate','')::int,
           (select p.vat_rate from public.product p where p.id = (elem->>'product_id')::uuid),
           21
         )
    from jsonb_array_elements(payload->'items') as elem;

  if v_disc_id is not null then
    update public.discount_code set used_count = used_count + 1 where id = v_disc_id;
  end if;

  if v_cart is not null then
    delete from public.cart_item where cart_id = v_cart;
    delete from public.cart where id = v_cart;
  end if;

  return v_number;
end;
$$;

revoke all on function public.place_order(jsonb) from public;
revoke all on function public.place_order(jsonb) from anon;
revoke all on function public.place_order(jsonb) from authenticated;
grant execute on function public.place_order(jsonb) to service_role;

-- 4) Historie objednávky (stavy, platby, e-maily, zásilky, faktury, poznámky).
create table if not exists public.order_event (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public."order" (id) on delete cascade,
  type text not null check (type in ('note', 'status', 'payment', 'email', 'shipment', 'invoice', 'refund', 'system')),
  body text,
  meta jsonb not null default '{}',
  author_id uuid,
  author_email text,
  created_at timestamptz not null default now()
);
alter table public.order_event enable row level security;
-- Bez public policies → jen service role (admin).
create index if not exists order_event_order_idx
  on public.order_event (order_id, created_at desc);

-- 5) Faktury a dobropisy — neměnný snapshot dokladu.
create table if not exists public.invoice (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  type text not null check (type in ('invoice', 'credit_note')),
  order_id uuid not null references public."order" (id) on delete restrict,
  related_invoice_id uuid references public.invoice (id),   -- dobropis → původní faktura
  issued_at date not null default current_date,
  taxable_date date not null default current_date,           -- DUZP
  due_date date,
  paid_at date,
  currency text not null,
  subtotal integer not null,        -- základ daně celkem (minor units)
  vat_total integer not null,       -- DPH celkem (minor units)
  total integer not null,           -- celkem s DPH (minor units, u dobropisu kladné)
  vat_breakdown jsonb not null default '[]',   -- [{rate, base, vat, total}]
  exchange_rate numeric(10, 3),     -- CZK za 1 EUR (jen doklady v EUR, kurz ČNB k DUZP)
  vat_total_czk integer,            -- DPH přepočtená do CZK (jen EUR doklady)
  seller jsonb not null,
  buyer jsonb not null,
  items jsonb not null,             -- [{name, sku, qty, unit_price, line_total, vat_rate, base, vat}]
  payment_method text,
  variable_symbol text,
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.invoice enable row level security;
-- Zákazník vidí doklady ke svým objednávkám (účet); zápis jen service role.
drop policy if exists "invoice owner read" on public.invoice;
create policy "invoice owner read" on public.invoice
  for select using (
    exists (
      select 1 from public."order" o
       where o.id = invoice.order_id and o.customer_id = auth.uid()
    )
  );
create index if not exists invoice_order_idx on public.invoice (order_id);
create index if not exists invoice_type_issued_idx on public.invoice (type, issued_at desc);

-- 6) Číselná řada po rocích — atomické přidělení čísla.
create table if not exists public.invoice_counter (
  series text not null,             -- 'invoice' | 'credit_note'
  year integer not null,
  last_number integer not null default 0,
  primary key (series, year)
);
alter table public.invoice_counter enable row level security;

create or replace function public.next_invoice_number(p_series text, p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  insert into public.invoice_counter (series, year, last_number)
  values (p_series, p_year, 1)
  on conflict (series, year)
  do update set last_number = public.invoice_counter.last_number + 1
  returning last_number into v;
  return v;
end;
$$;

revoke all on function public.next_invoice_number(text, integer) from public;
revoke all on function public.next_invoice_number(text, integer) from anon;
revoke all on function public.next_invoice_number(text, integer) from authenticated;
grant execute on function public.next_invoice_number(text, integer) to service_role;

commit;
