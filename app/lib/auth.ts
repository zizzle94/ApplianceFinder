'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getUserById } from './db';

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
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
  
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
export async function getCurrentUser() {
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