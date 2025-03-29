import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { persist, createJSONStorage } from 'zustand/middleware';

// Client-side Supabase instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types 
export interface UserProfile {
  id: string;
  email: string;
  subscriptionTier: string;
}

export interface UserSubscription {
  tier: string;
  usageCount: number;
  limitCount: number;
}

export interface UserQuery {
  id: string;
  inputText: string;
  claudeResponse: any;
  selectedProduct: string | null;
  createdAt: string;
}

interface UserStoreState {
  // User data
  user: UserProfile | null;
  subscription: UserSubscription | null;
  recentQueries: UserQuery[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Data loading actions
  loadUserData: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  loadRecentQueries: (page?: number, limit?: number) => Promise<void>;
  
  // Query actions
  saveQuery: (inputText: string, claudeResponse: any) => Promise<string | null>;
  updateQueryWithProduct: (queryId: string, productUrl: string) => Promise<boolean>;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      subscription: null,
      recentQueries: [],
      isLoading: false,
      error: null,
      
      // Auth actions
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) throw new Error(error.message);
          
          if (data.user) {
            set({ 
              user: {
                id: data.user.id,
                email: data.user.email || '',
                subscriptionTier: 'free' // Will be updated in loadUserData
              },
              isLoading: false
            });
            
            // Load user data after successful sign in
            await get().loadUserData();
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },
      
      signOut: async () => {
        set({ isLoading: true });
        await supabase.auth.signOut();
        set({ 
          user: null, 
          subscription: null,
          recentQueries: [],
          isLoading: false
        });
      },
      
      // Data loading actions
      loadUserData: async () => {
        const { user, isLoading } = get();
        
        if (!user || isLoading) return;
        
        set({ isLoading: true, error: null });
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            set({ user: null, subscription: null, isLoading: false });
            return;
          }
          
          // Get subscription data through an API route
          const response = await fetch('/api/user/subscription');
          if (!response.ok) throw new Error('Failed to load subscription data');
          
          const subscriptionData = await response.json();
          
          set({ 
            user: {
              id: session.user.id,
              email: session.user.email || '',
              subscriptionTier: subscriptionData.tier
            },
            subscription: subscriptionData,
            isLoading: false 
          });
          
          // Load recent queries
          await get().loadRecentQueries();
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },
      
      refreshSubscription: async () => {
        const { user } = get();
        if (!user) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch('/api/user/subscription');
          if (!response.ok) throw new Error('Failed to refresh subscription');
          
          const subscriptionData = await response.json();
          set({ 
            subscription: subscriptionData, 
            isLoading: false,
            user: {
              ...get().user!,
              subscriptionTier: subscriptionData.tier
            }
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },
      
      loadRecentQueries: async (page = 1, limit = 5) => {
        const { user } = get();
        if (!user) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch(`/api/user/queries?page=${page}&limit=${limit}`);
          if (!response.ok) throw new Error('Failed to load queries');
          
          const data = await response.json();
          set({ 
            recentQueries: data.queries,
            isLoading: false
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },
      
      // Query actions
      saveQuery: async (inputText: string, claudeResponse: any) => {
        const { user } = get();
        if (!user) return null;
        
        set({ isLoading: true });
        try {
          const response = await fetch('/api/queries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputText, claudeResponse }),
          });
          
          if (!response.ok) throw new Error('Failed to save query');
          
          const data = await response.json();
          
          // Add the new query to recentQueries
          set(state => ({
            recentQueries: [
              {
                id: data.id,
                inputText,
                claudeResponse,
                selectedProduct: null,
                createdAt: new Date().toISOString()
              },
              ...state.recentQueries.slice(0, 4) // Keep only the 5 most recent
            ],
            isLoading: false
          }));
          
          // Refresh subscription data to update usage counts
          await get().refreshSubscription();
          
          return data.id;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },
      
      updateQueryWithProduct: async (queryId: string, productUrl: string) => {
        const { user } = get();
        if (!user) return false;
        
        set({ isLoading: true });
        try {
          const response = await fetch(`/api/queries/${queryId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productUrl }),
          });
          
          if (!response.ok) throw new Error('Failed to update query');
          
          // Update the query in recentQueries
          set(state => ({
            recentQueries: state.recentQueries.map(query => 
              query.id === queryId 
                ? { ...query, selectedProduct: productUrl }
                : query
            ),
            isLoading: false
          }));
          
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      }
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user,
        // Don't persist sensitive data in localStorage
        // subscription: state.subscription,
        // recentQueries: state.recentQueries 
      }),
    }
  )
); 