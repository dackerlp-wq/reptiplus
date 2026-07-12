-- Reptiplus — seed data (idempotentní UPSERT). Ceny: price_czk (haléře), price_eur (eurocenty).
-- Překlady name_i18n / description_i18n {cs,en,de}.
begin;

-- ── Značky ────────────────────────────────────────────────────────────────
insert into public.brand (name, slug, sort_order) values
  ('Arcadia','arcadia',1),
  ('Zoo Med','zoo-med',2),
  ('Exo Terra','exo-terra',3),
  ('Repashy','repashy',4),
  ('Lucky Reptile','lucky-reptile',5),
  ('Nutrobal','nutrobal',6)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

-- ── Kategorie — rodičovské ─────────────────────────────────────────────────
insert into public.category (name, slug, name_i18n, sort_order) values
  ('Osvětlení','osvetleni', '{"cs":"Osvětlení","en":"Lighting","de":"Beleuchtung"}', 1),
  ('Doplňky stravy','doplnky-stravy', '{"cs":"Doplňky stravy","en":"Supplements","de":"Nahrungsergänzung"}', 2),
  ('Krmivo','krmivo', '{"cs":"Krmivo","en":"Food","de":"Futter"}', 3)
on conflict (slug) do update set name_i18n = excluded.name_i18n, sort_order = excluded.sort_order;

-- ── Kategorie — podkategorie ───────────────────────────────────────────────
insert into public.category (name, slug, name_i18n, parent_id, sort_order) values
  ('UVB osvětlení','uvb-osvetleni', '{"cs":"UVB osvětlení","en":"UVB Lighting","de":"UVB-Beleuchtung"}',
     (select id from public.category where slug='osvetleni'),1),
  ('Tepelné lampy','tepelne-lampy', '{"cs":"Tepelné lampy","en":"Heat Lamps","de":"Wärmelampen"}',
     (select id from public.category where slug='osvetleni'),2),
  ('LED osvětlení','led-osvetleni', '{"cs":"LED osvětlení","en":"LED Lighting","de":"LED-Beleuchtung"}',
     (select id from public.category where slug='osvetleni'),3),
  ('Kalcium & D3','kalcium-d3', '{"cs":"Kalcium & D3","en":"Calcium & D3","de":"Kalzium & D3"}',
     (select id from public.category where slug='doplnky-stravy'),1),
  ('Multivitamíny','multivitaminy', '{"cs":"Multivitamíny","en":"Multivitamins","de":"Multivitamine"}',
     (select id from public.category where slug='doplnky-stravy'),2)
on conflict (slug) do update set name_i18n = excluded.name_i18n, parent_id = excluded.parent_id, sort_order = excluded.sort_order;

-- ── Produkty ───────────────────────────────────────────────────────────────
-- name_i18n: modelové názvy stejné ve všech jazycích. description_i18n: přeloženo.
insert into public.product
  (name, slug, description, name_i18n, description_i18n, brand_id, category_id, price_czk, price_eur, sku, stock_qty, is_published, is_featured)
