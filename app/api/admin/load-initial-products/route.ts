import { NextRequest, NextResponse } from 'next/server';
import { main } from '../../../scripts/load-initial-products';

export const runtime = 'nodejs'; // We need Node.js runtime for this operation

export async function GET(request: NextRequest) {
  console.log('Starting product loading API route...');
  
  try {
    // Add authentication/authorization check here
    console.log('Checking authorization...');
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
      console.error('Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Authorization successful');

    // Run the product loading script
    console.log('Running product loading script...');
    await main();
    console.log('Product loading script completed');
    
    return NextResponse.json({ 
      success: true,
      message: 'Initial products loading process completed'
    });
  } catch (error) {
    console.error('Error loading initial products:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 