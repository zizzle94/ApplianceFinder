import { NextRequest, NextResponse } from 'next/server';
import { processApplianceQuery } from '../../lib/api/claude';
import { getUserById, saveQuery } from '../../lib/db';
import { getSession } from '../../lib/auth';

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
    
    // Get the user's subscription tier
    let subscriptionTier = 'free';
    try {
      const user = await getUserById(userId);
      if (user) {
        subscriptionTier = user.subscription_tier || 'free';
      }
    } catch (error) {
      console.error('Error getting user:', error);
      // Continue with free tier if there's an error
    }
    
    // Check if the user has access to follow-up questions
    if (subscriptionTier !== 'top') {
      return NextResponse.json(
        { error: 'Follow-up questions are only available to premium subscribers' }, 
        { status: 403 }
      );
    }
    
    // Extract the follow-up question details from the request body
    const { 
      queryId, 
      originalQuery,
      applianceDetails, 
      followUpQuestion 
    } = await request.json();
    
    // Validate required fields
    if (!followUpQuestion || (!applianceDetails && !originalQuery)) {
      return NextResponse.json(
        { error: 'Follow-up question and appliance details are required' }, 
        { status: 400 }
      );
    }
    
    // Create a prompt that includes the original context
    const followUpPrompt = `
Based on this appliance: ${JSON.stringify(applianceDetails)}, 
Original query: ${originalQuery},
Answer this follow-up question: ${followUpQuestion}

Be detailed, helpful, and provide specific information related to the appliance.
`;
    
    // Process the follow-up question with Claude
    const claudeResponse = await processApplianceQuery({ 
      userQuery: followUpPrompt,
      userId,
      subscriptionTier: 'top' // Always use top tier features for follow-up questions
    });
    
    // Save the follow-up query
    await saveQuery(userId, followUpQuestion, {
      ...claudeResponse,
      isFollowUp: true,
      originalQueryId: queryId
    });
    
    return NextResponse.json({
      claudeResponse,
      success: true
    });
    
  } catch (error) {
    console.error('Error processing follow-up question:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while processing your follow-up question' }, 
      { status: 500 }
    );
  }
} 