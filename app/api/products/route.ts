import { NextRequest, NextResponse } from 'next/server';
import { scrapeProductData, extractRetailerFromUrl } from '../../lib/api/product-scraper';
import { createOrUpdateProduct, getProductByUrl } from '../../lib/db';
import { getSession } from '../../lib/api/session';
import { detectProductCategories, applyCategoriesToProduct } from '../../lib/api/category-detection';

// Helper function to parse interval strings like "6 hours" to milliseconds
function parseIntervalToMs(interval: string): number {
  const parts = interval.match(/^(\d+)\s+(\w+)$/);
  if (!parts) return 6 * 3600000; // Default to 6 hours
  
  const value = parseInt(parts[1], 10);
  const unit = parts[2].toLowerCase();
  
  switch (unit) {
    case 'minute':
    case 'minutes': return value * 60000;
    case 'hour':
    case 'hours': return value * 3600000;
    case 'day':
    case 'days': return value * 86400000;
    case 'week':
    case 'weeks': return value * 604800000;
    default: return 6 * 3600000; // Default to 6 hours
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Product API request received');
    
    // Verify the user is authenticated (optional, can be removed if public access is allowed)
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract data from the request body
    const { url, claudeData } = await request.json();
    
    // Get Claude's applianceType if available
    const claudeApplianceType = claudeData?.applianceType || null;
    console.log(`Processing product with Claude applianceType: ${claudeApplianceType || 'none'}`);
    
    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }
    
    try {
      new URL(url); // This will throw if the URL is invalid
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    
    // Check if we already have this product in the database
    const existingProduct = await getProductByUrl(url);
    if (existingProduct) {
      // Check if the data is still fresh
      const now = new Date();
      const lastUpdated = new Date(existingProduct.last_updated);
      const validityPeriod = existingProduct.validity_period || '6 hours';
      
      // Parse the validity period string to milliseconds
      const validityMs = typeof validityPeriod === 'string'
        ? parseIntervalToMs(validityPeriod)
        : validityPeriod * 3600000; // Assuming it's hours if it's a number
        
      const isFresh = (now.getTime() - lastUpdated.getTime()) < validityMs;
      
      if (isFresh) {
        return NextResponse.json({ 
          message: 'Product data retrieved from cache',
          product: existingProduct,
          cached: true
        });
      }
    }
    
    // If the product doesn't exist or isn't fresh, scrape new data
    console.log(`Scraping product data for URL: ${url}`);
    const productData = await scrapeProductData(url);
    
    if (!productData) {
      return NextResponse.json({ 
        error: 'Failed to retrieve product data',
        url
      }, { status: 500 });
    }
    
    // Enhance metadata with Claude's data if available
    const enhancedMetadata = {
      ...productData,
      claude_appliance_type: claudeApplianceType,
      claude_features: claudeData?.features || [],
      claude_brands: claudeData?.brands || [],
      price_range: claudeData?.priceRange || {}
    };
    
    // Save to database
    const retailer = productData.retailer || extractRetailerFromUrl(url) || 'Unknown';
    const productId = await createOrUpdateProduct(
      productData.name,
      retailer,
      productData.price,
      url,
      enhancedMetadata, // Store the enhanced data with Claude's input
      6 // Default validity period of 6 hours
    );
    
    // Detect and apply product categories - now with dynamic category creation
    console.log('Detecting product categories with dynamic creation...');
    const detectedCategories = await detectProductCategories(
      productData, 
      url, 
      claudeApplianceType
    );
    
    // Apply the detected categories to the product
    if (detectedCategories.length > 0) {
      console.log(`Applying ${detectedCategories.length} detected/created categories to product ${productId}`);
      await applyCategoriesToProduct(productId, detectedCategories);
    } else {
      console.log('No categories detected for this product');
    }
    
    return NextResponse.json({
      message: 'Product data retrieved and saved with dynamic categorization',
      product: {
        id: productId,
        product_name: productData.name,
        retailer,
        price: productData.price,
        url,
        last_updated: new Date().toISOString(),
        claude_data: enhancedMetadata,
        detected_categories: detectedCategories.length,
        validity_period: '6 hours',
        view_count: 0,
        recommendation_count: 0
      },
      cached: false
    });
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({ 
      error: 'Server error processing product data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse the URL to get the product URL
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }
    
    // Get the product from the database
    const product = await getProductByUrl(url);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error in products GET API:', error);
    return NextResponse.json({ 
      error: 'Server error retrieving product data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 