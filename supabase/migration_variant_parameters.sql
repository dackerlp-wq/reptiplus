-- Add parameters column to product_variants (variant-specific technical specs)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS parameters jsonb NOT NULL DEFAULT '{}';
