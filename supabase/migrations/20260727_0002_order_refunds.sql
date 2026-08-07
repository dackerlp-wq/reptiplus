-- Refundace / dobropisy: evidence vrácené částky na objednávce.
-- Částka je v minor units (haléře / eurocenty), stejně jako total.
alter table public.order
  add column if not exists refunded_amount integer not null default 0;

-- Kdy a kým byla vratka naposledy provedena (audit + zobrazení v adminu).
alter table public.order
  add column if not exists refunded_at timestamptz;
