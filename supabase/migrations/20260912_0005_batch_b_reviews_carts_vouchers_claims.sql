-- Dávka B: ověřený nákup u recenzí, připomínka opuštěného košíku, limit skladu na produktu,
-- dárkové poukazy (nákup + uplatnění v pokladně), reklamace / odstoupení od smlouvy.
begin;

-- 1) Recenze: štítek „ověřený nákup“ (plní se při uložení recenze).
alter table public.review add column if not exists verified_purchase boolean not null default false;

-- 2) Košík: kdy byl poslán e-mail o opuštěném košíku (jen jednou na košík).
alter table public.cart add column if not exists reminder_sent_at timestamptz;

-- 3) Produkt: limit docházejícího skladu, kdy jsme naposledy upozornili, příznak dárkového poukazu.
alter table public.product add column if not exists low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0);
alter table public.product add column if not exists low_stock_notified_at timestamptz;
alter table public.product add column if not exists is_gift_voucher boolean not null default false;

-- 4) Dárkové poukazy. Hodnota i zůstatek v CZK haléřích; v EUR objednávce se přepočítá kurzem ČNB.
create table if not exists public.gift_voucher (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  value integer not null check (value > 0),
  balance integer not null check (balance >= 0),
  status text not null default 'active' check (status in ('active', 'used', 'cancelled', 'expired')),
  valid_to date,
  order_id uuid references public."order" (id) on delete set null,   -- objednávka, kterou byl poukaz koupen
  recipient_name text,
  recipient_email text,
  message text,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gift_voucher enable row level security;
-- Bez public policies → jen service role.
create index if not exists gift_voucher_order_idx on public.gift_voucher (order_id);
create index if not exists gift_voucher_status_idx on public.gift_voucher (status, created_at desc);

create table if not exists public.gift_voucher_redemption (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.gift_voucher (id) on delete cascade,
  order_id uuid not null references public."order" (id) on delete cascade,
  amount_czk integer not null check (amount_czk > 0),   -- čerpáno ze zůstatku (CZK haléře)
  amount integer not null check (amount > 0),           -- v měně objednávky
  created_at timestamptz not null default now()
);
alter table public.gift_voucher_redemption enable row level security;
create index if not exists gift_voucher_redemption_order_idx on public.gift_voucher_redemption (order_id);

alter table public."order" add column if not exists voucher_id uuid references public.gift_voucher (id) on delete set null;
alter table public."order" add column if not exists voucher_amount integer not null default 0;   -- v měně objednávky

-- 5) place_order: navíc uplatnění poukazu (atomicky proti zůstatku).
create or replace function public.place_order(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  it            jsonb;
  v_order       uuid;
  v_number      text := payload->>'number';
  v_disc_id     uuid := nullif(payload->>'discount_code_id','')::uuid;
  v_cart        uuid := nullif(payload->>'cart_id','')::uuid;
  v_variant     uuid;
  v_locale      text := coalesce(nullif(payload->>'locale',''), 'cs');
  v_voucher     uuid := nullif(payload->>'voucher_id','')::uuid;
  v_voucher_amt int  := coalesce(nullif(payload->>'voucher_amount','')::int, 0);
  v_voucher_czk int  := coalesce(nullif(payload->>'voucher_amount_czk','')::int, 0);
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

  -- Dárkový poukaz: odečti ze zůstatku (jen aktivní, platný, s dostatečným zůstatkem).
  if v_voucher is not null and v_voucher_czk > 0 then
    update public.gift_voucher
       set balance = balance - v_voucher_czk,
           status = case when balance - v_voucher_czk = 0 then 'used' else status end,
           updated_at = now()
     where id = v_voucher
       and status = 'active'
       and balance >= v_voucher_czk
       and (valid_to is null or valid_to >= current_date);
    if not found then
      raise exception 'VOUCHER_INVALID';
    end if;
  else
    v_voucher := null;
    v_voucher_amt := 0;
    v_voucher_czk := 0;
  end if;

  insert into public."order" (
    number, customer_id, email, status, payment_status,
    subtotal, shipping, discount, total, currency,
    discount_code_id, shipping_method, payment_method, payment_fee,
    billing_address, shipping_address, note, locale,
    voucher_id, voucher_amount
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
    nullif(payload->>'note',''), v_locale,
    v_voucher, v_voucher_amt
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

  if v_voucher is not null then
    insert into public.gift_voucher_redemption (voucher_id, order_id, amount_czk, amount)
    values (v_voucher, v_order, v_voucher_czk, v_voucher_amt);
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

-- 6) Storno nezaplacené objednávky vrací i čerpání poukazu.
create or replace function public.cancel_unpaid_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  r  record;
  v_status text;
  v_payment text;
begin
  select status::text, payment_status::text
    into v_status, v_payment
    from public."order"
   where id = p_order_id
   for update;
  if not found then return false; end if;
  if v_status <> 'new' or v_payment = 'paid' then return false; end if;

  for it in
    select to_jsonb(oi) from public.order_item oi where oi.order_id = p_order_id
  loop
    if (it->>'variant_id') is not null then
      update public.product_variant
         set stock_qty = stock_qty + (it->>'qty')::int
       where id = (it->>'variant_id')::uuid;
    elsif (it->>'product_id') is not null then
      update public.product
         set stock_qty = stock_qty + (it->>'qty')::int
       where id = (it->>'product_id')::uuid;
    end if;
  end loop;

  for r in select voucher_id, amount_czk from public.gift_voucher_redemption where order_id = p_order_id loop
    update public.gift_voucher
       set balance = balance + r.amount_czk,
           status = case when status = 'used' then 'active' else status end,
           updated_at = now()
     where id = r.voucher_id;
  end loop;
  delete from public.gift_voucher_redemption where order_id = p_order_id;

  update public."order"
     set status = 'cancelled',
         payment_status = 'failed',
         updated_at = now()
   where id = p_order_id;
  return true;
end;
$$;

revoke all on function public.cancel_unpaid_order(uuid) from public;
revoke all on function public.cancel_unpaid_order(uuid) from anon;
revoke all on function public.cancel_unpaid_order(uuid) from authenticated;
grant execute on function public.cancel_unpaid_order(uuid) to service_role;

-- 7) Reklamace a odstoupení od smlouvy (formuláře na webu, vyřizování v adminu).
create table if not exists public.claim (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('claim', 'withdrawal')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'rejected')),
  order_number text not null,
  order_id uuid references public."order" (id) on delete set null,
  customer_id uuid references public.customer (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  items text not null,
  reason text,
  bank_account text,
  locale text not null default 'cs',
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.claim enable row level security;
-- Bez public policies → jen service role.
create index if not exists claim_status_idx on public.claim (status, created_at desc);
create index if not exists claim_order_idx on public.claim (order_id);

commit;