values
  ('Arcadia D3 35W T15','arcadia-d3-35w-t15','Vysoce výkonná T15 UVB zářivka pro pouštní i lesní druhy plazů.',
   '{"cs":"Arcadia D3 35W T15","en":"Arcadia D3 35W T15","de":"Arcadia D3 35W T15"}',
   '{"cs":"Vysoce výkonná T15 UVB zářivka pro pouštní i lesní druhy plazů.","en":"High-output T15 UVB tube for both desert and forest reptile species.","de":"Leistungsstarke T15-UVB-Röhre für Wüsten- und Waldreptilien."}',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='uvb-osvetleni'),
   54900, 2199, 'ARC-D3-35T15', 25, true, true),

  ('Arcadia Pro T5 UVB Desert 12% 54W','arcadia-pro-t5-uvb-desert-12-54w','Profesionální T5 UVB zářivka s 12% UVB výkonem pro pouštní teraria.',
   '{"cs":"Arcadia Pro T5 UVB Desert 12% 54W","en":"Arcadia Pro T5 UVB Desert 12% 54W","de":"Arcadia Pro T5 UVB Desert 12% 54W"}',
   '{"cs":"Profesionální T5 UVB zářivka s 12% UVB výkonem pro pouštní teraria.","en":"Professional T5 UVB tube with 12% UVB output for desert terrariums.","de":"Professionelle T5-UVB-Röhre mit 12% UVB-Leistung für Wüstenterrarien."}',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='uvb-osvetleni'),
   89900, 3599, 'ARC-T5-D12-54', 18, true, true),

  ('Zoo Med ReptiSun 5.0 UVB 18W','zoo-med-reptisun-5-0-uvb-18w','Osvědčená UVB zářivka 5.0 pro tropické a lesní druhy.',
   '{"cs":"Zoo Med ReptiSun 5.0 UVB 18W","en":"Zoo Med ReptiSun 5.0 UVB 18W","de":"Zoo Med ReptiSun 5.0 UVB 18W"}',
   '{"cs":"Osvědčená UVB zářivka 5.0 pro tropické a lesní druhy.","en":"Proven 5.0 UVB tube for tropical and forest species.","de":"Bewährte 5.0-UVB-Röhre für tropische und Waldarten."}',
   (select id from public.brand where slug='zoo-med'), (select id from public.category where slug='uvb-osvetleni'),
   39900, 1599, 'ZM-RS50-18', 30, true, false),

  ('Lucky Reptile Bright Sun UV Desert 70W','lucky-reptile-bright-sun-uv-desert-70w','Metal-halogenová výbojka kombinující teplo, světlo i UVB pro pouštní druhy.',
   '{"cs":"Lucky Reptile Bright Sun UV Desert 70W","en":"Lucky Reptile Bright Sun UV Desert 70W","de":"Lucky Reptile Bright Sun UV Desert 70W"}',
   '{"cs":"Metal-halogenová výbojka kombinující teplo, světlo i UVB pro pouštní druhy.","en":"Metal halide lamp combining heat, light and UVB for desert species.","de":"Metalldampflampe, die Wärme, Licht und UVB für Wüstenarten vereint."}',
   (select id from public.brand where slug='lucky-reptile'), (select id from public.category where slug='uvb-osvetleni'),
   45900, 1849, 'LR-BSUN-D70', 12, true, false),

  ('Zoo Med Basking Spot Lamp 150W','zoo-med-basking-spot-lamp-150w','Bodová vyhřívací žárovka pro vytvoření teplého slunícího místa.',
   '{"cs":"Zoo Med Basking Spot Lamp 150W","en":"Zoo Med Basking Spot Lamp 150W","de":"Zoo Med Basking Spot Lamp 150W"}',
   '{"cs":"Bodová vyhřívací žárovka pro vytvoření teplého slunícího místa.","en":"Spot basking bulb for creating a warm basking area.","de":"Spot-Wärmelampe zur Schaffung eines warmen Sonnenplatzes."}',
   (select id from public.brand where slug='zoo-med'), (select id from public.category where slug='tepelne-lampy'),
   14900, 599, 'ZM-BSL-150', 40, true, false),

  ('Exo Terra Sun Glo Neodymium 100W','exo-terra-sun-glo-neodymium-100w','Neodymová denní žárovka s přirozeným světelným spektrem.',
   '{"cs":"Exo Terra Sun Glo Neodymium 100W","en":"Exo Terra Sun Glo Neodymium 100W","de":"Exo Terra Sun Glo Neodymium 100W"}',
   '{"cs":"Neodymová denní žárovka s přirozeným světelným spektrem.","en":"Neodymium daylight bulb with a natural light spectrum.","de":"Neodym-Tageslichtlampe mit natürlichem Lichtspektrum."}',
   (select id from public.brand where slug='exo-terra'), (select id from public.category where slug='tepelne-lampy'),
   18900, 749, 'ET-SGN-100', 35, true, false),

  ('Arcadia Halogen Basking Lamp 50W','arcadia-halogen-basking-lamp-50w','Úsporná halogenová baskingová lampa s vysokým jasem.',
   '{"cs":"Arcadia Halogen Basking Lamp 50W","en":"Arcadia Halogen Basking Lamp 50W","de":"Arcadia Halogen Basking Lamp 50W"}',
   '{"cs":"Úsporná halogenová baskingová lampa s vysokým jasem.","en":"Energy-efficient halogen basking lamp with high brightness.","de":"Energiesparende Halogen-Wärmelampe mit hoher Helligkeit."}',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='tepelne-lampy'),
   12900, 499, 'ARC-HAL-50', 50, true, false),

  ('Arcadia Jungle Dawn LED Bar 24W','arcadia-jungle-dawn-led-bar-24w','Výkonná rostlinná LED lišta pro bioaktivní a zalesněná teraria.',
   '{"cs":"Arcadia Jungle Dawn LED Bar 24W","en":"Arcadia Jungle Dawn LED Bar 24W","de":"Arcadia Jungle Dawn LED Bar 24W"}',
   '{"cs":"Výkonná rostlinná LED lišta pro bioaktivní a zalesněná teraria.","en":"Powerful plant-growth LED bar for bioactive and planted terrariums.","de":"Leistungsstarke Pflanzen-LED-Leiste für bioaktive und bepflanzte Terrarien."}',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='led-osvetleni'),
   129000, 5199, 'ARC-JD-LED24', 10, true, true),

  ('Exo Terra Calcium + D3 90g','exo-terra-calcium-d3-90g','Kalciový suplement s vitaminem D3 pro sypání krmného hmyzu.',
   '{"cs":"Exo Terra Calcium + D3 90g","en":"Exo Terra Calcium + D3 90g","de":"Exo Terra Calcium + D3 90g"}',
   '{"cs":"Kalciový suplement s vitaminem D3 pro sypání krmného hmyzu.","en":"Calcium supplement with vitamin D3 for dusting feeder insects.","de":"Kalziumpräparat mit Vitamin D3 zum Bestäuben von Futterinsekten."}',
   (select id from public.brand where slug='exo-terra'), (select id from public.category where slug='kalcium-d3'),
   19900, 799, 'ET-CAD3-90', 60, true, false),

  ('Nutrobal Multivitamín & Mineral Balancer 100g','nutrobal-multivitamin-mineral-balancer-100g','Komplexní multivitamínový a minerální balancér, standard mezi chovateli.',
   '{"cs":"Nutrobal Multivitamín & Mineral Balancer 100g","en":"Nutrobal Multivitamin & Mineral Balancer 100g","de":"Nutrobal Multivitamin & Mineral Balancer 100g"}',
   '{"cs":"Komplexní multivitamínový a minerální balancér, standard mezi chovateli.","en":"Comprehensive multivitamin and mineral balancer, a breeder standard.","de":"Umfassender Multivitamin- und Mineralstoff-Balancer, ein Züchterstandard."}',
   (select id from public.brand where slug='nutrobal'), (select id from public.category where slug='multivitaminy'),
   34900, 1399, 'NB-MMB-100', 45, true, true),

  ('Repashy Crested Gecko MRP Mango 85g','repashy-crested-gecko-mrp-mango-85g','Kompletní práškové krmivo pro gekončíky s příchutí manga.',
   '{"cs":"Repashy Crested Gecko MRP Mango 85g","en":"Repashy Crested Gecko MRP Mango 85g","de":"Repashy Crested Gecko MRP Mango 85g"}',
   '{"cs":"Kompletní práškové krmivo pro gekončíky s příchutí manga.","en":"Complete powdered diet for crested geckos with mango flavour.","de":"Komplettes Pulverfutter für Kronengeckos mit Mango-Geschmack."}',
   (select id from public.brand where slug='repashy'), (select id from public.category where slug='krmivo'),
   29900, 1199, 'RP-CGM-85', 55, true, false),

  ('Repashy Day Gecko MRF 60g','repashy-day-gecko-mrf-60g','Ovocné kompletní krmivo pro denní gekony (Phelsuma).',
   '{"cs":"Repashy Day Gecko MRF 60g","en":"Repashy Day Gecko MRF 60g","de":"Repashy Day Gecko MRF 60g"}',
   '{"cs":"Ovocné kompletní krmivo pro denní gekony (Phelsuma).","en":"Fruit-based complete diet for day geckos (Phelsuma).","de":"Fruchtbasiertes Komplettfutter für Taggeckos (Phelsuma)."}',
   (select id from public.brand where slug='repashy'), (select id from public.category where slug='krmivo'),
   27900, 1099, 'RP-DGF-60', 48, true, false)
