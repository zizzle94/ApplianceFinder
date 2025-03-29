import { createClient } from '@supabase/supabase-js';

// These environment variables will need to be set in .env.local and in Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper for user subscription tier
export async function getUserSubscriptionTier(userId: string): Promise<string> {
  if (!userId) return 'free';
  
  const { data, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
    
  if (error || !data) return 'free';
  return data.subscription_tier || 'free';
}

// Function to update user subscription
export async function updateUserSubscription(
  userId: string, 
  stripeCustomerId: string, 
  subscriptionTier: string
): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({
      stripe_customer_id: stripeCustomerId,
      subscription_tier: subscriptionTier,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
    
  return !error;
}

// Create a new user (for when someone subscribes for the first time)
export async function createUser(
  email: string,
  stripeCustomerId: string,
  subscriptionTier: string = 'free'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      stripe_customer_id: stripeCustomerId,
      subscription_tier: subscriptionTier
    })
    .select('id')
    .single();
    
  if (error || !data) return null;
  return data.id;
}

// Save a query to the database
export async function saveQuery(
  userId: string, 
  inputText: string, 
  claudeResponse: any
): Promise<string | null> {
  const { data, error } = await supabase
    .from('queries')
    .insert({
      user_id: userId,
      input_text: inputText,
      claude_response: claudeResponse
    })
    .select('id')
    .single();
    
  if (error || !data) return null;
  return data.id;
}

// Update query with selected product
export async function updateQueryWithSelectedProduct(
  queryId: string, 
  productUrl: string
): Promise<boolean> {
  const { error } = await supabase
    .from('queries')
    .update({ selected_product: productUrl })
    .eq('id', queryId);
    
  return !error;
}

// Count queries in last month for a user
export async function countUserQueriesInLastMonth(userId: string): Promise<number> {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const { count, error } = await supabase
    .from('queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', lastMonth.toISOString());
    
  if (error) return 0;
  return count || 0;
} 