'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getUserById } from './db';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for server components
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
};

// Cached user getter for consistent access within a request
export const getCurrentUser = cache(async () => {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  return { id: session.user.id, email: session.user.email };
});

// Authorization helper
export function canAccessUserData(viewerId: string | null, targetUserId: string) {
  if (!viewerId) return false;
  return viewerId === targetUserId;
}

// Helper to check if user can access specific query data
export function canAccessQueryData(viewerId: string | null, queryUserId: string) {
  return canAccessUserData(viewerId, queryUserId);
}

// Check if user is admin
export async function isUserAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
    
  return data?.subscription_tier === 'admin';
}

// Define the session interface
export interface Session {
  user: {
    id: string;
    email: string;
  };
}

// Get the current session on the server
export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  
  const supabase = createServerSupabaseClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  return {
    user: {
      id: session.user.id,
      email: session.user.email || '',
    }
  };
}

// Get the current user with subscription information
export async function getCurrentUserWithSubscription() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }
  
  // Get user data from the database
  const user = await getUserById(session.user.id);
  
  return {
    id: session.user.id,
    email: session.user.email,
    subscriptionTier: user?.subscription_tier || 'free',
  };
} 