-- Reptiplus — seed data (idempotentní). Ceny v haléřích.
begin;

-- Značky
insert into public.brand (name, slug, sort_order) values
  ('Arcadia','arcadia',1),
  ('Zoo Med','zoo-med',2),
  ('Exo Terra','exo-terra',3),
  ('Repashy','repashy',4),
  ('Lucky Reptile','lucky-reptile',5),
  ('Nutrobal','nutrobal',6)
on conflict (slug) do nothing;

-- Kategorie — rodičovské
insert into public.category (name, slug, sort_order) values
  ('Osvětlení','osvetleni',1),
  ('Doplňky stravy','doplnky-stravy',2),
  ('Krmivo','krmivo',3)
on conflict (slug) do nothing;

-- Kategorie — podkategorie
insert into public.category (name, slug, parent_id, sort_order) values
  ('UVB osvětlení','uvb-osvetleni', (select id from public.category where slug='osvetleni'),1),
  ('Tepelné lampy','tepelne-lampy', (select id from public.category where slug='osvetleni'),2),
  ('LED osvětlení','led-osvetleni', (select id from public.category where slug='osvetleni'),3),
  ('Kalcium & D3','kalcium-d3', (select id from public.category where slug='doplnky-stravy'),1),
  ('Multivitamíny','multivitaminy', (select id from public.category where slug='doplnky-stravy'),2)
on conflict (slug) do nothing;

-- Produkty
insert into public.product (name, slug, description, brand_id, category_id, base_price, sku, stock_qty, is_published, is_featured) values
  ('Arcadia D3 35W T15','arcadia-d3-35w-t15',
   'Vysoce výkonná T15 UVB zářivka pro pouštní i lesní druhy plazů.',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='uvb-osvetleni'),
   54900,'ARC-D3-35T15',25,true,true),

  ('Arcadia Pro T5 UVB Desert 12% 54W','arcadia-pro-t5-uvb-desert-12-54w',
   'Profesionální T5 UVB zářivka s 12% UVB výkonem pro pouštní teraria.',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='uvb-osvetleni'),
   89900,'ARC-T5-D12-54',18,true,true),

  ('Zoo Med ReptiSun 5.0 UVB 18W','zoo-med-reptisun-5-0-uvb-18w',
   'Osvědčená UVB zářivka 5.0 pro tropické a lesní druhy.',
   (select id from public.brand where slug='zoo-med'), (select id from public.category where slug='uvb-osvetleni'),
   39900,'ZM-RS50-18',30,true,false),

  ('Lucky Reptile Bright Sun UV Desert 70W','lucky-reptile-bright-sun-uv-desert-70w',
   'Metal-halogenová výbojka kombinující teplo, světlo i UVB pro pouštní druhy.',
   (select id from public.brand where slug='lucky-reptile'), (select id from public.category where slug='uvb-osvetleni'),
   45900,'LR-BSUN-D70',12,true,false),

  ('Zoo Med Basking Spot Lamp 150W','zoo-med-basking-spot-lamp-150w',
   'Bodová vyhřívací žárovka pro vytvoření teplého slunícího místa.',
   (select id from public.brand where slug='zoo-med'), (select id from public.category where slug='tepelne-lampy'),
   14900,'ZM-BSL-150',40,true,false),

  ('Exo Terra Sun Glo Neodymium 100W','exo-terra-sun-glo-neodymium-100w',
   'Neodymová denní žárovka s přirozeným světelným spektrem.',
   (select id from public.brand where slug='exo-terra'), (select id from public.category where slug='tepelne-lampy'),
   18900,'ET-SGN-100',35,true,false),

  ('Arcadia Halogen Basking Lamp 50W','arcadia-halogen-basking-lamp-50w',
   'Úsporná halogenová baskingová lampa s vysokým jasem.',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='tepelne-lampy'),
   12900,'ARC-HAL-50',50,true,false),

  ('Arcadia Jungle Dawn LED Bar 24W','arcadia-jungle-dawn-led-bar-24w',
   'Výkonná rostlinná LED lišta pro bioaktivní a zalesněná teraria.',
   (select id from public.brand where slug='arcadia'), (select id from public.category where slug='led-osvetleni'),
   129000,'ARC-JD-LED24',10,true,true),

  ('Exo Terra Calcium + D3 90g','exo-terra-calcium-d3-90g',
   'Kalciový suplement s vitaminem D3 pro sypání krmného hmyzu.',
   (select id from public.brand where slug='exo-terra'), (select id from public.category where slug='kalcium-d3'),
   19900,'ET-CAD3-90',60,true,false),

  ('Nutrobal Multivitamín & Mineral Balancer 100g','nutrobal-multivitamin-mineral-balancer-100g',
   'Komplexní multivitamínový a minerální balancér, standard mezi chovateli.',
   (select id from public.brand where slug='nutrobal'), (select id from public.category where slug='multivitaminy'),
   34900,'NB-MMB-100',45,true,true),

  ('Repashy Crested Gecko MRP Mango 85g','repashy-crested-gecko-mrp-mango-85g',
   'Kompletní práškové krmivo pro gekončíky s příchutí manga.',
   (select id from public.brand where slug='repashy'), (select id from public.category where slug='krmivo'),
   29900,'RP-CGM-85',55,true,false),

  ('Repashy Day Gecko MRF 60g','repashy-day-gecko-mrf-60g',
   'Ovocné kompletní krmivo pro denní gekony (Phelsuma).',
   (select id from public.brand where slug='repashy'), (select id from public.category where slug='krmivo'),
   27900,'RP-DGF-60',48,true,false)
on conflict (slug) do nothing;

-- Ukázkové parametry (attributes) u osvětlení
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
