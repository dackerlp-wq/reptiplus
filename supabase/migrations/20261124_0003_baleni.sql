begin;

-- Balení před odesláním: skutečná hmotnost a rozměry balíku (zadává obsluha v detailu objednávky).
alter table public."order" add column if not exists package_weight_kg numeric(8,3)
  check (package_weight_kg is null or package_weight_kg > 0);
alter table public."order" add column if not exists package_length_cm numeric(6,1);
alter table public."order" add column if not exists package_width_cm numeric(6,1);
alter table public."order" add column if not exists package_height_cm numeric(6,1);
alter table public."order" add column if not exists packed_at timestamptz;

-- Výchozí krabice pro rychlé balení (Admin → Doprava → Krabice).
insert into public.app_setting (key, value)
values ('shipping.boxes', '{"boxes":[
  {"name":"Malá","lengthCm":30,"widthCm":20,"heightCm":15,"weightKg":0.2},
  {"name":"Střední","lengthCm":40,"widthCm":30,"heightCm":25,"weightKg":0.4},
  {"name":"Velká","lengthCm":60,"widthCm":40,"heightCm":30,"weightKg":0.8}
]}'::jsonb)
on conflict (key) do nothing;

commit;
