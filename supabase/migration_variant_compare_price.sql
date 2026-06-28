-- Compare (crossed-out) price per variant for sale badge
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS compare_price numeric;
