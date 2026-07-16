-- Reptiplus — úklid opuštěných hostových košíků (volá se z cronu).
-- Smaže guest košíky (customer_id null) bez aktivity starší než p_days dní.
-- cart_item se smaže kaskádou (FK on delete cascade).
begin;

create or replace function public.cleanup_abandoned_carts(p_days int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  with del as (
    delete from public.cart c
    where c.customer_id is null
      and coalesce(
        (select max(added_at) from public.cart_item where cart_id = c.id),
        c.created_at
      ) < now() - make_interval(days => p_days)
    returning 1
  )
  select count(*) into v_deleted from del;
  return v_deleted;
end;
$$;

-- Jen service role (volá se ze serverového cron endpointu).
revoke all on function public.cleanup_abandoned_carts(int) from public;
revoke all on function public.cleanup_abandoned_carts(int) from anon;
revoke all on function public.cleanup_abandoned_carts(int) from authenticated;
grant execute on function public.cleanup_abandoned_carts(int) to service_role;

commit;
