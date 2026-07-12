-- Reptiplus — seed: doprava, platby, nastavení, ukázkové objednávky (idempotentní)
begin;

-- Doprava
insert into public.shipping_method (code, name_i18n, carrier, price_czk, price_eur, sort_order) values
  ('ppl', '{"cs":"PPL – doručení na adresu","en":"PPL – home delivery","de":"PPL – Lieferung"}', 'ppl', 14900, 599, 1),
  ('zasilkovna', '{"cs":"Zásilkovna – výdejní místo","en":"Packeta – pickup point","de":"Packeta – Abholstelle"}', 'zasilkovna', 7900, 349, 2),
  ('personal', '{"cs":"Osobní odběr","en":"Personal pickup","de":"Persönliche Abholung"}', 'personal', 0, 0, 3)
on conflict (code) do update set name_i18n = excluded.name_i18n, price_czk = excluded.price_czk, price_eur = excluded.price_eur, carrier = excluded.carrier, sort_order = excluded.sort_order;

-- Platby
insert into public.payment_method (code, name_i18n, provider, fee_czk, fee_eur, sort_order) values
  ('card', '{"cs":"Platební karta","en":"Card payment","de":"Kartenzahlung"}', 'comgate', 0, 0, 1),
  ('cod', '{"cs":"Dobírka","en":"Cash on delivery","de":"Nachnahme"}', 'cod', 3900, 159, 2),
  ('bank', '{"cs":"Bankovní převod","en":"Bank transfer","de":"Banküberweisung"}', 'bank_transfer', 0, 0, 3)
on conflict (code) do update set name_i18n = excluded.name_i18n, provider = excluded.provider, fee_czk = excluded.fee_czk, fee_eur = excluded.fee_eur, sort_order = excluded.sort_order;

-- Nastavení (klíče se doplní v adminu)
insert into public.app_setting (key, value) values
  ('shop.general', '{"name":"Reptiplus","email":"info@reptiplus.cz","phone":""}'),
  ('integrations.comgate', '{"merchant":"","secret":"","test":true}'),
  ('integrations.ppl', '{"clientId":"","clientSecret":""}'),
  ('integrations.zasilkovna', '{"apiKey":"","apiPassword":"","eshopId":""}')
on conflict (key) do nothing;

-- Ukázkové objednávky
insert into public."order" (number, email, status, payment_status, subtotal, shipping, discount, total, currency, shipping_method, billing_address, shipping_address)
values
  ('RP2026000001', 'jan.novak@example.com', 'paid', 'paid', 109800, 14900, 0, 124700, 'CZK', 'ppl',
   '{"full_name":"Jan Novák","street":"Dlouhá 12","city":"Praha","postal_code":"11000","country":"CZ","phone":"+420601234567"}',
   '{"full_name":"Jan Novák","street":"Dlouhá 12","city":"Praha","postal_code":"11000","country":"CZ","phone":"+420601234567"}'),
  ('RP2026000002', 'petra.svobodova@example.com', 'new', 'pending', 64800, 7900, 0, 72700, 'CZK', 'zasilkovna',
   '{"full_name":"Petra Svobodová","street":"Krátká 3","city":"Brno","postal_code":"60200","country":"CZ","phone":"+420777888999"}',
   '{"full_name":"Petra Svobodová","street":"Krátká 3","city":"Brno","postal_code":"60200","country":"CZ","phone":"+420777888999"}')
on conflict (number) do nothing;

insert into public.order_item (order_id, product_id, name, sku, unit_price, qty, line_total)
select o.id, p.id, p.name, p.sku, p.price_czk, 2, p.price_czk * 2
from public."order" o, public.product p
where o.number = 'RP2026000001' and p.slug = 'arcadia-d3-35w-t15'
and not exists (select 1 from public.order_item oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_item (order_id, product_id, name, sku, unit_price, qty, line_total)
select o.id, p.id, p.name, p.sku, p.price_czk, 1, p.price_czk
from public."order" o, public.product p
where o.number = 'RP2026000002' and p.slug in ('nutrobal-multivitamin-mineral-balancer-100g','repashy-crested-gecko-mrp-mango-85g')
and not exists (select 1 from public.order_item oi where oi.order_id = o.id and oi.product_id = p.id);

commit;
