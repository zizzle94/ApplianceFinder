'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { useAuth } from '../lib/auth/AuthContext';
import Link from 'next/link';

// Define types for appliance info
interface ApplianceInfoResult {
  modelNumber: string;
  specifications: Record<string, string>;
  imageUrl?: string;
  description?: string;
  manufacturer?: string;
  productUrl?: string;
  found: boolean;
}

interface HomeSpyProps {
  onApplianceAgeFound?: (data: any) => void;
}

interface ApplianceAgeResult {
  age: {
    years: number;
    months: number;
  };
  manufacturer: string;
  model: string;
  type: string;
  manufactureDate: string;
  estimatedLifespan: {
    years: number;
    months: number;
  };
  remainingLifespan: {
    years: number;
    months: number;
  };
}

export default function HomeSpyForm({ onApplianceAgeFound }: HomeSpyProps) {
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplianceAgeResult | null>(null);
  const [applianceInfo, setApplianceInfo] = useState<ApplianceInfoResult | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const { subscriptionTier } = useAuth();

  const checkApplianceAge = async () => {
    if (!modelNumber || !serialNumber) {
      setError('Model number and serial number are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/get-appliance-age', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelNumber, serialNumber }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to lookup appliance age');
      }
      
      const data = await response.json();
      setResult(data);
      
      if (onApplianceAgeFound) {
        onApplianceAgeFound(data);
      }
      
      // After getting appliance age, fetch appliance information
      fetchApplianceInfo(data.manufacturer, modelNumber);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchApplianceInfo = async (manufacturer: string, modelNum: string) => {
    try {
      setLoadingInfo(true);
      
      const response = await fetch('/api/get-appliance-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          modelNumber: modelNum,
          manufacturer 
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to fetch appliance info:', data.error);
        return;
      }
      
      const data = await response.json();
      setApplianceInfo(data);
    } catch (err) {
      console.error('Error fetching appliance info:', err);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    checkApplianceAge();
  };

  const resetForm = () => {
    setResult(null);
    setApplianceInfo(null);
    setModelNumber('');
    setSerialNumber('');
  };

  const hasMemberAccess = subscriptionTier === 'middle' || subscriptionTier === 'top';

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>HomeSpy.io Appliance Age Lookup</CardTitle>
          <CardDescription>
            Find the age of your appliance with its model and serial number
          </CardDescription>
        </CardHeader>
        
        {!hasMemberAccess ? (
          <CardContent>
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="mb-4">HomeSpy.io integration is available to Appliance Voyager and Appliance Pioneer members.</p>
              <Link href="/pricing">
                <Button>Upgrade to Access</Button>
              </Link>
            </div>
          </CardContent>
        ) : (
          <>
            <CardContent>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              {result ? (
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-md">
                    <h3 className="font-bold text-lg mb-2">
                      {result.manufacturer} {result.model}
                    </h3>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Type:</span> {result.type}
                    </p>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Age:</span> {result.age.years} years, {result.age.months} months
                    </p>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Manufacture Date:</span> {result.manufactureDate}
                    </p>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Estimated Lifespan:</span> {result.estimatedLifespan.years} years
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Remaining Lifespan:</span> {result.remainingLifespan.years} years, {result.remainingLifespan.months} months
                    </p>
                  </div>
                  
                  {loadingInfo ? (
                    <div className="bg-gray-50 p-4 rounded-md text-center">
                      <p className="text-gray-600">Searching for appliance specifications...</p>
                    </div>
                  ) : applianceInfo ? (
                    <div className="bg-blue-50 p-4 rounded-md">
                      <h3 className="font-bold text-lg mb-3">Appliance Specifications</h3>
                      
                      {applianceInfo.found ? (
                        <div className="space-y-4">
                          {applianceInfo.imageUrl && (
                            <div className="flex justify-center">
                              <img 
                                src={applianceInfo.imageUrl} 
                                alt={`${applianceInfo.manufacturer || result.manufacturer} ${applianceInfo.modelNumber}`}
                                className="max-h-64 object-contain rounded-md border border-gray-200" 
                              />
                            </div>
                          )}
                          
                          {applianceInfo.description && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Description</h4>
                              <p className="text-sm text-gray-700">{applianceInfo.description}</p>
                            </div>
                          )}
                          
                          {Object.keys(applianceInfo.specifications).length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Specifications</h4>
                              <div className="grid grid-cols-1 gap-1">
                                {Object.entries(applianceInfo.specifications).map(([key, value]) => (
                                  <div key={key} className="grid grid-cols-2 text-sm">
                                    <span className="font-medium text-gray-600">{key}:</span>
                                    <span className="text-gray-800">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {applianceInfo.productUrl && (
                            <div className="mt-3">
                              <a 
                                href={applianceInfo.productUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View Product Page →
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-700">Unable to find information for this model online.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="model-number" className="block text-sm font-medium mb-1">
                      Model Number
                    </label>
                    <Input
                      id="model-number"
                      placeholder="Enter model number (e.g., RF28R7351SG)"
                      value={modelNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModelNumber(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="serial-number" className="block text-sm font-medium mb-1">
                      Serial Number
                    </label>
                    <Input
                      id="serial-number"
                      placeholder="Enter serial number"
                      value={serialNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSerialNumber(e.target.value)}
                      required
                    />
                  </div>
                  
                  {subscriptionTier === 'middle' && (
                    <div className="text-xs text-gray-600 italic">
                      Note: Appliance Voyager plan includes 1 HomeSpy lookup per month
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Button 
                      type="submit"
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Checking...' : 'Check Appliance Age'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
            
            {result && (
              <CardFooter>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                >
                  Check Another Appliance
                </Button>
              </CardFooter>
            )}
          </>
        )}
      </Card>
    </div>
  );
} 