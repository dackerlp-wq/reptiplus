begin;

-- ── Schéma ──────────────────────────────────────────────────────────────────

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

-- Země, kde se doprava / platba nabízí (null = všude).
alter table public.shipping_method add column if not exists countries text[];
alter table public.payment_method add column if not exists countries text[];

-- ── Data: ceník Zásilkovny k 24. 11. 2026 ───────────────────────────────────
-- Náklad vč. paliva 19,5 %, mýta, příplatku „z ČR“ a DPH, zaokrouhleno nahoru; nad 5 kg = vyšší sazba.

-- Výdejní místo / Z-BOX: CZ 99/199 Kč, SK 119/229 Kč, DE (Hermes) 209/339 Kč, PL (Z-Point) 109/209 Kč.
-- Do Rakouska výdejní místa v ceníku nejsou.
update public.shipping_method
   set price_czk = 9900, price_eur = 410,
       heavy_from_kg = 5, heavy_price_czk = 19900, heavy_price_eur = 820,
       countries = array['CZ','SK','DE','PL'],
       country_prices = '{
         "SK":{"price_czk":11900,"price_eur":490,"heavy_price_czk":22900,"heavy_price_eur":940},
         "DE":{"price_czk":20900,"price_eur":860,"heavy_price_czk":33900,"heavy_price_eur":1390},
         "PL":{"price_czk":10900,"price_eur":450,"heavy_price_czk":20900,"heavy_price_eur":860}
       }'::jsonb
 where carrier = 'zasilkovna' and pickup_point;

-- Doručení domů — založí se, pokud ještě neexistuje.
insert into public.shipping_method
  (code, carrier, pickup_point, is_active, name_i18n, price_czk, sort_order)
select 'zasilkovna-domu', 'zasilkovna', false, true,
       '{"cs":"Zásilkovna – doručení domů","en":"Packeta – home delivery","de":"Packeta – Hauszustellung"}'::jsonb,
       13900,
       coalesce((select max(sort_order) + 1 from public.shipping_method), 0)
 where not exists (
   select 1 from public.shipping_method where carrier = 'zasilkovna' and not pickup_point
 );

-- Doručení domů: CZ 139/219 Kč, SK 209/299 Kč, DE (Hermes) 229/369 Kč, AT (DPD) 249/289 Kč, PL (DPD) 179/239 Kč.
update public.shipping_method
   set price_czk = 13900, price_eur = 570,
       heavy_from_kg = 5, heavy_price_czk = 21900, heavy_price_eur = 900,
       countries = null,
       country_prices = '{
         "SK":{"price_czk":20900,"price_eur":860,"heavy_price_czk":29900,"heavy_price_eur":1230},
         "DE":{"price_czk":22900,"price_eur":940,"heavy_price_czk":36900,"heavy_price_eur":1510},
         "AT":{"price_czk":24900,"price_eur":1020,"heavy_price_czk":28900,"heavy_price_eur":1180},
         "PL":{"price_czk":17900,"price_eur":740,"heavy_price_czk":23900,"heavy_price_eur":980}
       }'::jsonb
 where carrier = 'zasilkovna' and not pickup_point;

-- Ostatní dopravci (PPL, Balíkovna, osobní odběr…) nemají zahraniční ceník → jen CZ a SK.
update public.shipping_method
   set countries = array['CZ','SK']
 where carrier <> 'zasilkovna' and countries is null;

-- Dobírka: příplatek Zásilkovny 21 Kč + DPH → 29 Kč, jen CZ a SK (do AT ji DPD neumí, PL by byla v EUR).
update public.payment_method
   set fee_czk = 2900, fee_eur = 120, countries = array['CZ','SK']
 where provider = 'cod';

commit;
