import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get user's recent queries
export async function getUserQueries(userId: string, limit: number = 5) {
  try {
    const { data, error } = await supabase
      .from('queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user queries:', error);
    return [];
  }
}

// Save a query to the database
export async function saveQuery(userId: string, inputText: string, claudeResponse: any) {
  try {
    const { data, error } = await supabase
      .from('queries')
      .insert({
        user_id: userId,
        input_text: inputText,
        claude_response: claudeResponse
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving query:', error);
    throw error;
  }
} 