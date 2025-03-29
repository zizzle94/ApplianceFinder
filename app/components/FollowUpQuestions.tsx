'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../lib/auth/AuthContext';
import Link from 'next/link';

interface FollowUpQuestionsProps {
  queryId: string;
  originalQuery: string;
  applianceDetails: any;
}

export default function FollowUpQuestions({ queryId, originalQuery, applianceDetails }: FollowUpQuestionsProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);
  const { subscriptionTier } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queryId,
          originalQuery,
          applianceDetails,
          followUpQuestion: question,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process follow-up question');
      }
      
      const data = await response.json();
      setResponse(data.claudeResponse);
      setQuestion('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionTier !== 'top') {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ask Follow-up Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 bg-gray-50 rounded-md">
            <p className="mb-4">Follow-up questions are available to Appliance Pioneer members only.</p>
            <Link href="/pricing">
              <Button>Upgrade to Access</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Ask Follow-up Questions</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {response && (
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <h3 className="font-bold text-lg mb-2">Response:</h3>
            <div className="text-gray-700 whitespace-pre-wrap">
              {typeof response === 'object' 
                ? JSON.stringify(response, null, 2) 
                : response}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="follow-up-question" className="block text-sm font-medium mb-1">
              Your Follow-up Question
            </label>
            <Input
              id="follow-up-question"
              placeholder="Ask anything about this appliance..."
              value={question}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Submit Question'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 