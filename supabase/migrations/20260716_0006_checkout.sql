-- Reptiplus — pokladna: platební sloupce na objednávce, seed dopravy/plateb,
-- atomická funkce place_order (race-safe vytvoření objednávky + snížení skladu).
begin;

-- 1) Objednávka: uchovat zvolenou platební metodu a její poplatek
alter table public."order" add column if not exists payment_method text;
alter table public."order" add column if not exists payment_fee integer not null default 0;

-- Pozn.: dopravní a platební metody se spravují v admin panelu (tabulky
-- shipping_method / payment_method), do schématu migrace je neseedujeme.

-- 2) Atomické vytvoření objednávky. Vše v jedné transakci:
--    - řádkový zámek + kontrola/snížení skladu (nelze přeprodat),
--    - vložení objednávky + položek (ceny počítá server, funkce jim věří),
--    - navýšení použití slevového kódu, vyprázdnění košíku.
--    Jakákoli chyba (např. nedostatek skladu) → rollback celé transakce.
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
begin
  -- Atomicky sniž sklad; UPDATE drží řádkový zámek do konce transakce.
  for it in select * from jsonb_array_elements(payload->'items') loop
    update public.product
       set stock_qty = stock_qty - (it->>'qty')::int
     where id = (it->>'product_id')::uuid
       and stock_qty >= (it->>'qty')::int;
    if not found then
      raise exception 'INSUFFICIENT_STOCK:%', it->>'name';
    end if;
  end loop;

  insert into public."order" (
    number, customer_id, email, status, payment_status,
    subtotal, shipping, discount, total, currency,
    discount_code_id, shipping_method, payment_method, payment_fee,
    billing_address, shipping_address, note
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
    nullif(payload->>'note','')
  ) returning id into v_order;

  insert into public.order_item (order_id, product_id, variant_id, name, sku, unit_price, qty, line_total)
  select v_order,
         (elem->>'product_id')::uuid,
         nullif(elem->>'variant_id','')::uuid,
         elem->>'name', nullif(elem->>'sku',''),
         (elem->>'unit_price')::int, (elem->>'qty')::int, (elem->>'line_total')::int
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

-- Funkci smí volat jen service role (server). Nikdy anon/authenticated —
-- ceny počítá server, klient nesmí objednávku zkonstruovat přímo.
revoke all on function public.place_order(jsonb) from public;
revoke all on function public.place_order(jsonb) from anon;
revoke all on function public.place_order(jsonb) from authenticated;
grant execute on function public.place_order(jsonb) to service_role;

commit;
