-- Blog tags migration — run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS blog_tags (
  id text PRIMARY KEY,
  name_cs text NOT NULL,
  name_en text,
  name_de text,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_post_tags (
  blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id text NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, tag_id)
);
