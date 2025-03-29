import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { Anthropic } from '@anthropic-ai/sdk';
import { getUserById } from '../../lib/db'; // Now imports from the re-export adapter we created

export async function GET() {
  const diagnosticResults: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environmentVariables: {},
    tests: {},
    memoryUsage: {},
    recommendations: []
  };
  
  try {
    // 1. Check environment variables
    diagnosticResults.environmentVariables = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
      
      // Check critical API keys (safely without exposing them)
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set ✅' : 'Missing ❌',
      OXYLABS_USERNAME: process.env.OXYLABS_USERNAME ? 'Set ✅' : 'Missing ❌',
      OXYLABS_PASSWORD: process.env.OXYLABS_PASSWORD ? 'Set ✅' : 'Missing ❌',
      
      // Check Supabase environment variables
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌',
      
      // Check Stripe environment variables
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set ✅' : 'Missing ❌',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Set ✅' : 'Missing ❌',
    };
    
    // Create list of missing critical variables
    const missingVars = [];
    if (!process.env.ANTHROPIC_API_KEY) missingVars.push('ANTHROPIC_API_KEY');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    diagnosticResults.missingCriticalVars = missingVars;
    
    // 2. Test Claude API
    diagnosticResults.tests.claude = await testClaudeAPI();
    
    // 3. Test Supabase connection
    diagnosticResults.tests.supabase = await testSupabaseConnection();
    
    // 4. Test DB module function
    try {
      diagnosticResults.tests.dbModule = await testDbModule();
    } catch (dbError) {
      diagnosticResults.tests.dbModule = {
        status: 'failed',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      };
    }
    
    // 5. Memory usage (useful for debugging potential OOM issues)
    const memoryUsage = process.memoryUsage();
    diagnosticResults.memoryUsage = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    };
    
    // 6. Generate recommendations based on diagnostic results
    diagnosticResults.recommendations = generateRecommendations(diagnosticResults);
    
    return NextResponse.json(diagnosticResults);
  } catch (error) {
    // Return error details but try to continue with partial results
    return NextResponse.json({
      error: 'Diagnostic failed',
      errorDetails: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      partialResults: diagnosticResults
    }, { status: 500 });
  }
}

// Test DB module functions
async function testDbModule(): Promise<Record<string, any>> {
  const result: Record<string, any> = {
    status: 'unknown',
    details: {}
  };
  
  try {
    // Test the getUserById function with a dummy ID
    const dummyId = '00000000-0000-0000-0000-000000000000';
    
    result.details.functionExists = typeof getUserById === 'function';
    
    if (!result.details.functionExists) {
      result.status = 'failed';
      result.reason = 'DB module function not found';
      return result;
    }
    
    // Try to call the function (it should not throw even if user is not found)
    await getUserById(dummyId);
    result.status = 'success';
    result.details.functionCalled = true;
    
    return result;
  } catch (error) {
    result.status = 'failed';
    result.reason = 'DB function call error';
    result.details.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

// Test Claude API
async function testClaudeAPI(): Promise<Record<string, any>> {
  const result: Record<string, any> = {
    status: 'unknown',
    details: {}
  };
  
  try {
    // Check if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      result.status = 'failed';
      result.reason = 'Missing API key';
      return result;
    }
    
    // Try to initialize client (this doesn't make an API call yet)
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    result.details.clientInitialized = true;
    
    // Optionally make a minimal API call to test connectivity
    try {
      // Only make the API call if we're in a test/development environment
      // to avoid unnecessary API charges in production
      if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production') {
        const response = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 100,
          temperature: 0,
          system: 'You are a helpful assistant for diagnostic purposes.',
          messages: [
            { role: 'user', content: 'Please reply with "Diagnostic test successful" and nothing else.' }
          ],
        });
        
        result.details.apiCallSucceeded = true;
        result.details.modelVersion = response.model;
        result.status = 'success';
      } else {
        // In production, just report that the client initialized successfully
        result.status = 'success';
        result.details.apiCallSkipped = 'Skipped in production to avoid charges';
      }
    } catch (apiError) {
      result.status = 'failed';
      result.reason = 'API call failed';
      result.details.apiError = apiError instanceof Error ? apiError.message : String(apiError);
    }
  } catch (error) {
    result.status = 'failed';
    result.reason = 'Client initialization failed';
    result.details.error = error instanceof Error ? error.message : String(error);
  }
  
  return result;
}

// Test Supabase connection
async function testSupabaseConnection(): Promise<Record<string, any>> {
  const result: Record<string, any> = {
    status: 'unknown',
    details: {}
  };
  
  try {
    // Check if Supabase URL and key exist
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      result.status = 'failed';
      result.reason = 'Missing Supabase credentials';
      result.details.missingVars = [];
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) result.details.missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) result.details.missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return result;
    }
    
    // Try a simple query to check connectivity
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      result.status = 'failed';
      result.reason = 'Database query failed';
      result.details.error = error.message;
      result.details.code = error.code;
    } else {
      result.status = 'success';
      result.details.count = data;
    }
  } catch (error) {
    result.status = 'failed';
    result.reason = 'Unexpected error';
    result.details.error = error instanceof Error ? error.message : String(error);
  }
  
  return result;
}

// Generate recommendations based on diagnostic results
function generateRecommendations(diagnosticResults: Record<string, any>): string[] {
  const recommendations: string[] = [];
  
  // Check for missing environment variables
  if (diagnosticResults.missingCriticalVars && diagnosticResults.missingCriticalVars.length > 0) {
    recommendations.push(`Configure missing environment variables: ${diagnosticResults.missingCriticalVars.join(', ')}`);
  }
  
  // Check Claude API status
  if (diagnosticResults.tests.claude?.status === 'failed') {
    if (diagnosticResults.tests.claude.reason === 'Missing API key') {
      recommendations.push('Add the ANTHROPIC_API_KEY to your environment variables');
    } else if (diagnosticResults.tests.claude.details?.apiError) {
      recommendations.push(`Fix Claude API issue: ${diagnosticResults.tests.claude.details.apiError}`);
    }
  }
  
  // Check Supabase status
  if (diagnosticResults.tests.supabase?.status === 'failed') {
    if (diagnosticResults.tests.supabase.reason === 'Missing Supabase credentials') {
      recommendations.push('Add the missing Supabase credentials to your environment variables');
    } else if (diagnosticResults.tests.supabase.details?.error) {
      recommendations.push(`Fix Supabase connection issue: ${diagnosticResults.tests.supabase.details.error}`);
    }
  }
  
  // Check DB module status
  if (diagnosticResults.tests.dbModule?.status === 'failed') {
    recommendations.push(`Fix DB module issue: ${diagnosticResults.tests.dbModule.reason || diagnosticResults.tests.dbModule.details?.error || 'Unknown DB module error'}`);
  }
  
  // Default recommendation if everything seems okay but we're still having issues
  if (recommendations.length === 0) {
    recommendations.push('All systems appear to be configured correctly. Try redeploying the application or check for temporary service outages.');
  }
  
  return recommendations;
} 