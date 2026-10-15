-- Skladem u dodavatele: produkt s příznakem supplier_stock lze objednat i bez
-- vlastního skladu (dodání do 5 pracovních dnů). Sklad pak může jít do záporu
-- (= kusy objednané u dodavatele, které je třeba dodat). RPC place_order
-- a admin_edit_order_items u takových produktů nevyžadují stock_qty >= qty.
begin;

alter table public.product add column if not exists supplier_stock boolean not null default false;

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

  -- Pohyby skladu z této objednávky (trigger): typ prodej, zdroj = číslo objednávky.
  perform set_config('app.stock_ctx', jsonb_build_object('type', 'sale', 'source', v_number)::text, true);

  -- Atomicky sniž sklad; UPDATE drží řádkový zámek do konce transakce.
  for it in select * from jsonb_array_elements(payload->'items') loop
    v_variant := nullif(it->>'variant_id','')::uuid;
    if v_variant is not null then
      update public.product_variant pv
         set stock_qty = stock_qty - (it->>'qty')::int
       where pv.id = v_variant
         and (pv.stock_qty >= (it->>'qty')::int
              or exists (select 1 from public.product p where p.id = pv.product_id and p.supplier_stock));
    else
      update public.product
         set stock_qty = stock_qty - (it->>'qty')::int
       where id = (it->>'product_id')::uuid
         and (stock_qty >= (it->>'qty')::int or supplier_stock);
    end if;
    if not found then
      raise exception 'INSUFFICIENT_STOCK:%', it->>'name';
    end if;
  end loop;

  -- Dárkový poukaz (funkce zrušena v aplikaci, DB logika zachována pro zpětnou kompatibilitu).
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

  -- Pohyby vzniklé výše navázat na ID objednávky.
  update public.stock_movement
     set order_id = v_order
   where order_id is null and type = 'sale' and source = v_number;

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

  perform set_config('app.stock_ctx', '', true);
  return v_number;
end;
$$;

create or replace function public.admin_edit_order_items(
  p_order_id uuid,
  p_items    jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it            jsonb;
  v_variant     uuid;
  v_subtotal    int := 0;
  v_shipping    int;
  v_payment_fee int;
  v_discount    int;
  v_number      text;
begin
  select shipping, payment_fee, discount, number
    into v_shipping, v_payment_fee, v_discount, v_number
    from public."order"
   where id = p_order_id
   for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  perform set_config('app.stock_ctx', jsonb_build_object(
    'type', 'edit', 'order_id', p_order_id, 'source', v_number, 'note', 'Editace položek objednávky'
  )::text, true);

  for it in
    select product_id, variant_id, qty
      from public.order_item
     where order_id = p_order_id
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

  delete from public.order_item where order_id = p_order_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_variant := nullif(it->>'variant_id','')::uuid;
    if v_variant is not null then
      update public.product_variant pv
         set stock_qty = stock_qty - (it->>'qty')::int
       where pv.id = v_variant
         and (pv.stock_qty >= (it->>'qty')::int
              or exists (select 1 from public.product p where p.id = pv.product_id and p.supplier_stock));
    else
      update public.product
         set stock_qty = stock_qty - (it->>'qty')::int
       where id = (it->>'product_id')::uuid
         and (stock_qty >= (it->>'qty')::int or supplier_stock);
    end if;
    if not found then
      raise exception 'INSUFFICIENT_STOCK:%', it->>'name';
    end if;

    v_subtotal := v_subtotal
      + ((it->>'unit_price')::int * (it->>'qty')::int);
  end loop;

  insert into public.order_item
    (order_id, product_id, variant_id, name, sku, unit_price, qty, line_total, vat_rate)
  select p_order_id,
         (elem->>'product_id')::uuid,
         nullif(elem->>'variant_id','')::uuid,
         elem->>'name', nullif(elem->>'sku',''),
         (elem->>'unit_price')::int,
         (elem->>'qty')::int,
         (elem->>'unit_price')::int * (elem->>'qty')::int,
         coalesce(
           nullif(elem->>'vat_rate','')::int,
           (select p.vat_rate from public.product p where p.id = (elem->>'product_id')::uuid),
           21
         )
    from jsonb_array_elements(p_items) as elem;

  update public."order"
     set subtotal = v_subtotal,
         total = greatest(0, v_subtotal + v_shipping + v_payment_fee - v_discount),
         updated_at = now()
   where id = p_order_id;

  perform set_config('app.stock_ctx', '', true);
end;
$$;

commit;
