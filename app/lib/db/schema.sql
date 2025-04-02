-- Drop tables if they exist (for development only)
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS queries;
DROP TABLE IF EXISTS saved_appliances;
DROP TABLE IF EXISTS homespy_lookups;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_customer_id TEXT UNIQUE,
    subscription_tier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create queries table
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    input_text TEXT,
    claude_response JSONB,
    selected_product TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: For explicit feedback (implement later if desired)
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES queries(id),
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create default user for testing
INSERT INTO users (id, subscription_tier)
VALUES ('00000000-0000-0000-0000-000000000000', 'free')
ON CONFLICT (id) DO NOTHING; 