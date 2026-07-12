-- Reptiplus — i18n (cs/en/de) + multi-currency (CZK/EUR)
-- Měna se řídí jazykem: cs→CZK, en→EUR, de→EUR.
-- Ceny: price_czk (haléře) + price_eur (eurocenty), nastavované nezávisle.
-- Překlady: JSONB {cs,en,de} s fallbackem na cs (resp. base sloupec).

begin;

-- ── Ceny: CZK + EUR ───────────────────────────────────────────────────────
alter table public.product add column if not exists price_czk integer;
alter table public.product add column if not exists price_eur integer;
update public.product set price_czk = base_price where price_czk is null;
alter table public.product alter column price_czk set default 0;
alter table public.product alter column price_czk set not null;
alter table public.product drop column if exists base_price;
alter table public.product drop column if exists currency;  -- nahrazeno price_czk/price_eur

alter table public.product_variant add column if not exists price_czk integer;  -- null = použij cenu produktu
alter table public.product_variant add column if not exists price_eur integer;
update public.product_variant set price_czk = price where price_czk is null and price is not null;
alter table public.product_variant drop column if exists price;

-- ── i18n JSONB sloupce ────────────────────────────────────────────────────
alter table public.brand    add column if not exists description_i18n jsonb;
alter table public.category add column if not exists name_i18n        jsonb;
alter table public.category add column if not exists description_i18n jsonb;
alter table public.product  add column if not exists name_i18n        jsonb;
alter table public.product  add column if not exists description_i18n jsonb;
alter table public.article  add column if not exists title_i18n       jsonb;
alter table public.article  add column if not exists excerpt_i18n     jsonb;
alter table public.article  add column if not exists body_i18n        jsonb;

-- backfill cs z existujících base sloupců
update public.category set name_i18n = jsonb_build_object('cs', name)
  where name_i18n is null;
update public.category set description_i18n = jsonb_build_object('cs', description)
  where description_i18n is null and description is not null;
update public.product set name_i18n = jsonb_build_object('cs', name)
  where name_i18n is null;
update public.product set description_i18n = jsonb_build_object('cs', description)
  where description_i18n is null and description is not null;

-- ── FTS přes všechny jazyky (cs+en+de) ────────────────────────────────────
create or replace function public.products_search_vector_update()
returns trigger language plpgsql
set search_path = public, extensions as $$
begin
  new.search_vector := to_tsvector('simple', unaccent(
    coalesce(new.name,'') || ' ' || coalesce(new.description,'') || ' ' ||
    coalesce(new.name_i18n->>'cs','') || ' ' ||
    coalesce(new.name_i18n->>'en','') || ' ' ||
    coalesce(new.name_i18n->>'de','') || ' ' ||
    coalesce(new.description_i18n->>'cs','') || ' ' ||
    coalesce(new.description_i18n->>'en','') || ' ' ||
    coalesce(new.description_i18n->>'de','')));
  return new;
end $$;

-- přepočítat search_vector u existujících řádků (UPDATE spustí before-trigger)
update public.product set name = name;

commit;
