begin;

-- Pohled na prodanost produktů (oblíbenost) — suma prodaných kusů z platných
-- objednávek (mimo zrušené/vrácené). Používá se v adminu pro řazení a metriku.
create or replace view public.product_sales
with (security_invoker = on) as
select oi.product_id,
       coalesce(sum(oi.qty), 0)::int as sold
from public.order_item oi
join public."order" o on o.id = oi.order_id
where oi.product_id is not null
  and o.status not in ('cancelled', 'refunded')
group by oi.product_id;

-- Neveřejné — čte jen server přes service role (bulk agregace prodejů).
revoke all on public.product_sales from anon, authenticated;
grant select on public.product_sales to service_role;

commit;
