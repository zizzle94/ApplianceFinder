import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../lib/api/session';
import { applianceInfoService } from '../../lib/api/appliance-info';

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
    
    // Extract the model number and optional manufacturer from the request body
    const { modelNumber, manufacturer } = await request.json();
    
    // Validate the required fields
    if (!modelNumber) {
      return NextResponse.json(
        { error: 'Model number is required' }, 
        { status: 400 }
      );
    }
    
    // Call the appliance info service to get detailed specifications
    const applianceInfo = await applianceInfoService.findApplianceInfo(modelNumber, manufacturer);
    
    return NextResponse.json(applianceInfo);
  } catch (error: any) {
    console.error('Error fetching appliance information:', error);
    
    return NextResponse.json(
      { error: error.message || 'An error occurred while fetching appliance information' }, 
      { status: 500 }
    );
  }
} 