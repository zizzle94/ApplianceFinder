import { NextRequest, NextResponse } from 'next/server';
import { getSavedAppliances, saveAppliance, hasReachedSavedAppliancesLimit } from '../../lib/db';
import { getSession } from '../../lib/auth';

// GET handler to fetch saved appliances
export async function GET(request: NextRequest) {
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
    
    // Get the user's saved appliances
    const appliances = await getSavedAppliances(userId);
    
    return NextResponse.json({ appliances });
  } catch (error) {
    console.error('Error getting saved appliances:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while getting saved appliances' }, 
      { status: 500 }
    );
  }
}

// POST handler to save an appliance
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
    
    // Check if the user has reached their saved appliances limit
    const hasReachedLimit = await hasReachedSavedAppliancesLimit(userId);
    
    if (hasReachedLimit) {
      return NextResponse.json(
        { error: 'You have reached your saved appliances limit' }, 
        { status: 403 }
      );
    }
    
    // Extract the appliance details from the request body
    const { 
      productName, 
      productUrl, 
      productImageUrl, 
      productPrice,
      applianceType,
      description
    } = await request.json();
    
    // Validate the required fields
    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' }, 
        { status: 400 }
      );
    }
    
    // Save the appliance
    const applianceId = await saveAppliance(
      userId, 
      productName, 
      productUrl || '', 
      productImageUrl || '', 
      productPrice || '',
      applianceType || '',
      description || ''
    );
    
    return NextResponse.json({ id: applianceId, success: true });
  } catch (error) {
    console.error('Error saving appliance:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while saving the appliance' }, 
      { status: 500 }
    );
  }
} 