import { NextRequest, NextResponse } from 'next/server';
import { getProductsToUpdate, createOrUpdateProduct } from '../../lib/db';
import { scrapeProductData } from '../../lib/api/product-scraper';

// Maximum number of products to update in a single job run
const BATCH_SIZE = 20;

// Use the new Next.js 14+ configuration format
export const runtime = 'edge';
export const preferredRegion = ['iad1']; // Use the same region as your database for best performance

export async function GET(request: NextRequest) {
  try {
    // Check for the cron header
    // This is a Vercel-specific header that is set when the endpoint is called by a cron job
    const isCron = request.headers.get('x-vercel-cron') === 'true';
    const authHeader = request.headers.get('authorization');

    // Unauthorized access check (basic auth protection for local development)
    // In production, only Vercel Cron should be able to call this endpoint with the correct header
    if (!isCron && (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the start of the job
    console.log(`Starting product update job at ${new Date().toISOString()}`);

    // Get products that need updating in priority order
    const products = await getProductsToUpdate(BATCH_SIZE);
    console.log(`Found ${products.length} products to update`);

    if (products.length === 0) {
      return NextResponse.json({ message: 'No products to update' });
    }

    // Track updates
    const updatedProducts = [];
    const failedProducts = [];

    // Process products in sequence to avoid rate limiting
    for (const product of products) {
      try {
        console.log(`Updating product: ${product.product_name} (${product.url})`);
        
        // Scrape the latest data
        const newData = await scrapeProductData(product.url);
        
        if (!newData) {
          console.warn(`Failed to get new data for product: ${product.product_name}`);
          failedProducts.push({ id: product.id, url: product.url, reason: 'Failed to scrape data' });
          continue;
        }
        
        // Update the product in the database
        await createOrUpdateProduct(
          newData.name || product.product_name,
          newData.retailer || product.retailer,
          newData.price,
          product.url,
          { ...newData },
          6 // Default validity period
        );
        
        updatedProducts.push({ 
          id: product.id, 
          name: newData.name || product.product_name,
          oldPrice: product.price,
          newPrice: newData.price
        });
        
        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error updating product ${product.id}:`, error);
        failedProducts.push({ 
          id: product.id, 
          url: product.url, 
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Log the results
    console.log(`Completed product update job at ${new Date().toISOString()}`);
    console.log(`Updated ${updatedProducts.length} products, ${failedProducts.length} failed`);

    return NextResponse.json({
      message: 'Product update job completed',
      updated: updatedProducts.length,
      failed: failedProducts.length,
      updatedProducts,
      failedProducts
    });
  } catch (error) {
    console.error('Error in update products job:', error);
    return NextResponse.json({ 
      error: 'Server error running update products job',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 