-- Reptiplus Supabase Schema
-- Run this in the Supabase SQL editor before seeding data

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name_cs text NOT NULL,
  name_en text NOT NULL,
  name_de text NOT NULL,
  description_cs text,
  image text,
  parent_id text,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  sku text NOT NULL UNIQUE,
  name_cs text NOT NULL,
  name_en text NOT NULL,
  name_de text NOT NULL,
  description_cs text,
  description_en text,
  description_de text,
  category_id text REFERENCES categories(id),
  price real NOT NULL,
  price_excl real NOT NULL,
  vat_rate real NOT NULL DEFAULT 21,
  compare_price real,
  stock integer NOT NULL DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  images text DEFAULT '[]',
  parameters text DEFAULT '{}',
  is_active integer NOT NULL DEFAULT 1,
  is_featured integer DEFAULT 0,
  is_new integer DEFAULT 0,
  is_sale integer DEFAULT 0,
  weight real,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  user_id text REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  payment_id text,
  shipping_method text,
  shipping_price real DEFAULT 0,
  subtotal real NOT NULL,
  discount real DEFAULT 0,
  total real NOT NULL,
  coupon_code text,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  street text NOT NULL,
  city text NOT NULL,
  zip text NOT NULL,
  country text NOT NULL DEFAULT 'CZ',
  company text,
  ico text,
  dic text,
  note text,
  tracking_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id),
  product_id text REFERENCES products(id),
  product_name text NOT NULL,
  product_sku text NOT NULL,
  quantity integer NOT NULL,
  price real NOT NULL,
  total real NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id),
  user_id text REFERENCES users(id),
  author_name text NOT NULL,
  rating integer NOT NULL,
  title text,
  body text,
  is_approved integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  type text NOT NULL,
  value real NOT NULL,
  min_order_amount real DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  is_active integer DEFAULT 1,
  expires_at text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  product_id text NOT NULL REFERENCES products(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  is_default integer DEFAULT 0,
  first_name text NOT NULL,
  last_name text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  zip text NOT NULL,
  country text NOT NULL DEFAULT 'CZ',
  company text,
  phone text
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title_cs text NOT NULL,
  title_en text,
  title_de text,
  content_cs text,
  content_en text,
  content_de text,
  excerpt text,
  image text,
  author_id text REFERENCES users(id),
  is_published integer DEFAULT 0,
  published_at text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_authors (
  id text PRIMARY KEY,
  name text NOT NULL,
  avatar_initial text,
  avatar_url text,
  bio text,
  is_default integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_comments (
  id text PRIMARY KEY,
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id),
  guest_name text,
  guest_email text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  parent_id text REFERENCES blog_comments(id),
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_post_products (
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, product_id)
);

CREATE TABLE IF NOT EXISTS blog_post_product_categories (
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, category_id)
);

CREATE TABLE IF NOT EXISTS blog_post_likes (
  id text PRIMARY KEY,
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id),
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text
);
