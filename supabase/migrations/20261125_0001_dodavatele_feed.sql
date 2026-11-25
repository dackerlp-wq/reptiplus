begin;

-- Feedy dodavatelů (Heureka XML): položky se denně načítají do supplier_feed_item,
-- v adminu (Produkty → Dodavatelé) se vybírají a zakládají jako produkty.
create table if not exists public.supplier_feed (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  -- Prefix SKU importovaných produktů (např. FP → FP-97112).
  sku_prefix text not null default '',
  is_active boolean not null default true,
  last_fetched_at timestamptz,
  last_error text,
  item_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_feed_item (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.supplier_feed(id) on delete cascade,
  item_id text not null,
  group_id text,
  name text not null,
  url text,
  images text[] not null default '{}',
  vat_rate integer,
  manufacturer text,
  category_text text,
  ean text,
  weight_g numeric(10,1),
  short_description text,
  description text,
  -- Ceny dodavatele bez DPH (hlavní jednotky): velkoobchod = nákup, výchozí = doporučená prodejní.
  wholesale_czk numeric(12,2),
  wholesale_eur numeric(12,2),
  retail_czk numeric(12,2),
  retail_eur numeric(12,2),
  delivery_days integer,
  -- Napojený produkt eshopu (po importu nebo ručním spárování).
  product_id uuid references public.product(id) on delete set null,
  in_feed boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Změna velkoobchodní ceny při posledním načtení (pro filtr „změna ceny").
  prev_wholesale_czk numeric(12,2),
  wholesale_changed_at timestamptz,
  unique (feed_id, item_id)
);

create index if not exists supplier_feed_item_product_idx on public.supplier_feed_item(product_id);
create index if not exists supplier_feed_item_feed_cat_idx on public.supplier_feed_item(feed_id, category_text);

-- Jen service role (admin přes server); žádné veřejné politiky.
alter table public.supplier_feed enable row level security;
alter table public.supplier_feed_item enable row level security;

insert into public.supplier_feed (name, url, sku_prefix)
select 'Farmapython', 'https://feeds.mergado.com/farmapython-cz-heureka-cz-produktovy-cz-6ab9478d255c056cef47c7a66794e25b.xml', 'FP'
where not exists (select 1 from public.supplier_feed where url like '%farmapython%');

commit;
