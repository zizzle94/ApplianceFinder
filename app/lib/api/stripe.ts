import Stripe from 'stripe';
import { updateUserSubscription, createUser } from '../db';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any, // Cast to any to bypass type error
});

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Appliance Guide',
    price: 0,
    queryLimit: 50,
    stripePriceId: null,
    maxRecommendations: 5,
    comparisonFeature: false,
    personalizedRecommendations: false,
    followUpQuestions: false,
    homeSpyIntegration: false,
    homeSpyLimit: 0,
    specificationsSheet: false,
    userManual: false,
    installationInstructions: false,
    savedAppliancesLimit: 0,
    queryHistory: false,
    fullQueryHistory: false,
    prioritySupport: false
  },
  MIDDLE: {
    name: 'Appliance Voyager',
    price: 9.99,
    queryLimit: 25,
    stripePriceId: process.env.STRIPE_MIDDLE_TIER_PRICE_ID,
    maxRecommendations: 10,
    comparisonFeature: true,
    personalizedRecommendations: false,
    followUpQuestions: false,
    homeSpyIntegration: true,
    homeSpyLimit: 1,
    specificationsSheet: true,
    userManual: false,
    installationInstructions: false,
    savedAppliancesLimit: 3,
    queryHistory: true,
    fullQueryHistory: false,
    prioritySupport: false
  },
  TOP: {
    name: 'Appliance Pioneer',
    price: 29.99,
    queryLimit: Infinity,
    stripePriceId: process.env.STRIPE_TOP_TIER_PRICE_ID,
    maxRecommendations: 10,
    comparisonFeature: true,
    personalizedRecommendations: true,
    followUpQuestions: true,
    homeSpyIntegration: true,
    homeSpyLimit: Infinity,
    specificationsSheet: true,
    userManual: true,
    installationInstructions: true,
    savedAppliancesLimit: Infinity,
    queryHistory: true,
    fullQueryHistory: true,
    prioritySupport: true
  },
};

// Get the query limit for a subscription tier
export function getQueryLimit(tier: string): number {
  switch (tier) {
    case 'free':
      return SUBSCRIPTION_TIERS.FREE.queryLimit;
    case 'middle':
      return SUBSCRIPTION_TIERS.MIDDLE.queryLimit;
    case 'top':
      return SUBSCRIPTION_TIERS.TOP.queryLimit;
    default:
      return SUBSCRIPTION_TIERS.FREE.queryLimit;
  }
}

// Create a checkout session for a subscription
export async function createCheckoutSession(tier: 'middle' | 'top', userId?: string): Promise<string> {
  // Get the price ID for the tier
  const priceId = tier === 'middle' 
    ? SUBSCRIPTION_TIERS.MIDDLE.stripePriceId 
    : SUBSCRIPTION_TIERS.TOP.stripePriceId;
  
  if (!priceId) {
    throw new Error(`Price ID not configured for subscription tier: ${tier}`);
  }

  // Create metadata
  const metadata: Record<string, string> = {
    tier,
  };
  
  if (userId) {
    metadata.userId = userId;
  }

  // Create a checkout session with proper type casting for Stripe SDK
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId as string, // Cast to string to avoid type errors
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    metadata,
  } as any); // Use type assertion for now

  return session.url || '';
}

// Handle webhook events from Stripe
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const { tier, userId } = metadata;
      const stripeCustomerId = session.customer as string;

      if (!tier || !stripeCustomerId) {
        console.error('Missing required data in session:', session);
        return;
      }

      // If we already have a user ID, update their subscription
      if (userId) {
        await updateUserSubscription(userId, stripeCustomerId, tier);
      } else {
        // Otherwise, create a new user
        await createUser(stripeCustomerId, tier);
      }
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      // Handle subscription updates like plan changes
      // You would need to implement this based on your specific needs
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // TODO: Set the user's tier back to 'free'
      // This would require adding a function to find a user by stripe_customer_id
      break;
    }
    
    default:
      // Unhandled event type
      break;
  }
} 