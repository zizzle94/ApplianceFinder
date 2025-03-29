import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getUserQueriesDTO } from '@/app/lib/supabase-dal';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/user/queries
 * Returns the current user's queries with pagination
 */
export async function GET(request: NextRequest) {
  // Get the current user
  const currentUser = await getCurrentUser();
  
  // If no user is authenticated, return unauthorized
  if (!currentUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  
  // Validate parameters
  if (isNaN(page) || page < 1) {
    return NextResponse.json(
      { error: 'Invalid page parameter' },
      { status: 400 }
    );
  }
  
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: 'Invalid limit parameter' },
      { status: 400 }
    );
  }
  
  // Get queries data from our DAL
  const queriesData = await getUserQueriesDTO(currentUser.id, page, limit);
  
  // If no data was found, return empty array
  if (!queriesData) {
    return NextResponse.json(
      { queries: [], totalCount: 0 },
      { status: 200 }
    );
  }
  
  // Return the queries data
  return NextResponse.json(queriesData);
} 