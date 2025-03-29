import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '../../lib/api/stripe';

export async function POST(request: NextRequest) {
  try {
    // Extract the tier from the request body
    const { tier } = await request.json();
    
    // Validate the tier
    if (!tier || (tier !== 'middle' && tier !== 'top')) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' }, 
        { status: 400 }
      );
    }
    
    // For now, we're using a default user ID for testing
    const userId = '00000000-0000-0000-0000-000000000000';
    
    // Create a checkout session
    const url = await createCheckoutSession(tier, userId);
    
    // Return the checkout URL
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while creating the checkout session.' }, 
      { status: 500 }
    );
  }
} 