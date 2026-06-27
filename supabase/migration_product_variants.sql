-- Product variants: size/color/etc. variants for a product
CREATE TABLE IF NOT EXISTS product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_cs text NOT NULL,
  name_en text,
  name_de text,
  sku text,
  price numeric(10,2),
  stock integer NOT NULL DEFAULT 0,
  attributes jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);
