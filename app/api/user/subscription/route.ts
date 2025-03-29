import { NextResponse } from 'next/server';
import { getUserSubscriptionDTO } from '@/app/lib/supabase-dal';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/user/subscription
 * Returns the current user's subscription information
 */
export async function GET() {
  // Get the current user
  const currentUser = await getCurrentUser();
  
  // If no user is authenticated, return unauthorized
  if (!currentUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Get subscription data from our DAL
  const subscriptionData = await getUserSubscriptionDTO(currentUser.id);
  
  // If no data was found, return not found
  if (!subscriptionData) {
    return NextResponse.json(
      { error: 'Subscription data not found' },
      { status: 404 }
    );
  }
  
  // Return the subscription data
  return NextResponse.json(subscriptionData);
} 