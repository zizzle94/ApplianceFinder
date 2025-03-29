// Runtime configuration settings for the application

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// Configuration for retailers
export const RETAILERS = {
  BEST_BUY: {
    name: 'Best Buy',
    domain: 'bestbuy.com',
    source: 'universal_ecommerce'
  },
  HOME_DEPOT: {
    name: 'Home Depot',
    domain: 'homedepot.com',
    source: 'universal_ecommerce'
  },
  LOWES: {
    name: 'Lowes',
    domain: 'lowes.com',
    source: 'universal_ecommerce'
  }
};

// API timeouts in milliseconds
export const API_TIMEOUTS = {
  OXYLABS: 30000, // 30 seconds for Oxylabs requests
  SEARCH: 180000,  // 3 minutes for full search operations
  DEFAULT: 10000   // Default timeout for other operations
};

// Feature flags
export const FEATURES = {
  ENABLE_MOCK_DATA: process.env.NODE_ENV === 'development',
  ENABLE_LOGGING: process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true',
  ENABLE_CACHING: process.env.NODE_ENV === 'production'
}; 