-- Reptiplus — upsell: doporučené produkty k produktu (ruční výběr v adminu).
begin;

create table if not exists public.product_upsell (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.product(id) on delete cascade,
  upsell_product_id uuid not null references public.product(id) on delete cascade,
  sort_order        int not null default 0,
  unique (product_id, upsell_product_id)
);

create index if not exists product_upsell_product_idx
  on public.product_upsell(product_id);

alter table public.product_upsell enable row level security;
drop policy if exists "upsell public read" on public.product_upsell;
create policy "upsell public read" on public.product_upsell for select using (true);

commit;
