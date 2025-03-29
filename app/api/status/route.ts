import { NextResponse } from 'next/server';

export async function GET() {
  // Only check for existence of environment variables, don't show values
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set ✅' : 'Missing ❌',
    OXYLABS_USERNAME: process.env.OXYLABS_USERNAME ? 'Set ✅' : 'Missing ❌',
    OXYLABS_PASSWORD: process.env.OXYLABS_PASSWORD ? 'Set ✅' : 'Missing ❌',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set ✅' : 'Missing ❌',
  };

  return NextResponse.json({
    status: 'online',
    environment: envStatus,
    timestamp: new Date().toISOString(),
    appVersion: process.env.npm_package_version || '1.0.0'
  });
} 