import { NextResponse } from 'next/server';

export async function GET() {
  // Don't show any partial credentials or API keys
  const envStatus = {
    OXYLABS_USERNAME_EXISTS: !!process.env.OXYLABS_USERNAME,
    OXYLABS_PASSWORD_EXISTS: !!process.env.OXYLABS_PASSWORD,
    ANTHROPIC_API_KEY_EXISTS: !!process.env.ANTHROPIC_API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    VERCEL_ENV: process.env.VERCEL_ENV || 'Not set',
  };
  
  return NextResponse.json(envStatus);
} 