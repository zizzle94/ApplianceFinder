import React, { useState } from 'react';
import { Button } from './ui/button';
import { useAppStore } from '../lib/store';

export function SearchBar() {
  const { 
    userQuery, 
    setUserQuery, 
    isLoading, 
    remainingQueries
  } = useAppStore();
  
  // Use the main API endpoint to access real data
  const API_ENDPOINT = '/api/search';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userQuery.trim()) return;
    
    // Store for loading indicator in parent component
    useAppStore.getState().setIsLoading(true);
    useAppStore.getState().setError(null);
    
    try {
      console.log(`Making search request to ${API_ENDPOINT} with query: "${userQuery}"`);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userQuery }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Get response text first to ensure we can see error messages even if JSON parsing fails
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to search for appliances';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
          
          // If we have detailed error diagnostics, log them for debugging
          if (errorData.diagnostics) {
            console.error('Search API error diagnostics:', errorData.diagnostics);
          }
        } catch (parseError) {
          // If we can't parse the error response as JSON, use the raw text
          errorMessage = responseText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        
        // Update the store with the results
        useAppStore.getState().setClaudeResponse(data.claudeResponse);
        useAppStore.getState().setProducts(data.products);
        useAppStore.getState().setCurrentQueryId(data.queryId);
        useAppStore.getState().setRemainingQueries(data.remainingQueries);
        
        // Log if using mock data for transparency
        if (data.envStatus?.usingMockData) {
          console.log('Using mock data for search results');
        }
      } catch (parseError) {
        console.error('Error parsing search response:', parseError);
        throw new Error('Failed to parse search results. Please try again later.');
      }
    } catch (error) {
      console.error('Search error:', error);
      
      // Handle timeout errors specifically
      if (error instanceof DOMException && error.name === 'AbortError') {
        useAppStore.getState().setError('Search request timed out. Please try again.');
      } else {
        useAppStore.getState().setError((error as Error).message);
      }
    } finally {
      useAppStore.getState().setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto mb-6 flex items-center">
      <form onSubmit={handleSubmit} className="w-full relative">
        <input
          className="w-full p-4 pr-24 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
          type="text"
          placeholder="I need a refrigerator under $1000 that fits in a small kitchen..."
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          disabled={isLoading}
        />
        <Button 
          type="submit"
          className="absolute right-2 top-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          disabled={isLoading || !userQuery.trim()}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>
      {remainingQueries !== undefined && remainingQueries !== Infinity && (
        <div className="ml-4 text-sm text-gray-500">
          {remainingQueries} searches left
        </div>
      )}
    </div>
  );
} 