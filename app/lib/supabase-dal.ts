import 'server-only';
import { createServerSupabaseClient, getCurrentUser, canAccessUserData, canAccessQueryData } from './auth';

// DTOs (Data Transfer Objects) - Type-safe objects ready for client consumption
export interface SubscriptionDTO {
  tier: string;
  usageCount: number;
  limitCount: number;
}

export interface QueryDTO {
  id: string;
  inputText: string;
  claudeResponse: any;
  selectedProduct: string | null;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  email: string;
  subscriptionTier: string;
  stripeCustomerId: string | null;
}

// Secure data access methods
export async function getUserSubscriptionDTO(userId: string): Promise<SubscriptionDTO | null> {
  const currentUser = await getCurrentUser();
  
  // Authorization check
  if (!currentUser || !canAccessUserData(currentUser.id, userId)) {
    return null;
  }
  
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  
  // Count queries for usage limits
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const { count } = await supabase
    .from('queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', lastMonth.toISOString());
  
  // Create a safe DTO with only the necessary data
  return {
    tier: data.subscription_tier || 'free',
    usageCount: count || 0,
    limitCount: data.subscription_tier === 'premium' ? 100 : 5
  };
}

// Get user queries with pagination
export async function getUserQueriesDTO(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ queries: QueryDTO[], totalCount: number } | null> {
  const currentUser = await getCurrentUser();
  
  // Authorization check
  if (!currentUser || !canAccessUserData(currentUser.id, userId)) {
    return null;
  }
  
  const supabase = createServerSupabaseClient();
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  // Get total count first
  const { count, error: countError } = await supabase
    .from('queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
    
  if (countError) return null;
  
  // Get paginated data
  const { data, error } = await supabase
    .from('queries')
    .select('id, input_text, claude_response, selected_product, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error || !data) return null;
  
  // Transform to DTO format
  const queries = data.map(item => ({
    id: item.id,
    inputText: item.input_text,
    claudeResponse: item.claude_response,
    selectedProduct: item.selected_product,
    createdAt: item.created_at
  }));
  
  return {
    queries,
    totalCount: count || 0
  };
}

// Save a new query
export async function saveQueryDTO(
  userId: string,
  inputText: string,
  claudeResponse: any
): Promise<string | null> {
  const currentUser = await getCurrentUser();
  
  // Authorization check
  if (!currentUser || !canAccessUserData(currentUser.id, userId)) {
    return null;
  }
  
  const supabase = createServerSupabaseClient();
  
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
export async function updateQueryWithProductDTO(
  queryId: string,
  productUrl: string
): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;
  
  // Get the query first to check ownership
  const supabase = createServerSupabaseClient();
  const { data: queryData } = await supabase
    .from('queries')
    .select('user_id')
    .eq('id', queryId)
    .single();
    
  if (!queryData || !canAccessQueryData(currentUser.id, queryData.user_id)) {
    return false;
  }
  
  // Update the query
  const { error } = await supabase
    .from('queries')
    .update({ selected_product: productUrl })
    .eq('id', queryId);
    
  return !error;
}

// Get user profile data
export async function getUserProfileDTO(userId: string): Promise<UserDTO | null> {
  const currentUser = await getCurrentUser();
  
  // Authorization check
  if (!currentUser || !canAccessUserData(currentUser.id, userId)) {
    return null;
  }
  
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, subscription_tier, stripe_customer_id')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    email: data.email || '',
    subscriptionTier: data.subscription_tier || 'free',
    stripeCustomerId: data.stripe_customer_id
  };
} 