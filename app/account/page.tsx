'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthContext';
import { Button } from '../components/ui/button';
import { SUBSCRIPTION_TIERS } from '../lib/api/stripe';
import Link from 'next/link';

export default function AccountPage() {
  const { user, session, subscriptionTier, signOut } = useAuth();
  const [queriesCount, setQueriesCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // Wait a moment for auth to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!session) {
        router.push('/auth/login');
      } else {
        setIsLoading(false);
        fetchQueriesCount();
      }
    };

    const fetchQueriesCount = async () => {
      try {
        const response = await fetch('/api/user/query-count');
        const data = await response.json();
        
        if (data.count !== undefined) {
          setQueriesCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching queries count:', error);
      }
    };

    checkAuth();
  }, [session, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getSubscriptionDetails = () => {
    switch (subscriptionTier) {
      case 'free':
        return {
          name: SUBSCRIPTION_TIERS.FREE.name,
          price: SUBSCRIPTION_TIERS.FREE.price,
          limit: SUBSCRIPTION_TIERS.FREE.queryLimit,
        };
      case 'middle':
        return {
          name: SUBSCRIPTION_TIERS.MIDDLE.name,
          price: SUBSCRIPTION_TIERS.MIDDLE.price,
          limit: SUBSCRIPTION_TIERS.MIDDLE.queryLimit,
        };
      case 'top':
        return {
          name: SUBSCRIPTION_TIERS.TOP.name,
          price: SUBSCRIPTION_TIERS.TOP.price,
          limit: SUBSCRIPTION_TIERS.TOP.queryLimit,
        };
      default:
        return {
          name: 'Unknown',
          price: 0,
          limit: 0,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const subscription = getSubscriptionDetails();
  const limitDisplay = subscription.limit === Infinity ? 'Unlimited' : subscription.limit;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Account</h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Email:</span> {user?.email}
            </div>
            <div>
              <span className="font-medium">Account ID:</span> {user?.id.substring(0, 8)}...
            </div>
            <div>
              <span className="font-medium">Member since:</span> {new Date(user?.created_at || '').toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Current Plan:</span> {subscription.name}
            </div>
            <div>
              <span className="font-medium">Monthly Price:</span> ${subscription.price.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Query Limit:</span> {limitDisplay} per month
            </div>
            {queriesCount !== null && (
              <div>
                <span className="font-medium">Queries Used This Month:</span> {queriesCount} / {limitDisplay}
              </div>
            )}
          </div>
          
          {subscriptionTier === 'free' && (
            <div className="mt-6">
              <Link href="/pricing">
                <Button>Upgrade Subscription</Button>
              </Link>
            </div>
          )}
        </div>
        
        <div className="text-center mt-8">
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
} 