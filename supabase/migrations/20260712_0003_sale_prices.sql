-- Reptiplus — porovnávací (původní) ceny pro slevy.
-- Produkt je „ve slevě", když compare_at_* > price_* (v dané měně).
begin;

alter table public.product add column if not exists compare_at_czk integer;
alter table public.product add column if not exists compare_at_eur integer;

commit;
