begin;

-- Hmotnost produktu (kg) — pro cenu dopravy podle hmotnosti košíku a pro hmotnost zásilky u dopravce.
alter table public.product add column if not exists weight_kg numeric(8,3)
  check (weight_kg is null or weight_kg >= 0);

-- Cena dopravy pro těžký košík: od `heavy_from_kg` (včetně překročení) platí `heavy_price_*`.
alter table public.shipping_method add column if not exists heavy_from_kg numeric(6,2)
  check (heavy_from_kg is null or heavy_from_kg > 0);
alter table public.shipping_method add column if not exists heavy_price_czk integer;
alter table public.shipping_method add column if not exists heavy_price_eur integer;

-- Ceny podle ceníku Zásilkovny k 24. 11. 2026 (náklad vč. paliva 19,5 %, mýta a DPH zaokrouhlený nahoru).
-- Výdejní místo / Z-BOX: do 5 kg 99 Kč, nad 5 kg 199 Kč.
update public.shipping_method
   set price_czk = 9900, price_eur = 390,
       heavy_from_kg = 5, heavy_price_czk = 19900, heavy_price_eur = 790
 where carrier = 'zasilkovna' and pickup_point;

-- Doručení domů: do 5 kg 139 Kč, nad 5 kg 219 Kč. Založí se, pokud ještě neexistuje.
insert into public.shipping_method
  (code, carrier, pickup_point, is_active, name_i18n, price_czk, price_eur,
   heavy_from_kg, heavy_price_czk, heavy_price_eur, sort_order)
select 'zasilkovna-domu', 'zasilkovna', false, true,
       '{"cs":"Zásilkovna – doručení domů","en":"Packeta – home delivery","de":"Packeta – Hauszustellung"}'::jsonb,
       13900, 550, 5, 21900, 890,
       coalesce((select max(sort_order) + 1 from public.shipping_method), 0)
 where not exists (
   select 1 from public.shipping_method where carrier = 'zasilkovna' and not pickup_point
 );

update public.shipping_method
   set price_czk = 13900, price_eur = 550,
       heavy_from_kg = 5, heavy_price_czk = 21900, heavy_price_eur = 890
 where carrier = 'zasilkovna' and not pickup_point;

-- Dobírka: příplatek Zásilkovny 21 Kč + DPH → 29 Kč.
update public.payment_method set fee_czk = 2900, fee_eur = 120 where provider = 'cod';

commit;
