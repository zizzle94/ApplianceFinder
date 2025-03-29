'use server';

import { supabase } from '../supabase';
// Remove fs and path imports
// import path from 'path';
// import fs from 'fs';

// Define schema SQL directly as a string constant
const SCHEMA_SQL = `
-- Drop tables if they exist (for development only)
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS queries;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS product_category_junction;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_customer_id TEXT UNIQUE,
    subscription_tier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create queries table
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    input_text TEXT,
    claude_response JSONB,
    selected_product TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: For explicit feedback (implement later if desired)
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES queries(id),
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create product categories table with parent-child relationship
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    parent_id UUID REFERENCES product_categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    UNIQUE(name, parent_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    retailer TEXT NOT NULL,
    price DECIMAL,
    url TEXT UNIQUE NOT NULL,
    image_url TEXT,
    metadata JSONB,
    primary_category_id UUID REFERENCES product_categories(id),
    view_count INTEGER DEFAULT 0,
    recommendation_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_update_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
    update_priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for many-to-many relationship between products and categories
CREATE TABLE IF NOT EXISTS product_category_junction (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, category_id)
);

-- Create default user for testing
INSERT INTO users (id, subscription_tier)
VALUES ('00000000-0000-0000-0000-000000000000', 'free')
ON CONFLICT (id) DO NOTHING;
`;

// Define schema update SQL directly as a string constant
const SCHEMA_UPDATE_SQL = `
-- Insert main categories
INSERT INTO product_categories (name, display_name, level) VALUES
('refrigerators', 'Refrigerators', 1),
('washing_machines', 'Washing Machines', 1),
('dryers', 'Dryers', 1),
('dishwashers', 'Dishwashers', 1),
('ovens', 'Ovens', 1),
('microwaves', 'Microwaves', 1),
('range_hoods', 'Range Hoods', 1),
('air_conditioners', 'Air Conditioners', 1),
('vacuum_cleaners', 'Vacuum Cleaners', 1)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Insert subcategories for refrigerators
WITH parent AS (SELECT id FROM product_categories WHERE name = 'refrigerators' AND parent_id IS NULL LIMIT 1)
INSERT INTO product_categories (name, display_name, parent_id, level) VALUES
('french_door', 'French Door', (SELECT id FROM parent), 2),
('side_by_side', 'Side by Side', (SELECT id FROM parent), 2),
('top_freezer', 'Top Freezer', (SELECT id FROM parent), 2),
('bottom_freezer', 'Bottom Freezer', (SELECT id FROM parent), 2),
('counter_depth', 'Counter Depth', (SELECT id FROM parent), 2),
('mini_fridge', 'Mini Fridge', (SELECT id FROM parent), 2)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Insert subcategories for washing machines
WITH parent AS (SELECT id FROM product_categories WHERE name = 'washing_machines' AND parent_id IS NULL LIMIT 1)
INSERT INTO product_categories (name, display_name, parent_id, level) VALUES
('front_load', 'Front Load', (SELECT id FROM parent), 2),
('top_load', 'Top Load', (SELECT id FROM parent), 2),
('compact', 'Compact', (SELECT id FROM parent), 2),
('smart', 'Smart', (SELECT id FROM parent), 2)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Insert subcategories for dryers
WITH parent AS (SELECT id FROM product_categories WHERE name = 'dryers' AND parent_id IS NULL LIMIT 1)
INSERT INTO product_categories (name, display_name, parent_id, level) VALUES
('electric', 'Electric', (SELECT id FROM parent), 2),
('gas', 'Gas', (SELECT id FROM parent), 2),
('compact', 'Compact', (SELECT id FROM parent), 2),
('smart', 'Smart', (SELECT id FROM parent), 2)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Insert subcategories for dishwashers
WITH parent AS (SELECT id FROM product_categories WHERE name = 'dishwashers' AND parent_id IS NULL LIMIT 1)
INSERT INTO product_categories (name, display_name, parent_id, level) VALUES
('built_in', 'Built-In', (SELECT id FROM parent), 2),
('portable', 'Portable', (SELECT id FROM parent), 2),
('drawer', 'Drawer', (SELECT id FROM parent), 2)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Insert subcategories for ovens
WITH parent AS (SELECT id FROM product_categories WHERE name = 'ovens' AND parent_id IS NULL LIMIT 1)
INSERT INTO product_categories (name, display_name, parent_id, level) VALUES
('wall_oven', 'Wall Oven', (SELECT id FROM parent), 2),
('range', 'Range', (SELECT id FROM parent), 2),
('double_oven', 'Double Oven', (SELECT id FROM parent), 2),
('gas', 'Gas', (SELECT id FROM parent), 2),
('electric', 'Electric', (SELECT id FROM parent), 2)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_primary_category_id ON products(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_junction_product_id ON product_category_junction(product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_junction_category_id ON product_category_junction(category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_junction_is_primary ON product_category_junction(is_primary);
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
`;

