-- Reptiplus — krátký popis produktu (perex/shrnutí), i18n.
begin;

alter table public.product
  add column if not exists short_description text;
alter table public.product
  add column if not exists short_description_i18n jsonb not null default '{}'::jsonb;

commit;
