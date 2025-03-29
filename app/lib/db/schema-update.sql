-- Create saved_appliances table
CREATE TABLE IF NOT EXISTS saved_appliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    product_name TEXT NOT NULL,
    product_url TEXT,
    product_image_url TEXT,
    product_price TEXT,
    appliance_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create homespy_lookups table to track appliance age lookups
CREATE TABLE IF NOT EXISTS homespy_lookups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    model_number TEXT,
    serial_number TEXT,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for saved_appliances table
ALTER TABLE saved_appliances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved appliances" 
  ON saved_appliances FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own saved appliances" 
  ON saved_appliances FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own saved appliances" 
  ON saved_appliances FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own saved appliances" 
  ON saved_appliances FOR DELETE USING (auth.uid()::text = user_id::text);

-- Add RLS policies for homespy_lookups table
ALTER TABLE homespy_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own homespy lookups" 
  ON homespy_lookups FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own homespy lookups" 
  ON homespy_lookups FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Add count function for homespy_lookups
CREATE OR REPLACE FUNCTION count_homespy_lookups(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    lookup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO lookup_count
    FROM homespy_lookups
    WHERE user_id = p_user_id
    AND created_at > (CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL);
    
    RETURN lookup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the products table for caching product data
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  retailer TEXT NOT NULL,
  price DECIMAL,
  url TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  claude_data JSONB,
  validity_period INTERVAL DEFAULT '6 hours',
  view_count INTEGER DEFAULT 0,
  recommendation_count INTEGER DEFAULT 0
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_retailer ON products(retailer);
CREATE INDEX IF NOT EXISTS idx_products_last_updated ON products(last_updated);
CREATE INDEX IF NOT EXISTS idx_products_view_count ON products(view_count);
CREATE INDEX IF NOT EXISTS idx_products_recommendation_count ON products(recommendation_count);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_url ON products(url);

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy for reading products (all users can read)
DROP POLICY IF EXISTS "Anyone can read products" ON products;
CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Only authenticated users can modify products'
    ) THEN
        EXECUTE 'CREATE POLICY "Only authenticated users can modify products" ON products FOR ALL USING (auth.uid() IS NOT NULL)';
    END IF;
END
$$;

-- Create function for atomically incrementing view_count
CREATE OR REPLACE FUNCTION increment_product_view(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET view_count = view_count + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomically incrementing recommendation_count
CREATE OR REPLACE FUNCTION increment_product_recommendation(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET recommendation_count = recommendation_count + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create product categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add category_id to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

-- Insert categories
INSERT INTO product_categories (name, display_name) VALUES
('refrigerators', 'Refrigerators'),
('washing_machines', 'Washing Machines'),
('dryers', 'Dryers'),
('dishwashers', 'Dishwashers'),
('ovens', 'Ovens'),
('microwaves', 'Microwaves'),
('range_hoods', 'Range Hoods')
ON CONFLICT (name) DO NOTHING;

-- Add the missing columns to the products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS recommendation_count INTEGER DEFAULT 0;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
CREATE INDEX IF NOT EXISTS idx_products_view_count ON products(view_count);
CREATE INDEX IF NOT EXISTS idx_products_next_update_at ON products(next_update_at);

-- Create function for atomically incrementing view_count
CREATE OR REPLACE FUNCTION increment_product_view(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET view_count = view_count + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Create function for atomically incrementing recommendation_count
CREATE OR REPLACE FUNCTION increment_product_recommendation(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET recommendation_count = recommendation_count + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql; 