on conflict (slug) do update set
  description      = excluded.description,
  name_i18n        = excluded.name_i18n,
  description_i18n = excluded.description_i18n,
  brand_id         = excluded.brand_id,
  category_id      = excluded.category_id,
  price_czk        = excluded.price_czk,
  price_eur        = excluded.price_eur,
  stock_qty        = excluded.stock_qty,
  is_published     = excluded.is_published,
  is_featured      = excluded.is_featured;

-- ── Ukázkové parametry ─────────────────────────────────────────────────────
insert into public.product_attribute (product_id, key, value, sort_order)
select p.id, a.key, a.value, a.ord from public.product p
join (values
  ('arcadia-d3-35w-t15','Příkon','35 W',1),
  ('arcadia-d3-35w-t15','Typ','T15 UVB',2),
  ('arcadia-pro-t5-uvb-desert-12-54w','Příkon','54 W',1),
  ('arcadia-pro-t5-uvb-desert-12-54w','UVB','12 % (Desert)',2),
  ('zoo-med-reptisun-5-0-uvb-18w','Příkon','18 W',1),
  ('zoo-med-reptisun-5-0-uvb-18w','UVB','5.0',2)
) as a(slug,key,value,ord) on a.slug = p.slug
where not exists (
  select 1 from public.product_attribute pa where pa.product_id = p.id and pa.key = a.key
);

commit;
