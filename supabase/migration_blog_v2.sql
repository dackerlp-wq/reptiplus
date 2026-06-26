-- Blog v2 migration — run in Supabase SQL editor

-- Authors / signatures
CREATE TABLE IF NOT EXISTS blog_authors (
  id text PRIMARY KEY,
  name text NOT NULL,
  avatar_initial text,
  avatar_url text,
  bio text,
  is_default integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Link blog_posts to a blog_author (keeps existing author_id → users(id) for backwards compat)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS blog_author_id text REFERENCES blog_authors(id);

-- Comments
CREATE TABLE IF NOT EXISTS blog_comments (
  id text PRIMARY KEY,
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id),
  guest_name text,
  guest_email text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending | approved | spam | rejected
  parent_id text REFERENCES blog_comments(id),
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Product links on blog posts
CREATE TABLE IF NOT EXISTS blog_post_products (
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, product_id)
);

-- Category links on blog posts
CREATE TABLE IF NOT EXISTS blog_post_product_categories (
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, category_id)
);

-- Likes
CREATE TABLE IF NOT EXISTS blog_post_likes (
  id text PRIMARY KEY,
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id),
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

-- Seed a default author
INSERT INTO blog_authors (id, name, avatar_initial, bio, is_default)
VALUES ('default-author', 'Admin Reptiplus', 'A', 'Tým Reptiplus chová plazy a obojživelníky přes 10 let a testuje vybavení dřív, než ho doporučí v obchodě.', 1)
ON CONFLICT DO NOTHING;
