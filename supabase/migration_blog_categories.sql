-- Blog categories (separate from product categories)
CREATE TABLE IF NOT EXISTS blog_categories (
  id text PRIMARY KEY,
  name_cs text NOT NULL,
  name_en text,
  name_de text,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add blog category FK to blog_posts
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS blog_category_id text REFERENCES blog_categories(id) ON DELETE SET NULL;
