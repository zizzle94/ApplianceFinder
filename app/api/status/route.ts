import { NextResponse } from 'next/server';

export async function GET() {
  // Check the environment variables and service status
  const status = {
    apiStatus: 'online',
    environmentVariables: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set ✅' : 'Missing ❌',
      OXYLABS_USERNAME: process.env.OXYLABS_USERNAME ? 'Set ✅' : 'Missing ❌',
      OXYLABS_PASSWORD: process.env.OXYLABS_PASSWORD ? 'Set ✅' : 'Missing ❌',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set ✅' : 'Missing ❌',
    },
    database: 'Unknown',
    claude: 'Unknown',
    memory: {
      rss: 'Unknown',
      heapTotal: 'Unknown',
      heapUsed: 'Unknown',
    }
  };
  
  // Check database connection by trying to import db module
  let dbStatus = 'Unknown';
  try {
    // Dynamic import to avoid loading issues
    const { getUserById } = await import('@/app/lib/db');
    dbStatus = 'Import succeeded';
    
    // Try a lightweight database operation
    try {
      await getUserById('00000000-0000-0000-0000-000000000000');
      dbStatus = 'Connection succeeded';
    } catch (error) {
      if (error instanceof Error) {
        dbStatus = `DB operation failed: ${error.message}`;
      } else {
        dbStatus = `DB operation failed: ${String(error)}`;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      dbStatus = `Import failed: ${error.message}`;
    } else {
      dbStatus = `Import failed: ${String(error)}`;
    }
  }
  
  // Check Claude API by trying to import
  let claudeStatus = 'Unknown';
  try {
    // Dynamic import to avoid loading issues
    const { processApplianceQuery } = await import('@/app/lib/api/claude');
    claudeStatus = 'Import succeeded';
  } catch (error) {
    if (error instanceof Error) {
      claudeStatus = `Import failed: ${error.message}`;
    } else {
      claudeStatus = `Import failed: ${String(error)}`;
    }
  }
  
  // Get memory usage
  const memoryUsage = process.memoryUsage();
  
  status.database = dbStatus;
  status.claude = claudeStatus;
  status.memory = {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
  };
  
  return NextResponse.json(status);
} 