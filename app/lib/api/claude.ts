import { Anthropic } from '@anthropic-ai/sdk';
import { getUserById } from '../db';
import { SUBSCRIPTION_TIERS } from './stripe';

// Define a type for subscription tier configuration
interface SubscriptionTierConfig {
  name: string;
  price: number;
  queryLimit: number;
  stripePriceId: string | null | undefined;
  maxRecommendations?: number;
  comparisonFeature?: boolean;
  personalizedRecommendations?: boolean;
  followUpQuestions?: boolean;
  homeSpyIntegration?: boolean;
  homeSpyLimit?: number;
  specificationsSheet?: boolean;
  userManual?: boolean;
  installationInstructions?: boolean;
  savedAppliancesLimit?: number;
  queryHistory?: boolean;
  fullQueryHistory?: boolean;
  prioritySupport?: boolean;
}

// Create a Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the input/output types for the processApplianceQuery function
export interface ClaudeQueryInput {
  userQuery: string;
  userId?: string;
  subscriptionTier?: 'free' | 'middle' | 'top';
  pastQueries?: string[];
}

export interface ClaudeQueryOutput {
  applianceType: string;
  features: string[];
  priceRange: {
    min: number | null;
    max: number | null;
  };
  brands: string[];
  recommendedProducts?: {
    name: string;
    features: string[];
    estimatedPrice: string;
    retailers: string[];
  }[];
  comparisonTable?: {
    headers: string[];
    rows: string[][];
  };
  specificationsSheetURL?: string;
  userManualURL?: string;
  installationInstructionsURL?: string;
  productURLs?: string[];
}

// Add retry utility for API calls with model fallback
async function retryWithBackoff<T>(fn: (modelOverride?: string) => Promise<T>, retries = 3, initialBackoffMs = 1000): Promise<T> {
  let lastError: any;
  let currentBackoff = initialBackoffMs;
  let useBackupModel = false;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // If we've already tried the primary model and it was overloaded, use the backup model
      return await fn(useBackupModel ? 'claude-3-5-sonnet-20240620' : undefined);
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable (Claude overloaded or rate limit)
      const isClaudeOverloaded = error?.status === 529 || 
                                (error?.error?.error?.type === 'overloaded_error') ||
                                (error?.message?.includes('overloaded'));
      
      const isRateLimit = error?.status === 429 || 
                         (error?.message?.includes('rate limit'));
      
      const shouldRetry = isClaudeOverloaded || isRateLimit;
      
      // If not retryable or we've used all retries, throw
      if (!shouldRetry || attempt === retries) {
        throw lastError;
      }
      
      // If the error is because of an overloaded model, try the backup model next time
      if (isClaudeOverloaded && !useBackupModel) {
        useBackupModel = true;
        console.log(`Claude 3.7 Sonnet is overloaded, will try Claude 3.5 Sonnet on next attempt`);
      }
      
      // Log the retry attempt
      console.log(`API call failed with ${error.message || error}, retrying in ${currentBackoff}ms (attempt ${attempt + 1}/${retries}, using ${useBackupModel ? 'backup' : 'primary'} model)`);
      
      // Wait with exponential backoff before retry
      await new Promise(resolve => setTimeout(resolve, currentBackoff));
      
      // Increase backoff for next attempt (exponential with jitter)
      currentBackoff = currentBackoff * 2 * (0.8 + Math.random() * 0.4);
    }
  }
  
  // If we somehow get here, throw the last error
  throw lastError;
}

