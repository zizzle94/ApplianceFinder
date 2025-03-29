'use client';

import React from 'react';
import { Button } from '../components/ui/button';
import { useAppStore } from '../lib/store';
import { SUBSCRIPTION_TIERS } from '../lib/api/stripe';
import { Check, X } from 'lucide-react';

export default function PricingPage() {
  const { remainingQueries } = useAppStore();
  
  const handleSubscribe = async (tier: 'middle' | 'top') => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('An error occurred while creating the checkout session. Please try again later.');
    }
  };

  // Helper function to render a feature check or X based on availability
  const FeatureAvailability = ({ available }: { available: boolean }) => {
    return available ? (
      <Check className="w-5 h-5 mr-2 text-green-500" />
    ) : (
      <X className="w-5 h-5 mr-2 text-red-500" />
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select the plan that best fits your needs and start finding the perfect appliances.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Free Tier */}
        <div className="border rounded-lg overflow-hidden shadow-md bg-white">
          <div className="p-6 bg-gray-50 border-b">
            <h2 className="text-2xl font-bold">{SUBSCRIPTION_TIERS.FREE.name}</h2>
            <p className="text-3xl font-bold mt-2">Free</p>
          </div>
          <div className="p-6">
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>{SUBSCRIPTION_TIERS.FREE.queryLimit} searches per month</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Basic appliance search</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Up to {SUBSCRIPTION_TIERS.FREE.maxRecommendations} recommendations</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.comparisonFeature} />
                <span>Comparison feature</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.personalizedRecommendations} />
                <span>Personalized recommendations</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.followUpQuestions} />
                <span>Ask follow-up questions</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.homeSpyIntegration} />
                <span>HomeSpy.io integration</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.specificationsSheet} />
                <span>Specifications sheets</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.userManual} />
                <span>User manuals</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.installationInstructions} />
                <span>Installation instructions</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.queryHistory} />
                <span>Query history</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.FREE.prioritySupport} />
                <span>Priority support</span>
              </li>
            </ul>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => window.location.href = '/'}
            >
              Get Started
            </Button>
          </div>
        </div>
        
        {/* Middle Tier */}
        <div className="border rounded-lg overflow-hidden shadow-lg bg-white relative transform scale-105">
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl">
            POPULAR
          </div>
          <div className="p-6 bg-blue-50 border-b">
            <h2 className="text-2xl font-bold">{SUBSCRIPTION_TIERS.MIDDLE.name}</h2>
            <p className="text-3xl font-bold mt-2">${SUBSCRIPTION_TIERS.MIDDLE.price}<span className="text-lg font-normal">/month</span></p>
          </div>
          <div className="p-6">
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>{SUBSCRIPTION_TIERS.MIDDLE.queryLimit} searches per month</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Basic appliance search</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Up to {SUBSCRIPTION_TIERS.MIDDLE.maxRecommendations} recommendations</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.comparisonFeature} />
                <span>Comparison feature</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.personalizedRecommendations} />
                <span>Personalized recommendations</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.followUpQuestions} />
                <span>Ask follow-up questions</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.homeSpyIntegration} />
                <span>HomeSpy.io integration ({SUBSCRIPTION_TIERS.MIDDLE.homeSpyLimit} appliance)</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.specificationsSheet} />
                <span>Specifications sheets</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.userManual} />
                <span>User manuals</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.installationInstructions} />
                <span>Installation instructions</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.queryHistory} />
                <span>Query history (input only)</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Save up to {SUBSCRIPTION_TIERS.MIDDLE.savedAppliancesLimit} appliances</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.MIDDLE.prioritySupport} />
                <span>Priority support</span>
              </li>
            </ul>
            <Button 
              className="w-full" 
              onClick={() => handleSubscribe('middle')}
            >
              Subscribe Now
            </Button>
          </div>
        </div>
        
        {/* Top Tier */}
        <div className="border rounded-lg overflow-hidden shadow-md bg-white">
          <div className="p-6 bg-gray-50 border-b">
            <h2 className="text-2xl font-bold">{SUBSCRIPTION_TIERS.TOP.name}</h2>
            <p className="text-3xl font-bold mt-2">${SUBSCRIPTION_TIERS.TOP.price}<span className="text-lg font-normal">/month</span></p>
          </div>
          <div className="p-6">
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Unlimited searches</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Basic appliance search</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Up to {SUBSCRIPTION_TIERS.TOP.maxRecommendations}+ recommendations</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.comparisonFeature} />
                <span>Comparison feature</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.personalizedRecommendations} />
                <span>Personalized recommendations</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.followUpQuestions} />
                <span>Ask follow-up questions</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.homeSpyIntegration} />
                <span>HomeSpy.io integration (Unlimited)</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.specificationsSheet} />
                <span>Specifications sheets</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.userManual} />
                <span>User manuals</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.installationInstructions} />
                <span>Installation instructions</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.queryHistory} />
                <span>Full query history</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={true} />
                <span>Save unlimited appliances</span>
              </li>
              <li className="flex items-center">
                <FeatureAvailability available={SUBSCRIPTION_TIERS.TOP.prioritySupport} />
                <span>Priority support</span>
              </li>
            </ul>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleSubscribe('top')}
            >
              Subscribe Now
            </Button>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-12 text-gray-600">
        <p>
          You currently have {remainingQueries === Infinity ? 'unlimited' : remainingQueries} searches remaining.
          {remainingQueries === 0 && (
            <span className="block mt-2 text-red-600 font-semibold">
              You've reached your search limit. Please subscribe to continue searching.
            </span>
          )}
        </p>
      </div>
    </div>
  );
} 