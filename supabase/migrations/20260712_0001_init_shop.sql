-- Reptiplus — initial e-shop schema (v1)
-- Trh CZ+SK, měna CZK. Ceny ukládané v HALÉŘÍCH (integer), currency default 'CZK'.
-- Idempotentní kde to jde. Spouštět v transakci.

begin;

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists unaccent with schema extensions;

-- ── Enums ─────────────────────────────────────────────────────────────────
do $$ begin
  create type public.order_status as enum
    ('new','paid','processing','shipped','delivered','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum
    ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('percent','fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.address_type as enum ('billing','shipping');
exception when duplicate_object then null; end $$;

-- ── Helper functions ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.products_search_vector_update()
returns trigger language plpgsql
set search_path = public, extensions as $$
begin
  new.search_vector :=
    to_tsvector('simple',
      unaccent(coalesce(new.name,'') || ' ' || coalesce(new.description,'')));
  return new;
end $$;

-- ── Catalog ───────────────────────────────────────────────────────────────
create table if not exists public.brand (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  logo_url     text,
  description  text,
  is_published boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.category (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  parent_id    uuid references public.category(id) on delete set null,
  image_url    text,
  description  text,
  sort_order   int not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists category_parent_idx on public.category(parent_id);

create table if not exists public.product (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  brand_id      uuid references public.brand(id) on delete set null,
  category_id   uuid references public.category(id) on delete set null,
  base_price    integer not null default 0,   -- v haléřích
  currency      text not null default 'CZK',
  sku           text unique,
  ean           text,
  stock_qty     int not null default 0,
  is_published  boolean not null default false,
  is_featured   boolean not null default false,
  search_vector tsvector,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists product_brand_idx    on public.product(brand_id);
create index if not exists product_category_idx on public.product(category_id);
create index if not exists product_published_idx on public.product(is_published);
create index if not exists product_search_idx   on public.product using gin(search_vector);

drop trigger if exists product_search_vector on public.product;
create trigger product_search_vector before insert or update on public.product
  for each row execute function public.products_search_vector_update();

drop trigger if exists product_set_updated_at on public.product;
create trigger product_set_updated_at before update on public.product
  for each row execute function public.set_updated_at();

create table if not exists public.product_image (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product(id) on delete cascade,
  url        text not null,
  alt        text,
  sort_order int not null default 0
);
create index if not exists product_image_product_idx on public.product_image(product_id);

create table if not exists public.product_variant (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product(id) on delete cascade,
  name       text not null,          -- např. "54W", "12% Desert"
  sku        text unique,
  price      integer,                -- override base_price (haléře), null = base
  stock_qty  int not null default 0,
  sort_order int not null default 0
);
create index if not exists product_variant_product_idx on public.product_variant(product_id);

create table if not exists public.product_attribute (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product(id) on delete cascade,
  key        text not null,          -- "Příkon", "UVB index", "Objem"
  value      text not null,
  sort_order int not null default 0
);
create index if not exists product_attribute_product_idx on public.product_attribute(product_id);

-- ── Customers & addresses ─────────────────────────────────────────────────
create table if not exists public.customer (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

create table if not exists public.address (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete cascade,
  type        public.address_type not null default 'shipping',
  full_name   text,
  company     text,
  street      text,
  city        text,
  postal_code text,
  country     text not null default 'CZ',
  phone       text,
  is_default  boolean not null default false
);
create index if not exists address_customer_idx on public.address(customer_id);

-- ── Cart ──────────────────────────────────────────────────────────────────
create table if not exists public.cart (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customer(id) on delete cascade,
  session_id  text,                  -- pro guest košík
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cart_customer_idx on public.cart(customer_id);
create index if not exists cart_session_idx  on public.cart(session_id);

create table if not exists public.cart_item (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.cart(id) on delete cascade,
  product_id uuid not null references public.product(id) on delete cascade,
  variant_id uuid references public.product_variant(id) on delete set null,
  qty        int not null default 1 check (qty > 0),
  added_at   timestamptz not null default now()
);
create index if not exists cart_item_cart_idx on public.cart_item(cart_id);

-- ── Discounts ─────────────────────────────────────────────────────────────
create table if not exists public.discount_code (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  type        public.discount_type not null,
  value       integer not null,       -- percent: 1-100; fixed: haléře
  min_order   integer,                -- haléře
  valid_from  timestamptz,
  valid_to    timestamptz,
  usage_limit int,
  used_count  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── Orders ────────────────────────────────────────────────────────────────
create table if not exists public.order (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique,
  customer_id      uuid references public.customer(id) on delete set null,
  email            text not null,
  status           public.order_status not null default 'new',
  payment_status   public.payment_status not null default 'pending',
  subtotal         integer not null default 0,   -- haléře
  shipping         integer not null default 0,
  discount         integer not null default 0,
  total            integer not null default 0,
  currency         text not null default 'CZK',
  discount_code_id uuid references public.discount_code(id) on delete set null,
  comgate_ref      text,
  shipping_method  text,
  billing_address  jsonb,
  shipping_address jsonb,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists order_customer_idx on public.order(customer_id);
create index if not exists order_status_idx   on public.order(status);

drop trigger if exists order_set_updated_at on public.order;
create trigger order_set_updated_at before update on public.order
  for each row execute function public.set_updated_at();

create table if not exists public.order_item (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.order(id) on delete cascade,
  product_id uuid references public.product(id) on delete set null,
  variant_id uuid references public.product_variant(id) on delete set null,
  name       text not null,          -- snapshot názvu
  sku        text,
  unit_price integer not null,       -- haléře
  qty        int not null check (qty > 0),
  line_total integer not null        -- unit_price * qty
);
create index if not exists order_item_order_idx on public.order_item(order_id);

-- ── Reviews & wishlist ────────────────────────────────────────────────────
create table if not exists public.review (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.product(id) on delete cascade,
  customer_id uuid references public.customer(id) on delete set null,
  rating      int not null check (rating between 1 and 5),
  title       text,
  body        text,
  is_approved boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists review_product_idx on public.review(product_id);

create table if not exists public.wishlist_item (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete cascade,
  product_id  uuid not null references public.product(id) on delete cascade,
  added_at    timestamptz not null default now(),
  unique (customer_id, product_id)
);

-- ── Newsletter & blog ─────────────────────────────────────────────────────
create table if not exists public.newsletter_subscriber (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  is_confirmed boolean not null default false,
  source       text,
  created_at   timestamptz not null default now()
);

create table if not exists public.article (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  excerpt      text,
  body         text,
  cover_url    text,
  category_id  uuid references public.category(id) on delete set null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────
-- Veřejný read pro publikovaný obsah; owner-scoped pro zákaznická data.
-- Admin mutace jdou přes service role (RLS obchází).

alter table public.brand             enable row level security;
alter table public.category          enable row level security;
alter table public.product           enable row level security;
alter table public.product_image     enable row level security;
alter table public.product_variant   enable row level security;
alter table public.product_attribute enable row level security;
alter table public.customer          enable row level security;
alter table public.address           enable row level security;
alter table public.cart              enable row level security;
alter table public.cart_item         enable row level security;
alter table public.discount_code     enable row level security;
alter table public."order"           enable row level security;
alter table public.order_item        enable row level security;
alter table public.review            enable row level security;
alter table public.wishlist_item     enable row level security;
alter table public.newsletter_subscriber enable row level security;
alter table public.article           enable row level security;

-- Public catalog read
create policy "brand public read" on public.brand
  for select using (is_published = true);
create policy "category public read" on public.category
  for select using (is_published = true);
create policy "product public read" on public.product
  for select using (is_published = true);
create policy "product_image public read" on public.product_image
  for select using (exists (
    select 1 from public.product p where p.id = product_id and p.is_published));
create policy "product_variant public read" on public.product_variant
  for select using (exists (
    select 1 from public.product p where p.id = product_id and p.is_published));
create policy "product_attribute public read" on public.product_attribute
  for select using (exists (
    select 1 from public.product p where p.id = product_id and p.is_published));
create policy "review public read" on public.review
  for select using (is_approved = true);
create policy "article public read" on public.article
  for select using (is_published = true);

-- Customer self
create policy "customer self select" on public.customer
  for select using (id = auth.uid());
create policy "customer self insert" on public.customer
  for insert with check (id = auth.uid());
create policy "customer self update" on public.customer
  for update using (id = auth.uid());

-- Address (owner CRUD)
create policy "address owner all" on public.address
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Cart (owner CRUD; guest carts jdou přes service role)
create policy "cart owner all" on public.cart
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "cart_item owner all" on public.cart_item
  for all using (exists (
    select 1 from public.cart c where c.id = cart_id and c.customer_id = auth.uid()))
  with check (exists (
    select 1 from public.cart c where c.id = cart_id and c.customer_id = auth.uid()));

-- Orders (owner read; vytváření/změny přes service role)
create policy "order owner read" on public."order"
  for select using (customer_id = auth.uid());
create policy "order_item owner read" on public.order_item
  for select using (exists (
    select 1 from public."order" o where o.id = order_id and o.customer_id = auth.uid()));

-- Reviews (přihlášený vytváří vlastní, default nezveřejněná)
create policy "review owner insert" on public.review
  for insert with check (customer_id = auth.uid());

-- Wishlist (owner CRUD)
create policy "wishlist owner all" on public.wishlist_item
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Newsletter (kdokoli se přihlásí)
create policy "newsletter public insert" on public.newsletter_subscriber
  for insert with check (true);

-- discount_code: žádná public policy → jen service role (validace server-side)

commit;
