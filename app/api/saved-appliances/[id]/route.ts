import { NextRequest, NextResponse } from 'next/server';
import { deleteSavedAppliance } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

// DELETE handler to remove a saved appliance
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Get the user ID from the session
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Delete the appliance
    await deleteSavedAppliance(id, userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved appliance:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while deleting the appliance' }, 
      { status: 500 }
    );
  }
} 