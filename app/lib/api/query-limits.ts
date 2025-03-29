import { getUserById, countUserQueriesInLastMonth } from '../db';
import { getQueryLimit } from './stripe';

// Check if a user has exceeded their query limit
export async function hasExceededQueryLimit(userId: string): Promise<boolean> {
  try {
    // Get the user record
    const user = await getUserById(userId);
    if (!user) {
      // If the user doesn't exist, they can't use the service
      return true;
    }

    // Get the user's subscription tier
    const tier = user.subscription_tier || 'free';
    
    // Get the query limit for the tier
    const queryLimit = getQueryLimit(tier);
    
    // Count the user's queries in the last month
    const queryCount = await countUserQueriesInLastMonth(userId);
    
    // Check if the user has exceeded their limit
    return queryCount >= queryLimit;
  } catch (error) {
    console.error('Error checking query limit:', error);
    // If there's an error, we default to not allowing the query
    return true;
  }
}

// Get the remaining queries for a user
export async function getRemainingQueries(userId: string): Promise<number> {
  try {
    // Get the user record
    const user = await getUserById(userId);
    if (!user) {
      return 0;
    }

    // Get the user's subscription tier
    const tier = user.subscription_tier || 'free';
    
    // Get the query limit for the tier
    const queryLimit = getQueryLimit(tier);
    
    // If the user has unlimited queries, return Infinity
    if (queryLimit === Infinity) {
      return Infinity;
    }
    
    // Count the user's queries in the last month
    const queryCount = await countUserQueriesInLastMonth(userId);
    
    // Calculate the remaining queries
    const remaining = Math.max(0, queryLimit - queryCount);
    return remaining;
  } catch (error) {
    console.error('Error getting remaining queries:', error);
    return 0;
  }
} 