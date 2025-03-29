'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '../components/ui/button';

// Client component that uses useSearchParams
function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setStatus('error');
        return;
      }
      
      try {
        // For a complete implementation, you would verify the session with Stripe
        // For now, we'll just assume it's valid
        setStatus('success');
      } catch (error) {
        console.error('Error verifying session:', error);
        setStatus('error');
      }
    };
    
    verifySession();
  }, [sessionId]);
  
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block mb-4"></div>
        <h1 className="text-2xl font-bold mb-4">Processing your subscription...</h1>
        <p className="text-gray-600">Please wait while we process your payment.</p>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-red-100 text-red-600 p-4 rounded-lg inline-block mb-4">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-6">We couldn't process your subscription. Please try again or contact support.</p>
        <Button onClick={() => window.location.href = '/pricing'}>
          Back to Pricing
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <div className="bg-green-100 text-green-600 p-4 rounded-lg inline-block mb-4">
        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-4">Subscription Successful!</h1>
      <p className="text-gray-600 mb-6">Thank you for subscribing to Appliance Finder. You now have access to more searches and features.</p>
      <Button onClick={() => window.location.href = '/'}>
        Start Searching
      </Button>
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block mb-4"></div>
      <h1 className="text-2xl font-bold mb-4">Loading...</h1>
    </div>
  );
}

// Main page component with Suspense
export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
} 