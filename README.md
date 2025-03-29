# Appliance Finder

A web application that allows users to find home appliances using natural language input. The application processes queries with the Claude 3.7 Sonnet API, scrapes product results from various retailers using the Oxylabs Web Scraper API, manages user subscriptions with the Stripe API, and stores user data in a Vercel Postgres database.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Zustand, Shadcn/ui
- **Backend:** Next.js API Routes (TypeScript)
- **APIs:** Anthropic Claude 3.7 Sonnet, Oxylabs Web Scraper, Stripe
- **Database:** Vercel Postgres
- **Deployment:** Vercel

## Features

- Natural language search for home appliances
- Product results from multiple retailers (Best Buy, Lowes, Home Depot)
- User interaction tracking for model improvement
- Subscription system with different tiers (Free, Standard, Premium)
- Clean, responsive UI

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- A Vercel Postgres database (or local PostgreSQL for development)
- API keys for Claude, Oxylabs, and Stripe

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/appliance-finder.git
   cd appliance-finder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your API keys and database credentials:
     - `ANTHROPIC_API_KEY` - Claude API key
     - `OXYLABS_USERNAME` - Oxylabs username
     - `OXYLABS_PASSWORD` - Oxylabs password
     - Other environment variables as needed

4. Initialize the database:
   ```bash
   npm run init-db
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

1. Create a Vercel project and link it to your repository.
2. Set up the environment variables in the Vercel project settings.
3. Deploy with `vercel` or connect your repository for automatic deployments.

## API Routes

- `/api/search` - Process user queries and return appliance results
- `/api/track-click` - Track user clicks on product results
- `/api/create-checkout-session` - Create a Stripe checkout session for subscriptions
- `/api/webhooks/stripe` - Handle Stripe webhook events

## Subscription Tiers

- **Free Tier:** 25 queries per month
- **Standard Tier:** 25 queries per month ($9.99)
- **Premium Tier:** Unlimited queries ($29.99)

## License

[MIT License](LICENSE)

## Acknowledgments

- Anthropic for the Claude 3.7 Sonnet API
- Oxylabs for the Web Scraper API
- Stripe for payment processing
- Vercel for hosting and database services 