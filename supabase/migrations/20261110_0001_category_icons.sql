-- Ikony kategorií: předpřipravená ikona (klíč z lib/category-icons.tsx) nebo vlastní nahraný obrázek (má přednost).
begin;

alter table public.category add column if not exists icon text;
alter table public.category add column if not exists icon_url text;

comment on column public.category.icon is 'Klíč předpřipravené ikony (lib/category-icons.tsx), null = výchozí lístek';
comment on column public.category.icon_url is 'Vlastní ikona (veřejná URL v bucketu products/category-icons), má přednost před icon';

-- Převzetí dosavadní pevné mapy podle slugu z category-menu.tsx
update public.category set icon = 'lightbulb' where slug = 'osvetleni' and icon is null;
update public.category set icon = 'box' where slug = 'teraria' and icon is null;
update public.category set icon = 'utensils' where slug = 'kase-pro-plazy' and icon is null;
update public.category set icon = 'pill' where slug = 'vitaminy-a-mineraly' and icon is null;

commit;
