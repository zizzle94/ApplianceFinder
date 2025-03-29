'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface QueryHistory {
  id: string;
  input_text: string;
  created_at: string;
  claude_response?: any;
  selected_product?: string;
}

export default function QueryHistoryPage() {
  const [queries, setQueries] = useState<QueryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const { user, subscriptionTier } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in
    if (!user && !loading) {
      router.push('/auth/login');
      return;
    }

    // Fetch query history
    const fetchQueries = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/query-history');
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch query history');
        }
        
        const data = await response.json();
        setQueries(data.queries || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchQueries();
    }
  }, [user, router]);

  const toggleExpand = (id: string) => {
    if (expandedQuery === id) {
      setExpandedQuery(null);
    } else {
      setExpandedQuery(id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Query History</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-3 w-1/4" />
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Query History</h1>
        <Button onClick={() => router.refresh()} size="sm" variant="ghost">
          <RefreshCw size={16} className="mr-2" /> Refresh
        </Button>
      </div>
      
      {subscriptionTier === 'middle' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <p className="text-blue-800">
            You're viewing the basic query history available on the Appliance Voyager plan. 
            <Link href="/pricing" className="text-blue-600 font-medium ml-1 hover:underline">
              Upgrade to Appliance Pioneer
            </Link> to see full query details including Claude's responses.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {queries.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No search history yet</h2>
          <p className="text-gray-600 mb-4">
            Start searching for appliances to build your history.
          </p>
          <Button onClick={() => router.push('/')}>Search Appliances</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {queries.map((query) => (
            <Card key={query.id} className="overflow-hidden">
              <CardHeader className="cursor-pointer" onClick={() => toggleExpand(query.id)}>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{query.input_text}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Clock size={14} className="mr-1" />
                      {formatDate(query.created_at)}
                    </CardDescription>
                  </div>
                  {expandedQuery === query.id ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </CardHeader>
              
              {expandedQuery === query.id && subscriptionTier === 'top' && query.claude_response && (
                <CardContent>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Results</h3>
                    <div className="bg-gray-50 p-4 rounded-md text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(query.claude_response, null, 2)}
                      </pre>
                    </div>
                    
                    {query.selected_product && (
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Selected Product</h3>
                        <a 
                          href={query.selected_product} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {query.selected_product}
                        </a>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <Button 
                        onClick={() => router.push(`/?rerun=${encodeURIComponent(query.input_text)}`)}
                        variant="outline"
                        size="sm"
                      >
                        Search Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 