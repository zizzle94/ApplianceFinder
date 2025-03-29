import { NextRequest, NextResponse } from 'next/server';
import { countUserQueriesInLastMonth } from '../../../lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Configure the route as dynamic to handle cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client for server-side operations
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the count of queries for the user
    const count = await countUserQueriesInLastMonth(session.user.id);

    // Return the count
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error in query-count API route:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while fetching query count.' },
      { status: 500 }
    );
  }
} 