-- Enhanced RLS policies for better security
-- This should be run in the Supabase SQL Editor

-- Ensure RLS is enabled for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with more secure versions
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own queries" ON queries;
DROP POLICY IF EXISTS "Users can insert their own queries" ON queries;
DROP POLICY IF EXISTS "Users can update their own queries" ON queries;
DROP POLICY IF EXISTS "Users can view feedback for their queries" ON feedback;
DROP POLICY IF EXISTS "Users can insert feedback for their queries" ON feedback;

-- Enhanced policies for users table
CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update limited fields" 
  ON users FOR UPDATE 
  USING (auth.uid()::text = id::text)
  WITH CHECK (
    -- Only allow updating specific fields
    (OLD.email = NEW.email) AND
    (OLD.id = NEW.id) AND
    (
      -- Only admins can change subscription tier
      (OLD.subscription_tier = NEW.subscription_tier) OR
      (auth.jwt() ->> 'role' = 'admin')
    )
  );

-- Enhanced policies for queries table
CREATE POLICY "Users can view their own queries" 
  ON queries FOR SELECT USING (auth.uid()::text = user_id::text);

-- Add policy with time-based expiration for sensitive fields
CREATE POLICY "Hide response details after 30 days" 
  ON queries FOR SELECT 
  USING (
    auth.uid()::text = user_id::text AND 
    (created_at > (CURRENT_DATE - INTERVAL '30 days') OR 
     claude_response IS NULL)
  );

CREATE POLICY "Users can insert their own queries" 
  ON queries FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Prevent query deletion, only allow updates to selected_product
CREATE POLICY "Users can update selected product only" 
  ON queries FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (
    auth.uid()::text = user_id::text AND
    (
      (OLD.selected_product IS NULL AND NEW.selected_product IS NOT NULL) OR
      (OLD.selected_product IS NOT NULL AND NEW.selected_product IS NOT NULL AND
       OLD.selected_product != NEW.selected_product)
    ) AND
    OLD.input_text = NEW.input_text AND
    OLD.claude_response = NEW.claude_response AND
    OLD.user_id = NEW.user_id AND
    OLD.id = NEW.id
  );

-- Enhanced policies for feedback table
CREATE POLICY "Users can view feedback for their queries" 
  ON feedback FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM queries 
      WHERE queries.id = feedback.query_id 
      AND queries.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert feedback for their queries" 
  ON feedback FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM queries 
      WHERE queries.id = feedback.query_id 
      AND queries.user_id::text = auth.uid()::text
    )
  );

-- Add rate limiting function using Supabase's built-in extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION check_rate_limit(
  user_id TEXT,
  action_type TEXT,
  max_requests INTEGER,
  window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  window_start TIMESTAMP;
  request_count INTEGER;
BEGIN
  window_start := NOW() - (window_seconds * INTERVAL '1 second');
  
  SELECT COUNT(*) INTO request_count
  FROM public.rate_limits
  WHERE user_id = check_rate_limit.user_id
    AND action = check_rate_limit.action_type
    AND created_at > window_start;
    
  IF request_count >= max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, action, created_at)
  VALUES (check_rate_limit.user_id, check_rate_limit.action_type, NOW());
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add index for faster lookups
  CONSTRAINT rate_limits_user_action_idx UNIQUE (user_id, action, created_at)
);

-- Create a trigger to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS TRIGGER AS $$
BEGIN
  -- Delete records older than 1 day
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '1 day';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_cleanup_rate_limits
  AFTER INSERT ON public.rate_limits
  EXECUTE PROCEDURE cleanup_rate_limits(); 