export async function initializeDatabase() {
  try {
    // Execute schema SQL using Supabase's rpc call
    const { error } = await supabase.rpc('exec_sql', { sql_query: SCHEMA_SQL });
    
    if (error) throw error;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Initialize database schema updates
export async function initializeSchemaUpdates() {
  try {
    // Execute schema update SQL using Supabase's rpc call
    const { error } = await supabase.rpc('exec_sql', { sql_query: SCHEMA_UPDATE_SQL });
    
    if (error) throw error;
    console.log('Database schema updates applied successfully');
  } catch (error) {
    console.error('Error applying database schema updates:', error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Get user's recent queries
export async function getUserQueries(userId: string, limit: number = 5) {
  try {
    const { data, error } = await supabase
      .from('queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user queries:', error);
    return [];
  }
}

// Save a query to the database
export async function saveQuery(userId: string, inputText: string, claudeResponse: any) {
  try {
    const { data, error } = await supabase
      .from('queries')
      .insert({
        user_id: userId,
        input_text: inputText,
        claude_response: claudeResponse
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving query:', error);
    throw error;
  }
}

// Update query with selected product
export async function updateQueryWithSelectedProduct(queryId: string, productUrl: string) {
  try {
    const { error } = await supabase
      .from('queries')
      .update({ selected_product: productUrl })
      .eq('id', queryId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating query:', error);
    throw error;
  }
}

// Count queries in last month for a user
export async function countUserQueriesInLastMonth(userId: string) {
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const { count, error } = await supabase
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', lastMonth.toISOString());
      
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting queries:', error);
    throw error;
  }
}

// Save an appliance
export async function saveAppliance(
  userId: string, 
  productName: string, 
  productUrl: string, 
  productImageUrl: string, 
  productPrice: string,
  applianceType: string,
  description: string
) {
  try {
    const { data, error } = await supabase
      .from('saved_appliances')
      .insert({
        user_id: userId,
        product_name: productName,
        product_url: productUrl,
        product_image_url: productImageUrl,
        product_price: productPrice,
        appliance_type: applianceType,
        description: description
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving appliance:', error);
    throw error;
  }
}

// Get user's saved appliances
export async function getSavedAppliances(userId: string) {
  try {
    const { data, error } = await supabase
      .from('saved_appliances')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting saved appliances:', error);
    return [];
  }
}

// Delete a saved appliance
export async function deleteSavedAppliance(applianceId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('saved_appliances')
      .delete()
      .eq('id', applianceId)
      .eq('user_id', userId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting saved appliance:', error);
    throw error;
  }
}

// Check if user has reached their saved appliances limit
export async function hasReachedSavedAppliancesLimit(userId: string) {
  try {
    // Get the user's subscription tier
    const user = await getUserById(userId);
    if (!user) return true;
    
    const tier = user.subscription_tier || 'free';
    let limit = 0;
    
    // Set the limit based on tier
    if (tier === 'middle') {
      limit = 3; // Middle tier limit
    } else if (tier === 'top') {
      return false; // Top tier has unlimited saved appliances
    }
    
    // If it's free tier or limit is 0, user can't save any appliances
    if (tier === 'free' || limit === 0) return true;
    
    // Count the user's saved appliances
    const { count, error } = await supabase
      .from('saved_appliances')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    if (error) throw error;
    
    // Check if the user has reached their limit
    return (count || 0) >= limit;
  } catch (error) {
    console.error('Error checking saved appliances limit:', error);
    return true; // Default to limit reached if there's an error
  }
}

// Record a HomeSpy lookup
export async function recordHomeSpyLookup(
  userId: string, 
  modelNumber: string, 
  serialNumber: string, 
  result: any
) {
  try {
    const { data, error } = await supabase
      .from('homespy_lookups')
      .insert({
        user_id: userId,
        model_number: modelNumber,
        serial_number: serialNumber,
        result
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error recording HomeSpy lookup:', error);
    throw error;
  }
}

// Check if user has reached their HomeSpy lookup limit
export async function hasReachedHomeSpyLimit(userId: string) {
  try {
    // Get the user's subscription tier
    const user = await getUserById(userId);
    if (!user) return true;
    
    const tier = user.subscription_tier || 'free';
    let limit = 0;
    
    // Set the limit based on tier
    if (tier === 'middle') {
      limit = 1; // Middle tier limit
    } else if (tier === 'top') {
      return false; // Top tier has unlimited HomeSpy lookups
    }
    
    // If it's free tier or limit is 0, user can't use HomeSpy
    if (tier === 'free' || limit === 0) return true;
    
    // Use the database function to count lookups in the last 30 days
    const { data, error } = await supabase
      .rpc('count_homespy_lookups', { p_user_id: userId, p_days: 30 });
      
    if (error) throw error;
    
    // Check if the user has reached their limit
    return (data || 0) >= limit;
  } catch (error) {
    console.error('Error checking HomeSpy limit:', error);
    return true; // Default to limit reached if there's an error
  }
}

// Update user subscription
export async function updateUserSubscription(userId: string, stripeCustomerId: string, subscriptionTier: string) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        stripe_customer_id: stripeCustomerId,
        subscription_tier: subscriptionTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

// Create a new user (for when someone subscribes for the first time)
export async function createUser(email: string, stripeCustomerId: string, subscriptionTier: string = 'free') {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        stripe_customer_id: stripeCustomerId,
        subscription_tier: subscriptionTier
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Product-related functions
export async function getProductByUrl(url: string) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('url', url)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data || null;
  } catch (error) {
    console.error('Error getting product by URL:', error);
    return null;
  }
}

export async function findSimilarProducts(productName: string, retailer: string, limit: number = 5) {
  try {
    // This performs a search based on product name similarity and exact retailer match
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('product_name', `%${productName.replace(/%/g, '\\%')}%`) // Escape % characters
      .eq('retailer', retailer)
      .order('last_updated', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error finding similar products:', error);
    return [];
  }
}

export async function getProductsToUpdate(limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .lte('next_update_at', new Date().toISOString())
      .order('update_priority', { ascending: false })
      .order('next_update_at', { ascending: true })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting products to update:', error);
    return [];
  }
}

export async function createOrUpdateProduct(
  productName: string,
  retailer: string,
  price: number | null,
  url: string,
  metadata: any = {},
  validityPeriodDays: number = 7
) {
  try {
    const nextUpdate = new Date();
    nextUpdate.setDate(nextUpdate.getDate() + validityPeriodDays);
    
    const { data, error } = await supabase
      .from('products')
      .upsert({
        product_name: productName,
        retailer: retailer,
        price: price,
        url: url,
        metadata: metadata,
        last_updated: new Date().toISOString(),
        next_update_at: nextUpdate.toISOString(),
        // Reset priority after update
        update_priority: 0
      }, { 
        onConflict: 'url',
        ignoreDuplicates: false
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data?.id;
  } catch (error) {
    console.error('Error creating/updating product:', error);
    throw error;
  }
}

export async function incrementProductViewCount(productId: string) {
  try {
    // Use an atomic increment operation
    const { error } = await supabase.rpc('increment_product_view', { product_id: productId });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error incrementing product view count:', error);
    return false;
  }
}

export async function incrementProductRecommendationCount(productId: string) {
  try {
    // Use an atomic increment operation
    const { error } = await supabase.rpc('increment_product_recommendation', { product_id: productId });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error incrementing product recommendation count:', error);
    return false;
  }
}

// Get all main categories (no parent)
export async function getMainCategories() {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .is('parent_id', null)
      .order('display_name', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting main categories:', error);
    return [];
  }
}

// Get all product categories (replaced by more specific functions)
export async function getProductCategories() {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('level', { ascending: true })
      .order('display_name', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting product categories:', error);
    return [];
  }
}

// Get subcategories for a given parent category
export async function getSubcategories(parentId: string) {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('parent_id', parentId)
      .order('display_name', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting subcategories:', error);
    return [];
  }
}

// Get category by ID with its full path (including parent)
export async function getCategoryWithPath(categoryId: string) {
  try {
    // First get the category
    const { data: category, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', categoryId)
      .single();
      
    if (error) throw error;
    if (!category) return null;
    
    // If it has a parent, get the parent too
    if (category.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('product_categories')
        .select('*')
        .eq('id', category.parent_id)
        .single();
        
      if (!parentError && parent) {
        return {
          ...category,
          parent: parent
        };
      }
    }
    
    return category;
  } catch (error) {
    console.error('Error getting category with path:', error);
    return null;
  }
}

// Get category ID by name and parent
export async function getCategoryIdByNameAndParent(categoryName: string, parentId: string | null = null) {
  try {
    const query = supabase
      .from('product_categories')
      .select('id')
      .eq('name', categoryName);
      
    if (parentId) {
      query.eq('parent_id', parentId);
    } else {
      query.is('parent_id', null);
    }
    
    const { data, error } = await query.single();
      
    if (error) throw error;
    return data?.id;
  } catch (error) {
    console.error('Error getting category ID:', error);
    return null;
  }
}

// Get category ID by name (backward compatibility - gets main category)
export async function getCategoryIdByName(categoryName: string) {
  return getCategoryIdByNameAndParent(categoryName, null);
}

// Get products by category
export async function getProductsByCategory(categoryId: string, limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from('product_category_junction')
      .select('product_id')
      .eq('category_id', categoryId)
      .limit(limit);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      const productIds = data.map(item => item.product_id);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .order('created_at', { ascending: false });
        
      if (productsError) throw productsError;
      return products || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting products by category:', error);
    return [];
  }
}

// Add a product to a category (with option to set as primary)
export async function addProductToCategory(productId: string, categoryId: string, isPrimary: boolean = false) {
  try {
    // If setting as primary, first update the product's primary_category_id
    if (isPrimary) {
      const { error: primaryError } = await supabase
        .from('products')
        .update({ primary_category_id: categoryId })
        .eq('id', productId);
        
      if (primaryError) throw primaryError;
      
      // Also update any existing junction entries to not be primary
      const { error: junctionUpdateError } = await supabase
        .from('product_category_junction')
        .update({ is_primary: false })
        .eq('product_id', productId);
        
      if (junctionUpdateError) throw junctionUpdateError;
    }
    
    // Add to junction table (or update if already exists)
    const { error } = await supabase
      .from('product_category_junction')
      .upsert({ 
        product_id: productId, 
        category_id: categoryId,
        is_primary: isPrimary 
      }, {
        onConflict: 'product_id,category_id',
        ignoreDuplicates: false
      });
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding product to category:', error);
    return false;
  }
}

// Remove a product from a category
export async function removeProductFromCategory(productId: string, categoryId: string) {
  try {
    // Check if this is the primary category
    const { data, error: checkError } = await supabase
      .from('product_category_junction')
      .select('is_primary')
      .eq('product_id', productId)
      .eq('category_id', categoryId)
      .single();
      
    if (checkError) throw checkError;
    
    // If this is the primary category, clear the primary_category_id
    if (data && data.is_primary) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ primary_category_id: null })
        .eq('id', productId);
        
      if (updateError) throw updateError;
    }
    
    // Remove from junction table
    const { error } = await supabase
      .from('product_category_junction')
      .delete()
      .eq('product_id', productId)
      .eq('category_id', categoryId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing product from category:', error);
    return false;
  }
}

// Get all categories for a product
export async function getCategoriesForProduct(productId: string) {
  try {
    const { data, error } = await supabase
      .from('product_category_junction')
      .select(`
        category_id,
        is_primary,
        product_categories:category_id (*)
      `)
      .eq('product_id', productId);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting product categories:', error);
    return [];
  }
}

// Update product category (backward compatibility - sets primary category)
export async function updateProductCategory(productId: string, categoryId: string) {
  return addProductToCategory(productId, categoryId, true);
} 