import { NextRequest, NextResponse } from 'next/server';
import { getProductByUrl, incrementProductViewCount } from '../../lib/db';

export async function POST(request: NextRequest) {
  try {
    // Extract data from the request body
    const { url } = await request.json();
    
    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }
    
    // Get the product from the database
    const product = await getProductByUrl(url);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Increment the view count
    await incrementProductViewCount(product.id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Product view tracked successfully',
      productId: product.id
    });
  } catch (error) {
    console.error('Error tracking product view:', error);
    return NextResponse.json({ 
      error: 'Server error tracking product view',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 