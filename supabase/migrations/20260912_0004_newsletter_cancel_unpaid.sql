-- Newsletter s potvrzením (double opt-in) + rušení nezaplacených objednávek s vrácením skladu.
begin;

-- 1) Newsletter: token pro potvrzení / odhlášení, jazyk, přidělený slevový kód.
alter table public.newsletter_subscriber
  add column if not exists token text,
  add column if not exists locale text not null default 'cs',
  add column if not exists confirmed_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists discount_code_id uuid references public.discount_code (id) on delete set null,
  add column if not exists customer_id uuid references public.customer (id) on delete set null;
create unique index if not exists newsletter_subscriber_token_idx
  on public.newsletter_subscriber (token) where token is not null;

-- 2) Zrušení nezaplacené objednávky: atomicky vrátí sklad a nastaví stav.
--    Vrací true, pokud se objednávka zrušila (jinak už nebyla „nová" / byla zaplacená).
create or replace function public.cancel_unpaid_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
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

commit;
