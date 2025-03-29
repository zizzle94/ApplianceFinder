import { NextResponse } from 'next/server';

export async function GET() {
  // Don't include sensitive information
  const sanitizedKeys = {
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
    ANTHROPIC_API_KEY: 'Hidden for security',
    OXYLABS_USERNAME: 'Hidden for security',
    OXYLABS_PASSWORD: 'Hidden for security',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set (hidden)' : 'Not set',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Hidden for security',
  };

  return NextResponse.json({
    message: 'Debug information',
    environment: process.env.NODE_ENV,
    sanitizedKeys,
    timestamp: new Date().toISOString()
  });
} 