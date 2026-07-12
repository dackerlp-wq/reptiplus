-- Reptiplus — role zákazníka + auto-profil při registraci
begin;

do $$ begin
  create type public.user_role as enum ('customer','staff','admin');
exception when duplicate_object then null; end $$;

alter table public.customer
  add column if not exists role public.user_role not null default 'customer';

-- Auto-vytvoření profilu (customer) po vzniku auth uživatele
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customer (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
