@AGENTS.md

# Reptiplus — AI Agent Guidelines

## Core Rules

- **Everything 100%, now.** Never leave TODOs, placeholders, "fix later", or disabled features. If something is needed, build it fully in the same response. The only exception is when the user explicitly says to skip it.
- **Never commit secrets.** API keys, tokens, passwords go only in `.env.local` (gitignored) or Vercel dashboard env vars. Never in source files or git.
- **Always push to both branches:** `git push -u origin claude/reptiplus-eshop-design-eelabl` AND `git push origin claude/reptiplus-eshop-design-eelabl:main`.
- **Images are uploaded, never linked.** Users upload images through the admin UI to Supabase Storage (`images` bucket). Never use external image URLs as a final solution — always use Supabase Storage URLs.

---

## Multilingual — ALWAYS

The app supports **Czech (cs), English (en), German (de)**. `cs` is the default locale.

**Every single piece of user-facing content must have all 3 language variants:**

- Database columns: `_cs`, `_en`, `_de` suffix (e.g. `title_cs`, `title_en`, `title_de`)
- Admin forms: show all 3 language tabs/fields
- Translation: use AI auto-translate via `POST /api/admin/translate` when creating content
- Locale resolution: `map[locale] || map['cs']` — always fall back to Czech
- Next.js routing: `[locale]` segment, `next-intl` for UI strings
- Metadata (`generateMetadata`): use the locale-appropriate title/description

**Auto-translation flow for admin:**
```
User fills Czech → clicks "Přeložit" → POST /api/admin/translate → fills EN + DE fields
```
The translate endpoint uses Vercel AI Gateway (`gateway('anthropic/claude-haiku-4.5')` from `@ai-sdk/gateway`). Env var: `AI_GATEWAY_API_KEY`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16+ App Router, TypeScript |
| Styling | Tailwind CSS v4 + `@theme` block in `globals.css` |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js` ^2.108 |
| Auth | JWT via `jose` + `bcryptjs`, httpOnly cookie `session` |
| i18n | next-intl (cs/en/de, defaultLocale: cs) |
| AI | Vercel AI Gateway → Anthropic Claude Haiku 4.5 |
| Images | Supabase Storage bucket `images` |
| Fonts | Inter (sans), Fraunces (display), JetBrains Mono (mono) via `next/font/google` |

**Supabase clients:**
- `supabaseAdmin` (service role) — server-side only, for admin API routes
- `supabase` (anon key) — for public reads
- Never expose service role key to the client

**Auth helper:** `getSession()` from `@/lib/auth` returns `{ id, email, firstName, lastName, role }` or `null`.

**ID generation:** `Math.random().toString(36).slice(2) + Date.now().toString(36)`

---

## Design System

### Color Palette

```css
/* E-shop palette */
--color-forest: #1B4332          /* primary brand green */
--color-forest-dark: #0f2b1f
--color-forest-light: #2D6A4F
--color-earth: #6B4226
--color-gold: #C9A84C
--color-cream: #F5F0E8           /* page background */
--color-cream-dark: #EAE3D5      /* borders, table striping */
--color-sage: #D4E6C3
--color-charcoal: #1A1A1A        /* primary text */
--color-gray-soft: #6B7280       /* secondary text */

/* Blog / editorial palette */
--color-ink: #1B1F17             /* editorial text */
--color-moss: #33533C            /* editorial accent green */
--color-amber: #E8A33D           /* editorial highlights */
--color-paper: #F3EEE0           /* editorial background */
--color-terracotta: #C2562E      /* editorial accent red */
--color-forest-deep: #16241A     /* editorial hero bg */
```

### Typography

```
--font-display: Fraunces (variable, serif) — headings, hero text
--font-sans: Inter — body text, UI
--font-mono: JetBrains Mono — labels, eyebrows, tags, code
```

### Blog / Editorial Card Style ("Specimen Card")

```css
border: 1.5px solid var(--color-ink);
/* hover: translateY(-3px) + sharp box-shadow offset */
transition: transform 0.2s ease, box-shadow 0.2s ease;
/* hover */ transform: translateY(-3px); box-shadow: 4px 4px 0 var(--color-ink);
```

Corner tag (e.g. "Doporučujeme"):
```html
<div style="position:absolute; top:0; right:0; background:var(--color-amber); padding:2px 8px; font-family:var(--font-mono); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em">
  Doporučujeme
</div>
```

Section eyebrow label style:
```html
<p style="font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--color-amber)">
  EYEBROW TEXT
