import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { updateQueryWithProductDTO } from '@/app/lib/supabase-dal';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * PATCH /api/queries/[id]
 * Updates a query with a selected product
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the query ID from the URL
  const queryId = params.id;
  
  // Get the current user
  const currentUser = await getCurrentUser();
  
  // If no user is authenticated, return unauthorized
  if (!currentUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
  
  // Validate request body
  const { productUrl } = body;
  
  if (!productUrl || typeof productUrl !== 'string') {
    return NextResponse.json(
      { error: 'Product URL is required and must be a string' },
      { status: 400 }
    );
  }
  
  // Validate URL format
  try {
    new URL(productUrl);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid product URL' },
      { status: 400 }
    );
  }
  
  // Update query in database
  const success = await updateQueryWithProductDTO(queryId, productUrl);
  
  // If updating failed, return error
  if (!success) {
    return NextResponse.json(
      { error: 'Failed to update query' },
      { status: 500 }
    );
  }
  
  // Return success
  return NextResponse.json({ success: true });
} 