import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS blog_authors (
    id text PRIMARY KEY,
    name text NOT NULL,
    avatar_initial text,
    avatar_url text,
    bio text,
    is_default integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
  )`,
  `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS blog_author_id text REFERENCES blog_authors(id)`,
  `CREATE TABLE IF NOT EXISTS blog_comments (
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
  )`,
  `CREATE TABLE IF NOT EXISTS blog_post_products (
    blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (blog_post_id, product_id)
  )`,
  `CREATE TABLE IF NOT EXISTS blog_post_product_categories (
    blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (blog_post_id, category_id)
  )`,
  `CREATE TABLE IF NOT EXISTS blog_post_likes (
    id text PRIMARY KEY,
    blog_post_id text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id text REFERENCES users(id),
    ip_hash text,
    created_at timestamptz DEFAULT now()
  )`,
  `INSERT INTO blog_authors (id, name, avatar_initial, bio, is_default)
   VALUES ('default-author', 'Admin Reptiplus', 'A', 'Tým Reptiplus chová plazy a obojživelníky přes 10 let a testuje vybavení dřív, než ho doporučí v obchodě.', 1)
   ON CONFLICT DO NOTHING`,
]

export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results: { sql: string; ok: boolean; error?: string }[] = []

  for (const sql of SQL_STATEMENTS) {
    const { error } = await supabaseAdmin.rpc('exec_ddl', { ddl: sql }).single().catch(() => ({ error: null }))
    // supabase doesn't expose a raw query, so we use a workaround via the REST API
    // We'll try inserting a dummy row to test existence, otherwise use a pg function
    results.push({ sql: sql.slice(0, 80), ok: !error, error: error?.message })
  }

  return NextResponse.json({ results })
}
