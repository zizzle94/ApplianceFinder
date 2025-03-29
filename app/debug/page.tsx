'use client';

import { useState, useEffect } from 'react';

// Explicitly set dynamic rendering to fix serialization issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function DebugPage() {
  const [statusData, setStatusData] = useState<any>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  
  const [testScenario, setTestScenario] = useState('success');
  const [testData, setTestData] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  
  const [queryInput, setQueryInput] = useState('');
  const [searchData, setSearchData] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Function to check API status
  const checkStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) {
        throw new Error(`Status API returned ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setStatusData(data);
    } catch (error) {
      console.error('Error checking status:', error);
      setStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setStatusLoading(false);
    }
  };
  
  // Function to run test scenario
  const runTest = async () => {
    setTestLoading(true);
    setTestError(null);
    try {
      const res = await fetch(`/api/test?scenario=${testScenario}`);
      if (!res.ok) {
        throw new Error(`Test API returned ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setTestData(data);
    } catch (error) {
      console.error('Error running test:', error);
      setTestError(error instanceof Error ? error.message : String(error));
    } finally {
      setTestLoading(false);
    }
  };
  
  // Function to test search API
  const testSearchAPI = async () => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryInput }),
      });
      
      // Get response text first to ensure we can see error messages
      const responseText = await res.text();
      
      if (!res.ok) {
        throw new Error(`Search API returned ${res.status}: ${responseText}`);
      }
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText);
        setSearchData(data);
      } catch (error) {
        throw new Error(`Failed to parse response as JSON: ${responseText}`);
      }
    } catch (error) {
      console.error('Error testing search API:', error);
      setSearchError(error instanceof Error ? error.message : String(error));
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">API Debug Page</h1>
      
      {/* Status API Section */}
      <div className="mb-10 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">API Status Check</h2>
        <button 
          onClick={checkStatus}
          disabled={statusLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {statusLoading ? 'Loading...' : 'Check API Status'}
        </button>
        
        {statusError && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            <p className="font-semibold">Error:</p>
            <p>{statusError}</p>
          </div>
        )}
        
        {statusData && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Status Results:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(statusData, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Test API Section */}
      <div className="mb-10 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">API Test Scenarios</h2>
        <div className="mb-4">
          <label className="block mb-2">Test Scenario:</label>
          <select 
            value={testScenario}
            onChange={(e) => setTestScenario(e.target.value)}
            className="border rounded p-2 w-full"
          >
            <option value="success">Basic Success</option>
            <option value="error">Simulated Error</option>
            <option value="anthropic">Anthropic API Test</option>
            <option value="oxylabs">Oxylabs API Test</option>
            <option value="session">Session Test</option>
            <option value="database">Database Test</option>
          </select>
        </div>
        
        <button 
          onClick={runTest}
          disabled={testLoading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          {testLoading ? 'Running Test...' : 'Run Test'}
        </button>
        
        {testError && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            <p className="font-semibold">Error:</p>
            <p>{testError}</p>
          </div>
        )}
        
        {testData && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Search API Test Section */}
      <div className="mb-10 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Test Search API</h2>
        <div className="mb-4">
          <label className="block mb-2">Query:</label>
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Enter a query like: I need a refrigerator under $1000"
            className="border rounded p-2 w-full"
          />
        </div>
        
        <button 
          onClick={testSearchAPI}
          disabled={searchLoading || !queryInput}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          {searchLoading ? 'Searching...' : 'Test Search API'}
        </button>
        
        {searchError && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            <p className="font-semibold">Error:</p>
            <p>{searchError}</p>
          </div>
        )}
        
        {searchData && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Search Results:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(searchData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 