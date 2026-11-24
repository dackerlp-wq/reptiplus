begin;

-- Polsko: výdejní místa jen přes externí dopravce — InPost Paczkomaty (3060, do 5 kg až 160 Kč bez DPH)
-- a Poczta Polska (14052, 110 Kč). Cena musí pokrýt dražší InPost: do 5 kg 199 Kč, nad 5 kg 219 Kč.
update public.shipping_method
   set country_prices = jsonb_set(
         country_prices, '{PL}',
         '{"price_czk":19900,"price_eur":820,"heavy_price_czk":21900,"heavy_price_eur":900}'::jsonb, true)
 where carrier = 'zasilkovna' and pickup_point;

commit;
