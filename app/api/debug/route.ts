import { NextResponse } from 'next/server';
import { checkEnvironmentVariables } from '../../lib/api/env-check';

export async function GET() {
  // Check environment variables
  const envCheck = checkEnvironmentVariables();
  
  // Get sanitized environment variables
  const oxylabsUsername = process.env.OXYLABS_USERNAME;
  const oxylabsPassword = process.env.OXYLABS_PASSWORD;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  // Create sanitized versions of the keys
  const sanitizedKeys = {
    OXYLABS_USERNAME: oxylabsUsername ? `${oxylabsUsername.substring(0, 3)}...` : 'Not set',
    OXYLABS_PASSWORD: oxylabsPassword ? 'Set (hidden)' : 'Not set',
    ANTHROPIC_API_KEY: anthropicKey ? `${anthropicKey.substring(0, 5)}...` : 'Not set',
  };
  
  // Get process environment info
  const nodeEnv = process.env.NODE_ENV || 'Not set';
  const vercelEnv = process.env.VERCEL_ENV || 'Not set';
  
  return NextResponse.json({
    envCheck,
    sanitizedKeys,
    environment: {
      NODE_ENV: nodeEnv,
      VERCEL_ENV: vercelEnv,
    },
    timestamp: new Date().toISOString(),
  });
} 