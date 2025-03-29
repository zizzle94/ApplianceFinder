import { createClient } from '@supabase/supabase-js';
import { getUserById } from '../db';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Record a HomeSpy lookup
export async function recordHomeSpyLookup(
  userId: string, 
  modelNumber: string, 
  serialNumber: string, 
  result: any
) {
  try {
    const { data, error } = await supabase
      .from('homespy_lookups')
      .insert({
        user_id: userId,
        model_number: modelNumber,
        serial_number: serialNumber,
        result
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error recording HomeSpy lookup:', error);
    throw error;
  }
}

// Check if user has reached their HomeSpy lookup limit
export async function hasReachedHomeSpyLimit(userId: string) {
  try {
    // Get the user's subscription tier
    const user = await getUserById(userId);
    if (!user) return true;
    
    const tier = user.subscription_tier || 'free';
    let limit = 0;
    
    // Set the limit based on tier
    if (tier === 'middle') {
      limit = 1; // Middle tier limit
    } else if (tier === 'top') {
      return false; // Top tier has unlimited HomeSpy lookups
    }
    
    // If it's free tier or limit is 0, user can't use HomeSpy
    if (tier === 'free' || limit === 0) return true;
    
    // Use the database function to count lookups in the last 30 days
    const { data, error } = await supabase
      .rpc('count_homespy_lookups', { p_user_id: userId, p_days: 30 });
      
    if (error) throw error;
    
    // Check if the user has reached their limit
    return (data || 0) >= limit;
  } catch (error) {
    console.error('Error checking HomeSpy limit:', error);
    return true; // Default to limit reached if there's an error
  }
} 