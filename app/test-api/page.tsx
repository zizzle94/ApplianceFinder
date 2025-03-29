'use client';

import { useState } from 'react';
import { Button } from '../components/ui/button';

export default function TestAPI() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const testRealSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'refrigerator under $1000' })
      });
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const testFixedSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/search-fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'refrigerator under $1000' })
      });
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const testOxylabs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-oxylabs');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">API Test Page</h1>
      
      <div className="flex space-x-4 mb-8">
        <Button 
          onClick={testOxylabs} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Test Oxylabs Connection
        </Button>
        
        <Button 
          onClick={testRealSearch} 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          Test Real Search API
        </Button>
        
        <Button 
          onClick={testFixedSearch} 
          disabled={loading}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          Test Fixed Search API
        </Button>
      </div>
      
      {loading && <p className="text-gray-600">Loading...</p>}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {results && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Results:</h2>
          <pre className="bg-white p-4 rounded border overflow-auto max-h-[500px]">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 