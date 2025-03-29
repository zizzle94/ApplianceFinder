import { NextRequest, NextResponse } from 'next/server';
import { main } from '../../../scripts/load-initial-products';

export const runtime = 'nodejs'; // We need Node.js runtime for this operation

export async function GET(request: NextRequest) {
  try {
    // Add authentication/authorization check here
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the product loading script
    await main();
    
    return NextResponse.json({ 
      success: true,
      message: 'Initial products loading process completed'
    });
  } catch (error) {
    console.error('Error loading initial products:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 