</p>
```

### Component Conventions

- **Button**: `@/components/ui/Button` — variants: `default`, `outline`, `ghost`
- **Badge**: `@/components/ui/Badge` — variants: `new`, `sale`, `default`
- **Toast**: `toast(message, type)` from `@/components/ui/Toaster`
- **Admin tables**: `bg-white rounded-xl border border-cream-dark overflow-hidden` wrapper; `divide-y divide-cream-dark` rows
- **Admin forms**: `bg-white rounded-xl border border-cream-dark p-6` wrapper; `grid grid-cols-2 gap-6` layout
- **Confirm before delete**: always `if (!confirm('...')) return`

---

## File Structure

```
src/
  app/
    [locale]/
      layout.tsx           — root layout with fonts + nav
      page.tsx             — homepage
      obchod/              — shop listing
      produkt/[slug]/      — product detail
      blog/                — public blog
      blog/[slug]/         — blog post detail
      admin/               — admin panel (role=admin guard)
        blog/              — blog CRUD
        blog/komentare/    — comment moderation
        blog/podpisy/      — author CRUD
        orders/            — order management
        products/          — product CRUD
        ...
    api/
      admin/               — protected API routes (check role=admin)
      blog/[slug]/         — public blog API (comments, likes)
      ...
  components/
    ui/                    — Button, Badge, Toaster, etc.
    shop/                  — ProductCard, CartDrawer, etc.
    layout/                — Header, Footer
  lib/
    supabase.ts            — supabase + supabaseAdmin clients
    auth.ts                — getSession()
    i18n.ts                — Locale type, routing config
    utils.ts               — formatDate, cn(), etc.
  store/
    cart.ts                — Zustand cart store
  hooks/
    usePriceFmt.ts         — price formatting with currency
```

---

## Database Schema (key tables)

```sql
users(id, email, password, first_name, last_name, role, created_at)
products(id, slug, name_cs, name_en, name_de, description_cs/en/de, price, price_excl, compare_price, vat_rate, stock, low_stock_threshold, images jsonb, parameters jsonb, category_id, is_active, is_new, is_sale, is_featured)
categories(id, slug, name_cs, name_en, name_de, parent_id)
orders(id, user_id, status, items jsonb, total, ...)
blog_posts(id, slug, title_cs/en/de, content_cs/en/de, excerpt, image, author_id, blog_author_id, is_published, published_at, created_at)
blog_authors(id, name, avatar_initial, avatar_url, bio, is_default)
blog_comments(id, blog_post_id, user_id, guest_name, guest_email, content, status, parent_id, created_at)
blog_post_products(blog_post_id, product_id)          — M:N blog ↔ products
blog_post_product_categories(blog_post_id, category_id) — M:N blog ↔ categories
blog_post_likes(id, blog_post_id, user_id, ip_hash, created_at)
reviews(id, product_id, user_id, author_name, rating, title, body, is_approved)
```

### Migration status

The `blog_v2` migration (`supabase/migration_blog_v2.sql`) creates:
`blog_authors`, `blog_comments`, `blog_post_products`, `blog_post_product_categories`, `blog_post_likes` and adds `blog_author_id` to `blog_posts`.

**To run:** Supabase dashboard → SQL Editor → paste `supabase/migration_blog_v2.sql` → Run.

---

## Image Uploads

**All images are uploaded by the user through the admin UI — never use external URLs.**

Upload flow:
1. `<input type="file" accept="image/*">` in admin form
2. `POST /api/admin/upload` with `FormData` containing the file
3. API uploads to Supabase Storage bucket `images` via `supabaseAdmin.storage.from('images').upload()`
4. Returns public URL: `supabaseAdmin.storage.from('images').getPublicUrl(path).data.publicUrl`
5. Store the Supabase URL in the database

The upload API route pattern:
```typescript
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabaseAdmin.storage.from('images').upload(path, await file.arrayBuffer(), { contentType: file.type })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
```

---

## Admin API Conventions

All admin routes:
1. Always check `getSession()` first, return 401 if not admin
2. Use `supabaseAdmin` (never anon client)
3. Return structured JSON: `{ data }` or `{ error }` with appropriate status codes
4. Use `generateId()` for new entity IDs

---

## Anti-Patterns (never do these)

- ❌ Leave any field without all 3 language variants
- ❌ Use `author` without checking if `blog_authors` table exists (may need migration)
- ❌ Skip the AI translation button when building admin forms for multilingual content
- ❌ Use `http://` image URLs in production code
- ❌ Allow image input via URL field — only file upload
- ❌ Add `blog_author_id` without running the migration
- ❌ Commit any value from `.env.local` to git
- ❌ Leave error states unhandled in forms
- ❌ Use `any` cast unless absolutely necessary (add eslint-disable comment if needed)
- ❌ Use mechanical date/price formatting — always use `formatDate()` and `usePriceFmt()`
