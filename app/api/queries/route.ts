import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { saveQueryDTO } from '@/app/lib/supabase-dal';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * POST /api/queries
 * Saves a new query to the database
 */
export async function POST(request: NextRequest) {
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
  const { inputText, claudeResponse } = body;
  
  if (!inputText || typeof inputText !== 'string') {
    return NextResponse.json(
      { error: 'Input text is required and must be a string' },
      { status: 400 }
    );
  }
  
  if (!claudeResponse) {
    return NextResponse.json(
      { error: 'Claude response is required' },
      { status: 400 }
    );
  }
  
  // Save query to database
  const queryId = await saveQueryDTO(currentUser.id, inputText, claudeResponse);
  
  // If saving failed, return error
  if (!queryId) {
    return NextResponse.json(
      { error: 'Failed to save query' },
      { status: 500 }
    );
  }
  
  // Return success with query ID
  return NextResponse.json({ id: queryId }, { status: 201 });
} 