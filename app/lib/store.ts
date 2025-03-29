import { create } from 'zustand';
import { Product } from './api/oxylabs-scraper';
import { ClaudeQueryOutput } from './api/claude';

// Define the store state type
interface AppState {
  // User input
  userQuery: string;
  setUserQuery: (query: string) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  
  // Claude response
  claudeResponse: ClaudeQueryOutput | null;
  setClaudeResponse: (response: ClaudeQueryOutput | null) => void;
  
  // Product results
  products: Product[];
  setProducts: (products: Product[]) => void;
  
  // Query ID for tracking
  currentQueryId: string | null;
  setCurrentQueryId: (id: string | null) => void;
  
  // Error state
  error: string | null;
  setError: (error: string | null) => void;
  
  // User quota
  remainingQueries: number;
  setRemainingQueries: (count: number) => void;
  
  // Reset state
  resetState: () => void;
}

// SSR-safe store creation
const createStore = () => 
  create<AppState>((set) => ({
    // Initial state
    userQuery: '',
    isLoading: false,
    claudeResponse: null,
    products: [],
    currentQueryId: null,
    error: null,
    remainingQueries: 25, // Default to free tier
    
    // Actions
    setUserQuery: (query) => set({ userQuery: query }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setClaudeResponse: (response) => set({ claudeResponse: response }),
    setProducts: (products) => set({ products }),
    setCurrentQueryId: (id) => set({ currentQueryId: id }),
    setError: (error) => set({ error }),
    setRemainingQueries: (count) => set({ remainingQueries: count }),
    
    // Reset state to initial values
    resetState: () => set({
      userQuery: '',
      isLoading: false,
      claudeResponse: null,
      products: [],
      currentQueryId: null,
      error: null,
    }),
  }));

// Ensures the store is only created once in the client
let store: ReturnType<typeof createStore> | undefined;

export const useAppStore = typeof window !== 'undefined' 
  ? (() => {
      if (!store) {
        store = createStore();
      }
      return store;
    })()
  : createStore(); // During SSR, a new store is created each time 