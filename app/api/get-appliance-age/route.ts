import { NextRequest, NextResponse } from 'next/server';
import { recordHomeSpyLookup, hasReachedHomeSpyLimit } from '../../lib/api/homespy-db';
import { getSession } from '../../lib/api/session';
import { homeSpyClient } from '../../lib/api/homespy';

// POST handler for appliance age lookup
export async function POST(request: NextRequest) {
  try {
    // Get the user ID from the session
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Check if the user has reached their HomeSpy lookup limit
    const hasReachedLimit = await hasReachedHomeSpyLimit(userId);
    
    if (hasReachedLimit) {
      return NextResponse.json(
        { error: 'You have reached your HomeSpy lookup limit' }, 
        { status: 403 }
      );
    }
    
    // Extract the model and serial number from the request body
    const { modelNumber, serialNumber } = await request.json();
    
    // Validate the required fields
    if (!modelNumber || !serialNumber) {
      return NextResponse.json(
        { error: 'Model number and serial number are required' }, 
        { status: 400 }
      );
    }
    
    // Call the HomeSpy API using our client
    const response = await homeSpyClient.getApplianceAge(modelNumber, serialNumber);
    
    // Record the lookup in the database
    await recordHomeSpyLookup(userId, modelNumber, serialNumber, response);
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in appliance age lookup:', error);
    
    return NextResponse.json(
      { error: error.message || 'An error occurred during the lookup' }, 
      { status: 500 }
    );
  }
} 