-- This is meant to be run in the Supabase SQL Editor once you've created your project

-- Update the users table to include email for authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Enable Row Level Security (RLS) on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Users can only read and update their own records
CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Create policies for queries table
-- Users can only see their own queries
CREATE POLICY "Users can view their own queries" 
  ON queries FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own queries" 
  ON queries FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own queries" 
  ON queries FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create policies for feedback table
-- Users can see and submit feedback for their queries
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

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, subscription_tier)
  VALUES (new.id, new.email, 'free');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 