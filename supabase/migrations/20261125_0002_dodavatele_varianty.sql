begin;

-- Položka feedu napojená na variantu produktu (skupina ITEMGROUP_ID → jeden produkt s variantami).
alter table public.supplier_feed_item
  add column if not exists variant_id uuid references public.product_variant(id) on delete set null;
create index if not exists supplier_feed_item_group_idx on public.supplier_feed_item(feed_id, group_id);

commit;
