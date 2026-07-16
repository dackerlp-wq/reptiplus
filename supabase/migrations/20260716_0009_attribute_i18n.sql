-- Reptiplus — i18n pro parametry produktu (název i hodnota).
-- key/value zůstávají jako base (cs) kvůli zpětné kompatibilitě.
begin;

alter table public.product_attribute
  add column if not exists key_i18n jsonb not null default '{}'::jsonb;
alter table public.product_attribute
  add column if not exists value_i18n jsonb not null default '{}'::jsonb;

commit;
