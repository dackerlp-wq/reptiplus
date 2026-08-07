begin;

-- Příznak, že dopravní metoda je „výdejní místo" (spustí Packeta/Zásilkovna widget).
alter table public.shipping_method
  add column if not exists pickup_point boolean not null default false;

commit;
