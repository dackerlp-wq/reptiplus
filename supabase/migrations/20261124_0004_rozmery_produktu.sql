begin;

-- Rozměry produktu v cm (D × Š × V, vč. obalu) — zobrazení u produktu, návrh krabice při balení
-- a skrytí Z-BOXu / InPost boxu v pokladně, když se zboží do schránky nevejde.
alter table public.product add column if not exists length_cm numeric(6,1) check (length_cm is null or length_cm > 0);
alter table public.product add column if not exists width_cm numeric(6,1) check (width_cm is null or width_cm > 0);
alter table public.product add column if not exists height_cm numeric(6,1) check (height_cm is null or height_cm > 0);

commit;
