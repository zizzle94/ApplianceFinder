'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';

interface SavedAppliance {
  id: string;
  product_name: string;
  product_url: string;
  product_image_url: string;
  product_price: string;
  appliance_type: string;
  description: string;
  created_at: string;
}

export default function SavedAppliancesPage() {
  const [appliances, setAppliances] = useState<SavedAppliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, subscriptionTier } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in
    if (!user && !loading) {
      router.push('/auth/login');
      return;
    }

    // Fetch saved appliances
    const fetchAppliances = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/saved-appliances');
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch saved appliances');
        }
        
        const data = await response.json();
        setAppliances(data.appliances || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAppliances();
    }
  }, [user, router]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/saved-appliances/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete appliance');
      }
      
      // Remove the deleted appliance from state
      setAppliances(appliances.filter(appliance => appliance.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const getApplianceLimit = () => {
    if (subscriptionTier === 'top') return 'unlimited';
    if (subscriptionTier === 'middle') return '3';
    return '0';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Saved Appliances</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden h-80">
              <Skeleton className="h-40 w-full" />
              <CardHeader>
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Saved Appliances</h1>
      <p className="text-gray-600 mb-8">
        You can save up to {getApplianceLimit()} appliances with your current subscription.
        {subscriptionTier === 'free' && (
          <span className="block mt-2">
            <Link href="/pricing" className="text-blue-600 hover:underline">
              Upgrade your subscription
            </Link>{' '}
            to save appliances.
          </span>
        )}
      </p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {appliances.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No appliances saved yet</h2>
          <p className="text-gray-600 mb-4">
            Start searching for appliances and save your favorites.
          </p>
          <Button onClick={() => router.push('/')}>Search Appliances</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appliances.map((appliance) => (
            <Card key={appliance.id} className="overflow-hidden h-full flex flex-col">
              {appliance.product_image_url ? (
                <div className="h-48 overflow-hidden bg-gray-100">
                  <img
                    src={appliance.product_image_url}
                    alt={appliance.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="line-clamp-2">{appliance.product_name}</CardTitle>
                <CardDescription>
                  {appliance.appliance_type}
                  {appliance.product_price && ` • ${appliance.product_price}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-gray-600 line-clamp-3">{appliance.description || 'No description available'}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                {appliance.product_url ? (
                  <Button variant="outline" asChild>
                    <a href={appliance.product_url} target="_blank" rel="noopener noreferrer">
                      View Details
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    No Link Available
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(appliance.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 