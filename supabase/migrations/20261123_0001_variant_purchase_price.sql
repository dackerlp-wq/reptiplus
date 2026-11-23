-- Nákupní cena varianty (bez DPH, za kus, haléře). Prázdná = použije se nákupní cena produktu.
-- Používá Analytika (marže) a produktový formulář (náhled marže).
begin;

alter table public.product_variant
  add column if not exists purchase_price_czk integer
  check (purchase_price_czk is null or purchase_price_czk >= 0);

comment on column public.product_variant.purchase_price_czk is
  'Nákupní cena za kus bez DPH v haléřích; null = nákupní cena produktu.';

commit;
