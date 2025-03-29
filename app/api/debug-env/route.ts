import { NextResponse } from 'next/server';

export async function GET() {
  // Check for presence of environment variables
  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    OXYLABS_USERNAME_EXISTS: !!process.env.OXYLABS_USERNAME,
    OXYLABS_PASSWORD_EXISTS: !!process.env.OXYLABS_PASSWORD,
    ANTHROPIC_API_KEY_EXISTS: !!process.env.ANTHROPIC_API_KEY,
    OXYLABS_USERNAME_PREVIEW: process.env.OXYLABS_USERNAME 
      ? `${process.env.OXYLABS_USERNAME.substring(0, 3)}...${process.env.OXYLABS_USERNAME.substring(process.env.OXYLABS_USERNAME.length - 3)}`
      : 'not set',
    ENV_FILE_LOADED: process.env.NEXT_PUBLIC_SITE_URL === 'http://localhost:3000' ? true : false,
  };

  return NextResponse.json({ 
    message: 'Environment variables debug information',
    environment: envVars
  });
} 