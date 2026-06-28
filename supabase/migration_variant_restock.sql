-- Add expected restock date for out-of-stock variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS restock_date date;
