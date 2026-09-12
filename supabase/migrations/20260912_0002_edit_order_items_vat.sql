-- admin_edit_order_items: ukládat sazbu DPH položky (z payloadu, jinak z produktu).
begin;

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
begin
  select shipping, payment_fee, discount
    into v_shipping, v_payment_fee, v_discount
    from public."order"
   where id = p_order_id
   for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

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
end;
$$;

revoke all on function public.admin_edit_order_items(uuid, jsonb) from public;
revoke all on function public.admin_edit_order_items(uuid, jsonb) from anon;
revoke all on function public.admin_edit_order_items(uuid, jsonb) from authenticated;
grant execute on function public.admin_edit_order_items(uuid, jsonb) to service_role;

commit;
