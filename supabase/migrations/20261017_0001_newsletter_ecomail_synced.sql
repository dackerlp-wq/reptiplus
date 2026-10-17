-- Ecomail: čas poslední synchronizace odběratele do seznamu (sloupec „Ecomail“ v admin Newsletteru).
begin;

alter table public.newsletter_subscriber
  add column if not exists ecomail_synced_at timestamptz;

comment on column public.newsletter_subscriber.ecomail_synced_at is 'Kdy byl odběratel naposledy odeslán do Ecomailu (null = ještě nikdy).';

commit;
