begin;

-- Hmotnost produktu (kg) — pro cenu dopravy podle hmotnosti košíku a pro hmotnost zásilky u dopravce.
alter table public.product add column if not exists weight_kg numeric(8,3)
  check (weight_kg is null or weight_kg >= 0);

-- Cena dopravy pro těžký košík: nad `heavy_from_kg` platí `heavy_price_*`.
alter table public.shipping_method add column if not exists heavy_from_kg numeric(6,2)
  check (heavy_from_kg is null or heavy_from_kg > 0);
alter table public.shipping_method add column if not exists heavy_price_czk integer;
alter table public.shipping_method add column if not exists heavy_price_eur integer;

-- Ceny pro jiné země než CZ: {"SK": {"price_czk":…, "price_eur":…, "heavy_price_czk":…, "heavy_price_eur":…}}.
-- U výdejního místa rozhoduje země pobočky, u doručení domů země dodací adresy.
alter table public.shipping_method add column if not exists country_prices jsonb not null default '{}'::jsonb;

-- Ceny podle ceníku Zásilkovny k 24. 11. 2026 (náklad vč. paliva 19,5 %, mýta a DPH, zaokrouhleno nahoru).
-- Výdejní místo / Z-BOX — CZ: do 5 kg 99 Kč, nad 5 kg 199 Kč; SK: 119 Kč / 229 Kč.
update public.shipping_method
   set price_czk = 9900, price_eur = 410,
       heavy_from_kg = 5, heavy_price_czk = 19900, heavy_price_eur = 820,
       country_prices = '{"SK":{"price_czk":11900,"price_eur":490,"heavy_price_czk":22900,"heavy_price_eur":940}}'::jsonb
 where carrier = 'zasilkovna' and pickup_point;

-- Doručení domů — CZ: do 5 kg 139 Kč, nad 5 kg 219 Kč; SK: 209 Kč / 299 Kč. Založí se, pokud ještě neexistuje.
insert into public.shipping_method
  (code, carrier, pickup_point, is_active, name_i18n, price_czk, sort_order)
select 'zasilkovna-domu', 'zasilkovna', false, true,
       '{"cs":"Zásilkovna – doručení domů","en":"Packeta – home delivery","de":"Packeta – Hauszustellung"}'::jsonb,
       13900,
       coalesce((select max(sort_order) + 1 from public.shipping_method), 0)
 where not exists (
   select 1 from public.shipping_method where carrier = 'zasilkovna' and not pickup_point
 );

update public.shipping_method
   set price_czk = 13900, price_eur = 570,
       heavy_from_kg = 5, heavy_price_czk = 21900, heavy_price_eur = 900,
       country_prices = '{"SK":{"price_czk":20900,"price_eur":860,"heavy_price_czk":29900,"heavy_price_eur":1230}}'::jsonb
 where carrier = 'zasilkovna' and not pickup_point;

-- Dobírka: příplatek Zásilkovny 21 Kč + DPH → 29 Kč (stejný pro CZ i SK).
update public.payment_method set fee_czk = 2900, fee_eur = 120 where provider = 'cod';

commit;
