begin;

-- Pole pro správu zásilky u objednávky (napojení PPL / Zásilkovna).
-- tracking_number už existuje (veřejný sledovací kód).
alter table "order" add column if not exists carrier_shipment_id text; -- interní ID u dopravce (packetId / PPL číslo) pro tisk štítku
alter table "order" add column if not exists tracking_url text;        -- veřejný odkaz na sledování
alter table "order" add column if not exists tracking_status text;     -- poslední známý stav zásilky od dopravce
alter table "order" add column if not exists label_printed_at timestamptz; -- kdy byl naposledy vytištěn štítek

commit;