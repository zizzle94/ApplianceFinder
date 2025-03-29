import { NextResponse } from 'next/server';

/**
 * This is a minimal diagnostic endpoint to test if APIs are responsive 
 * when 502 Bad Gateway errors are occurring.
 * It avoids all external dependencies like database and API calls.
 */
export async function GET() {
  // Return immediately with basic environment info but no external calls
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    vercel_env: process.env.VERCEL_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    message: 'This is a minimal diagnostic endpoint that avoids all external dependencies'
  });
} 