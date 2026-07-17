begin;

-- Rozšíření variant: překlad názvu, vlastní obrázek a vlastní parametry.
alter table public.product_variant
  add column if not exists name_i18n jsonb not null default '{}'::jsonb,
  add column if not exists image_url text,
  add column if not exists attributes jsonb not null default '[]'::jsonb;

commit;
