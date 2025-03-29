import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleWebhookEvent } from '../../../lib/api/stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any, // Cast to any to bypass type error
});

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body as a string
    const rawBody = await request.text();
    
    // Get the signature header
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature header' }, 
        { status: 400 }
      );
    }
    
    // Verify the webhook signature
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${(err as Error).message}` }, 
        { status: 400 }
      );
    }
    
    // Handle the event
    await handleWebhookEvent(event);
    
    // Return a successful response
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error in Stripe webhook API route:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while processing the webhook.' }, 
      { status: 500 }
    );
  }
} 