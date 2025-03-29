import { NextRequest, NextResponse } from 'next/server';
import { updateQueryWithSelectedProduct } from '../../lib/db';

export async function POST(request: NextRequest) {
  try {
    // Extract the queryId and productUrl from the request body
    const { queryId, productUrl } = await request.json();
    
    // Validate the inputs
    if (!queryId || typeof queryId !== 'string') {
      return NextResponse.json(
        { error: 'Query ID is required' }, 
        { status: 400 }
      );
    }
    
    if (!productUrl || typeof productUrl !== 'string') {
      return NextResponse.json(
        { error: 'Product URL is required' }, 
        { status: 400 }
      );
    }
    
    // Update the query in the database
    await updateQueryWithSelectedProduct(queryId, productUrl);
    
    // Return a successful response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in track-click API route:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while tracking the product click.' }, 
      { status: 500 }
    );
  }
} 