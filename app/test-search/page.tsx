'use client';

import { useState } from 'react';

export default function TestSearchPage() {
  const [query, setQuery] = useState('refrigerator');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseText, setResponseText] = useState('');

  // Function to test the regular search API
  const testRegularSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setResponseText('');
    
    try {
      // Make the API call directly
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      // Store the raw response text
      const text = await response.text();
      setResponseText(text);
      
      // Try to parse as JSON if possible
      try {
        const data = JSON.parse(text);
        if (response.ok) {
          setResult(data);
        } else {
          setError(data.error || `Error: ${response.status} ${response.statusText}`);
        }
      } catch (parseError) {
        setError(`Failed to parse response as JSON: ${text}`);
      }
    } catch (fetchError: unknown) {
      setError(`Fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to test the simplified search API
  const testSimplifiedSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setResponseText('');
    
    try {
      // Make the API call to the simplified endpoint
      const response = await fetch('/api/search-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      // Store the raw response text
      const text = await response.text();
      setResponseText(text);
      
      // Try to parse as JSON if possible
      try {
        const data = JSON.parse(text);
        if (response.ok) {
          setResult(data);
        } else {
          setError(data.error || `Error: ${response.status} ${response.statusText}`);
        }
      } catch (parseError) {
        setError(`Failed to parse response as JSON: ${text}`);
      }
    } catch (fetchError: unknown) {
      setError(`Fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Search API Test Page</h1>
      
      <div className="mb-4">
        <label className="block mb-2">
          Test Query:
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ml-2 border rounded p-2"
            placeholder="Enter a search query"
          />
        </label>
      </div>
      
      <div className="flex space-x-4 mb-6">
        <button
          onClick={testRegularSearch}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {isLoading ? 'Testing...' : 'Test Regular Search API'}
        </button>
        
        <button
          onClick={testSimplifiedSearch}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          {isLoading ? 'Testing...' : 'Test Simplified Search API'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error:</h2>
          <pre className="whitespace-pre-wrap text-red-700">{error}</pre>
        </div>
      )}
      
      {responseText && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Raw Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[200px] text-sm">
            {responseText}
          </pre>
        </div>
      )}
      
      {result && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Parsed Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 