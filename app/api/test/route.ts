import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get test scenario from query parameter
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get('scenario') || 'success';
  
  console.log(`Running test scenario: ${scenario}`);
  
  try {
    switch (scenario) {
      case 'success':
        return NextResponse.json({ 
          status: 'success', 
          message: 'Test API is working correctly' 
        });
        
      case 'error':
        throw new Error('Test error scenario');
        
      case 'anthropic':
        // Test Anthropic API key and import
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
          throw new Error('ANTHROPIC_API_KEY is not set');
        }
        
        try {
          // Attempt to import the Anthropic SDK
          const { Anthropic } = await import('@anthropic-ai/sdk');
          
          // Create an Anthropic client instance
          const anthropic = new Anthropic({
            apiKey: anthropicKey,
          });
          
          return NextResponse.json({ 
            status: 'success', 
            message: 'Anthropic API integration test passed',
            keyExists: true
          });
        } catch (error) {
          return NextResponse.json({ 
            status: 'error', 
            message: 'Failed to initialize Anthropic client',
            error: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
        
      case 'oxylabs':
        // Test Oxylabs API credentials
        const oxylabsUsername = process.env.OXYLABS_USERNAME;
        const oxylabsPassword = process.env.OXYLABS_PASSWORD;
        
        if (!oxylabsUsername || !oxylabsPassword) {
          throw new Error('OXYLABS_USERNAME or OXYLABS_PASSWORD is not set');
        }
        
        return NextResponse.json({
          success: true,
          message: 'Oxylabs API credentials exist',
          credential_check: 'passed'
        });
        
      case 'session':
        // Test session handling
        try {
          const { getSession } = await import('@/app/lib/api/session');
          const session = await getSession();
          
          return NextResponse.json({ 
            status: 'success', 
            message: 'Session test',
            hasSession: !!session,
            userId: session?.user?.id || null
          });
        } catch (error) {
          return NextResponse.json({ 
            status: 'error', 
            message: 'Session test failed',
            error: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
        
      case 'database':
        // Test database connection
        try {
          const { getUserById } = await import('@/app/lib/db');
          await getUserById('00000000-0000-0000-0000-000000000000');
          
          return NextResponse.json({ 
            status: 'success', 
            message: 'Database connection test passed'
          });
        } catch (error) {
          return NextResponse.json({ 
            status: 'error', 
            message: 'Database connection test failed',
            error: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
        
      default:
        return NextResponse.json({ 
          status: 'error', 
          message: `Unknown test scenario: ${scenario}`
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Test API error:', error);
    
    return NextResponse.json({ 
      status: 'error', 
      message: 'Test failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 