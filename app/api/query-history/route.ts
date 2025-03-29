import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';
import { getUserById } from '../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get the user ID from the session
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get the user's subscription tier
    let subscriptionTier = 'free';
    try {
      const user = await getUserById(userId);
      if (user) {
        subscriptionTier = user.subscription_tier || 'free';
      }
    } catch (error) {
      console.error('Error getting user:', error);
      // Continue with free tier if there's an error
    }
    
    // Check if the user has access to query history
    if (subscriptionTier === 'free') {
      return NextResponse.json(
        { error: 'Query history is not available on the free tier' }, 
        { status: 403 }
      );
    }
    
    // Determine which fields to select based on subscription tier
    let selectFields = '*';
    if (subscriptionTier === 'middle') {
      // For middle tier, only return input_text and created_at
      selectFields = 'id, input_text, created_at';
    }
    
    // Query the database for the user's queries
    const { data, error } = await supabase
      .from('queries')
      .select(selectFields)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ queries: data || [] });
  } catch (error) {
    console.error('Error getting query history:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while retrieving your query history' }, 
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; 