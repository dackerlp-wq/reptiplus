-- Sklad: deník pohybů zásob (stock_movement), nákupní cena produktu, kontext
-- pro triggery (app.stock_ctx) a RPC apply_stock_change pro ruční změny z adminu.
-- Každá změna product.stock_qty / product_variant.stock_qty vytvoří záznam
-- (trigger); typ/zdroj/autor dodá kontext nastavený RPC, jinak „adj“.
begin;

-- ── Tabulka pohybů ────────────────────────────────────────────────────────
create table if not exists public.stock_movement (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.product(id) on delete cascade,
  variant_id  uuid references public.product_variant(id) on delete set null,
  delta       int  not null,
  qty_after   int,                       -- null u zpětně dopočítané historie
  type        text not null check (type in ('sale','cancel','edit','in','adj','import','writeoff','return','init')),
  order_id    uuid references public."order"(id) on delete set null,
  source      text,                      -- číslo objednávky, název souboru, doklad dodavatele
  author      text,                      -- e-mail admina; null = systém / objednávka
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists stock_movement_product_idx on public.stock_movement (product_id, created_at desc);
create index if not exists stock_movement_created_idx on public.stock_movement (created_at desc);
create index if not exists stock_movement_order_idx   on public.stock_movement (order_id);
alter table public.stock_movement enable row level security;
-- Čte a zapisuje jen service role (admin); žádné veřejné politiky.

-- ── Nákupní cena (volitelná, Kč v haléřích) ───────────────────────────────
alter table public.product add column if not exists purchase_price_czk int;

-- ── Kontext pohybu (nastavují RPC v rámci transakce) ──────────────────────
create or replace function public.stock_ctx()
returns jsonb
language plpgsql
stable
as $$
begin
  return coalesce(nullif(current_setting('app.stock_ctx', true), '')::jsonb, '{}'::jsonb);
exception when others then
  return '{}'::jsonb;
end;
$$;

create or replace function public.stock_ctx_type(ctx jsonb)
returns text
language sql
immutable
as $$
  select case
    when ctx->>'type' in ('sale','cancel','edit','in','adj','import','writeoff','return','init') then ctx->>'type'
    else 'adj'
  end;
$$;

-- ── Triggery: produkt ─────────────────────────────────────────────────────
create or replace function public.log_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ctx jsonb := public.stock_ctx();
begin
  if tg_op = 'INSERT' then
    if coalesce(new.stock_qty, 0) <> 0 then
      insert into public.stock_movement (product_id, variant_id, delta, qty_after, type, author, note)
      values (new.id, null, new.stock_qty, new.stock_qty, 'init', ctx->>'author', 'Založení produktu');
    end if;
    return new;
  end if;
  if new.stock_qty is distinct from old.stock_qty then
    insert into public.stock_movement (product_id, variant_id, delta, qty_after, type, order_id, source, author, note)
    values (
      new.id, null,
      coalesce(new.stock_qty, 0) - coalesce(old.stock_qty, 0), new.stock_qty,
      public.stock_ctx_type(ctx),
      nullif(ctx->>'order_id', '')::uuid,
      nullif(ctx->>'source', ''), nullif(ctx->>'author', ''), nullif(ctx->>'note', '')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists product_stock_log on public.product;
create trigger product_stock_log
  after insert or update of stock_qty on public.product
  for each row execute function public.log_product_stock();

-- ── Triggery: varianta ────────────────────────────────────────────────────
create or replace function public.log_variant_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ctx jsonb := public.stock_ctx();
begin
  if tg_op = 'INSERT' then
    if coalesce(new.stock_qty, 0) <> 0 then
      insert into public.stock_movement (product_id, variant_id, delta, qty_after, type, author, note)
      values (new.product_id, new.id, new.stock_qty, new.stock_qty, 'init', ctx->>'author', 'Založení varianty');
    end if;
    return new;
  end if;
  if new.stock_qty is distinct from old.stock_qty then
    insert into public.stock_movement (product_id, variant_id, delta, qty_after, type, order_id, source, author, note)
    values (
      new.product_id, new.id,
      coalesce(new.stock_qty, 0) - coalesce(old.stock_qty, 0), new.stock_qty,
      public.stock_ctx_type(ctx),
      nullif(ctx->>'order_id', '')::uuid,
      nullif(ctx->>'source', ''), nullif(ctx->>'author', ''), nullif(ctx->>'note', '')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists variant_stock_log on public.product_variant;
create trigger variant_stock_log
  after insert or update of stock_qty on public.product_variant
  for each row execute function public.log_variant_stock();

-- ── RPC: ruční změna skladu z adminu (příjem, oprava, odpis, vrácení, import) ─
-- p_set_qty: nastavit absolutní stav (null = přičíst p_delta). Vrací stav po změně.
create or replace function public.apply_stock_change(
  p_product_id uuid,
  p_variant_id uuid,
  p_delta      int,
  p_set_qty    int,
  p_type       text,
  p_note       text default null,
  p_author     text default null,
  p_source     text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_after int;
begin
  perform set_config('app.stock_ctx', jsonb_build_object(
    'type', p_type, 'note', p_note, 'author', p_author, 'source', p_source
  )::text, true);

  if p_variant_id is not null then
    update public.product_variant
       set stock_qty = greatest(0, case when p_set_qty is not null then p_set_qty else stock_qty + coalesce(p_delta, 0) end)
     where id = p_variant_id and product_id = p_product_id
     returning stock_qty into v_after;
  else
    update public.product
       set stock_qty = greatest(0, case when p_set_qty is not null then p_set_qty else stock_qty + coalesce(p_delta, 0) end)
     where id = p_product_id
     returning stock_qty into v_after;
  end if;
  if v_after is null then
    raise exception 'NOT_FOUND';
  end if;

  perform set_config('app.stock_ctx', '', true);
  return v_after;
end;
$$;

-- ── place_order: kontext „sale“ + navázání pohybů na objednávku ───────────
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

-- ── cancel_unpaid_order: kontext „cancel“ ─────────────────────────────────
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
  v_number text;
begin
  select status::text, payment_status::text, number
    into v_status, v_payment, v_number
    from public."order"
   where id = p_order_id
   for update;
  if not found then return false; end if;
  if v_status <> 'new' or v_payment = 'paid' then return false; end if;

  perform set_config('app.stock_ctx', jsonb_build_object(
    'type', 'cancel', 'order_id', p_order_id, 'source', v_number, 'note', 'Storno nezaplacené objednávky'
  )::text, true);

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

  perform set_config('app.stock_ctx', '', true);
  return true;
end;
$$;

-- ── admin_edit_order_items: kontext „edit“ ────────────────────────────────
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

  perform set_config('app.stock_ctx', '', true);
end;
$$;

-- ── Zpětné dopočítání prodejů z existujících objednávek (bez qty_after) ───
insert into public.stock_movement (product_id, variant_id, delta, qty_after, type, order_id, source, created_at)
select oi.product_id, oi.variant_id, -oi.qty, null, 'sale', o.id, o.number, o.created_at
  from public.order_item oi
  join public."order" o on o.id = oi.order_id
 where oi.product_id is not null
   and oi.qty > 0
   and not exists (
     select 1 from public.stock_movement m
      where m.order_id = o.id and m.type = 'sale' and m.product_id = oi.product_id
        and m.variant_id is not distinct from oi.variant_id
   );

commit;
