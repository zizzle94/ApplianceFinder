'use client';

import { useState } from 'react';

export default function TestFixedPage() {
  const [query, setQuery] = useState('refrigerator under $1000');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('/api/search-fixed');

  // Function to test the new fixed search API
  const testFixedSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setResponseText('');
    
    try {
      console.log(`Making request to ${apiEndpoint} with query: ${query}`);
      
      // Make the API call with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        setError('Request timed out after 30 seconds');
      } else {
        setError(`Fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Test Fixed Search API</h1>
      
      <div className="mb-4">
        <label className="block mb-2 font-semibold">API Endpoint:</label>
        <select 
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          className="border rounded p-2 w-full mb-4"
        >
          <option value="/api/search-fixed">Fixed Search API (/api/search-fixed)</option>
          <option value="/api/search">Original Search API (/api/search)</option>
          <option value="/api/search-simple">Simple Search API (/api/search-simple)</option>
        </select>
        
        <label className="block mb-2 font-semibold">Search Query:</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="E.g. refrigerator under $1000"
          className="border rounded p-2 w-full"
        />
      </div>
      
      <button 
        onClick={testFixedSearch}
        disabled={isLoading || !query.trim()}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isLoading ? 'Searching...' : 'Test Search API'}
      </button>
      
      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-semibold mb-2">Error:</h2>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      {result && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Response:</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
      
      {responseText && !result && !error && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Raw Response:</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            <pre>{responseText}</pre>
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Environment Status Check:</h2>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/api/status');
              const data = await response.json();
              setResult(data);
            } catch (err) {
              setError(`Error checking status: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Check API Status
        </button>
        
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/api/debug-env');
              const data = await response.json();
              setResult(data);
            } catch (err) {
              setError(`Error checking env: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Check Environment
        </button>
      </div>
    </div>
  );
} 