// Process a user query with Claude
export async function processApplianceQuery({ 
  userQuery, 
  userId, 
  subscriptionTier = 'free',
  pastQueries = []
}: ClaudeQueryInput): Promise<ClaudeQueryOutput> {
  try {
    // If userId is provided but subscriptionTier is not, get the user's tier from the database
    if (userId && subscriptionTier === 'free') {
      const user = await getUserById(userId);
      if (user) {
        subscriptionTier = user.subscription_tier as 'free' | 'middle' | 'top';
      }
    }
    
    // Get the tier-specific limits
    const tierConfig: SubscriptionTierConfig = subscriptionTier === 'middle' 
      ? SUBSCRIPTION_TIERS.MIDDLE 
      : subscriptionTier === 'top' 
        ? SUBSCRIPTION_TIERS.TOP 
        : SUBSCRIPTION_TIERS.FREE;
    
    // Build the prompt based on the subscription tier
    let prompt = `You are a helpful assistant that translates user requests for home appliances into structured data. The user will provide a description of the appliance they are looking for, which may contain misspellings, informal language, or various ways of expressing the same thing. Be generous in interpreting vague or incomplete requests.

Your task is to extract and normalize the following information:

applianceType (string): The type of appliance, normalized to one of these exact values: ["refrigerator", "washer", "dryer", "dishwasher", "oven", "microwave", "stove", "freezer", "range", "cooktop", "rangehood", "air conditioner", "dehumidifier", "vacuum", "wine cooler", "beverage center", "ice maker", "trash compactor", "garbage disposal"]. Handle common variations and misspellings, for example:
- "fridge", "refridgerator", "frig" → "refrigerator"
- "washing machine", "clothes washer", "laundry machine" → "washer"
- "clothes dryer", "drying machine", "tumble dryer" → "dryer"
- "dish washer", "dish-washer", "dishwashing machine" → "dishwasher"
- "range", "stove top", "cooker" → "stove"
- "microwave oven", "microwave", "micro" → "microwave"
- "cooking range", "range stove", "kitchen range" → "range"
- "hood", "exhaust hood", "vent hood" → "rangehood"
- "AC", "A/C", "air con", "cooling unit" → "air conditioner"
- "humidity remover", "dehumid" → "dehumidifier"
- "vac", "vacuum cleaner", "hoover" → "vacuum" 
- "wine fridge", "wine refrigerator" → "wine cooler"
- "drink cooler", "drink fridge" → "beverage center"
- "ice machine", "ice maker machine" → "ice maker"
- "trash crusher", "waste compactor" → "trash compactor"
- "disposal", "food disposal", "waste disposal" → "garbage disposal"

features (array of strings): Specific features mentioned by the user, normalized and expanded. This is critical - be generous in inferring features even if user doesn't explicitly state them. Examples:
- Colors: "stainless", "stainless steel", "ss", "black", "white", "slate", "bisque", "panel ready", "black stainless"
- Sizes/Dimensions: "large", "small", "compact", "french door", "side by side", "top freezer", "bottom freezer", "counter depth", "standard depth", "apartment size", "18 inch", "24 inch", "30 inch", "36 inch", "cubic feet"
- Configuration: "french door", "side by side", "top freezer", "bottom freezer", "front load", "top load", "stackable", "portable", "built-in", "freestanding", "slide-in", "drop-in", "under counter"
- Energy: "energy efficient", "energy star", "eco mode", "energy saving"
- Technology: "smart", "wifi", "app control", "voice control", "alexa", "google assistant", "smart home compatible"
- Refrigerator Features: "ice maker", "water dispenser", "door-in-door", "flex zone", "dual zone", "adjustable shelves", "crisper drawer"
- Washer/Dryer Features: "steam", "sanitize cycle", "quiet", "large capacity", "high efficiency", "HE", "allergen cycle", "quick wash"
- Dishwasher Features: "quiet", "third rack", "soil sensor", "quick wash", "sanitize", "stainless steel tub"
- Cooking Features: "convection", "air fry", "steam", "induction", "gas", "electric", "dual fuel", "self-cleaning", "rapid preheat", "warming drawer"
- Air Quality: "HEPA filter", "air purifier", "odor control", "carbon filter"
- Materials: "steel", "glass", "ceramic", "cast iron", "porcelain"
- Style: "modern", "traditional", "professional", "industrial", "commercial style"

priceRange (object): An object with min and max properties (numbers) representing the desired price range. Handle various formats:
- Exact: "$500", "500 dollars" → { min: 500, max: 500 }
- Under: "under $1000", "less than 1000", "no more than 1k", "budget friendly", "inexpensive" → { min: null, max: 1000 }
- Over: "over $500", "more than 500", "at least $500", "high end", "premium" → { min: 500, max: null }
- Range: "between $500 and $1000", "$500-1000", "mid-range" → { min: 500, max: 1000 }
- Budget terms: "cheap", "inexpensive", "affordable", "budget" → { min: null, max: 500 }
- Mid-range terms: "mid-range", "moderately priced" → { min: 500, max: 1500 }
- Premium terms: "luxury", "high end", "premium", "professional grade" → { min: 1500, max: null }
- Default if no price mentioned: { min: null, max: null }

brands (array of strings): Any specific brands mentioned by the user, normalized to standard names. Handle common variations and misspellings:
- "GE", "General Electric", "General-Electric" → "GE"
- "LG Electronics", "LG" → "LG"
- "Whirlpool", "whirlpool" → "Whirlpool"
- "Samsung Electronics", "Samsung" → "Samsung"
- "Frigidaire", "Frigidair" → "Frigidaire"
- "Maytag", "Maytag Corporation" → "Maytag"
- "KitchenAid", "Kitchen Aid" → "KitchenAid"
- "Bosch", "Bosch Home" → "Bosch"
- "Miele" → "Miele"
- "Viking", "Viking Range" → "Viking"
- "Sub-Zero", "SubZero", "Sub Zero" → "Sub-Zero"
- "Wolf" → "Wolf"
- "Thermador" → "Thermador"
- "Electrolux" → "Electrolux"
- "JennAir", "Jenn-Air", "Jenn Air" → "JennAir"
- "Café", "Cafe", "GE Cafe" → "Café"
- "Fisher & Paykel", "Fisher and Paykel" → "Fisher & Paykel"
- "Smeg" → "Smeg"
- "Haier" → "Haier"
- "Amana" → "Amana"
- "Bertazzoni" → "Bertazzoni"
- "Speed Queen" → "Speed Queen"
- "Dacor" → "Dacor"
- "Monogram", "GE Monogram" → "Monogram"
- "Liebherr" → "Liebherr"`;

    // Add enhanced features for middle and top tiers
    if (subscriptionTier === 'middle' || subscriptionTier === 'top') {
      prompt += `\n\nAdditionally, provide the following based on the extracted information:

recommendedProducts (array of objects): Recommended products that match the user's criteria. For each product, include:
- name: A descriptive name for the product
- features: Key features that make this product a good match
- estimatedPrice: Estimated price range for the product
- retailers: Likely retailers that carry this product
- productURL: A specific, direct URL to this product at the primary retailer. Follow these guidelines:
  * For Best Buy: "https://www.bestbuy.com/site/[brand]-[model]-[key-features]/[product-id].p"
  * For Home Depot: "https://www.homedepot.com/p/[brand]/[product-name]/[product-id]"
  * For Lowes: "https://www.lowes.com/pd/[brand]/[product-id]"
  * Include as much specific information in the URL as possible
  * Use hyphens between words, lowercase, and avoid special characters
  * This URL is critically important and will be used to retrieve real-time pricing

Provide up to ${tierConfig.maxRecommendations || 5} recommended products.`;

      if (tierConfig.comparisonFeature) {
        prompt += `\n\ncomparisonTable (object): If the user's query is ambiguous between multiple types of appliances, provide a comparison table with:
- headers: Column headers for the comparison table
- rows: Array of rows, each containing values for each header

This helps the user understand the differences between similar appliance types.`;
      }

      if (tierConfig.specificationsSheet) {
        prompt += `\n\nspecificationsSheetURL (string): A likely URL where the user could find detailed specifications for this type of appliance. This should be a realistic URL to a major retailer or manufacturer's specifications page.`;
      }
    }

    // Add top tier exclusive features
    if (subscriptionTier === 'top') {
      prompt += `\n\nuserManualURL (string): A likely URL where the user could find the user manual for this type of appliance. This should be a realistic URL to a major manufacturer's support page.

installationInstructionsURL (string): A likely URL where the user could find installation instructions for this type of appliance. This should be a realistic URL to a major manufacturer's support page.`;

      // Add personalized recommendations if we have past queries
      if (tierConfig.personalizedRecommendations && pastQueries.length > 0) {
        prompt += `\n\nPersonalize your recommendations based on the user's past queries:\n${pastQueries.join('\n')}\n\nConsider these past queries to tailor your recommendations to better match the user's preferences and needs.`;
      }
    }

    prompt += `\n\nBe generous in your interpretation - if the user's request is vague or incomplete, make reasonable assumptions about what they might want.

Return only the JSON object, no other text.

User Input:
${userQuery}`;

    // Use the retry mechanism for Claude API calls
    const response = await retryWithBackoff(async (modelOverride) => {
      const modelToUse = modelOverride || 'claude-3-7-sonnet-20250219';
      console.log(`Making Claude API request with model: ${modelToUse}...`);
      return anthropic.messages.create({
        model: modelToUse,
        max_tokens: 2000,
        temperature: 0,
        system: 'You are a helpful assistant that extracts structured information from user appliance queries. Respond with only JSON, no other text. Be generous in interpreting vague or incomplete requests.',
        messages: [
          { role: 'user', content: prompt }
        ],
      });
    }, 3, 2000); // 3 retries with 2 second initial backoff

    // Extract and parse the JSON from the response
    // Check if the content block is of type 'text'
    if (response.content[0].type === 'text') {
      const jsonText = response.content[0].text;
      const outputData = JSON.parse(jsonText) as ClaudeQueryOutput;
      return outputData;
    } else {
      throw new Error('Unexpected response format from Claude API');
    }
  } catch (error) {
    console.error('Error processing query with Claude:', error);
    throw error;
  }
} 