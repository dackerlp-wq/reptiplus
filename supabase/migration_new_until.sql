-- Auto-expiry date for "Novinka" badge (set to created_at + 90 days on insert)
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_until timestamptz;

-- Backfill: existing products with is_new=1 get 90-day window from created_at
UPDATE products SET new_until = created_at + INTERVAL '90 days' WHERE is_new = 1 AND new_until IS NULL;
