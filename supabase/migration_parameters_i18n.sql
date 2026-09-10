-- Trojjazyčné parametry produktů a variant (cs/en/de).
--
-- Stávající sloupec `parameters` zůstává českým zdrojem — nepřejmenovává se,
-- aby nasazená verze, která ho čte pod původním názvem, nespadla během deploye.
-- Typy schválně kopírují originál: products.parameters je text (JSON string),
-- product_variants.parameters je jsonb.

ALTER TABLE products ADD COLUMN IF NOT EXISTS parameters_en text DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS parameters_de text DEFAULT '{}';

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS parameters_en jsonb NOT NULL DEFAULT '{}';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS parameters_de jsonb NOT NULL DEFAULT '{}';

-- Dosavadní produkty nemají překlady; nastavíme je na české znění, aby se
-- zákazníkovi v EN/DE zobrazilo aspoň něco místo prázdné tabulky. Admin je
-- pak přepíše tlačítkem "Přeložit AI".
UPDATE products
   SET parameters_en = COALESCE(NULLIF(parameters_en, '{}'), parameters),
       parameters_de = COALESCE(NULLIF(parameters_de, '{}'), parameters)
 WHERE parameters IS NOT NULL AND parameters <> '{}';

UPDATE product_variants
   SET parameters_en = CASE WHEN parameters_en = '{}'::jsonb THEN parameters ELSE parameters_en END,
       parameters_de = CASE WHEN parameters_de = '{}'::jsonb THEN parameters ELSE parameters_de END
 WHERE parameters <> '{}'::jsonb;
