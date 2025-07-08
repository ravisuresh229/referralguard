"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface ProviderSummaryModalProps {
  provider: any;
  isOpen: boolean;
  onClose: () => void;
  mlPredictions?: any[];
}

const ProviderSummaryModal: React.FC<ProviderSummaryModalProps> = ({
  provider,
  isOpen,
  onClose,
  mlPredictions
}) => {
  if (!isOpen || !provider) return null;

  const mlPrediction = mlPredictions?.find(p => p.providerNPI === provider.providerNPI);

  // Format currency
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '$0';
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${Number(amount).toLocaleString()}`;
  };

  // Use dynamic fields from provider object
  const aiRecommendations = provider.aiRecommendations || [];
  const peerBenchmarks = provider.peerBenchmarks || {};
  const riskFactors = provider.riskFactors || [];
  const interventionHistory = provider.interventionHistory || [];

  // Use dynamic trend arrays from provider object if available
  const revenueTrend = provider.revenueTrend || [1200000, 1150000, 1100000, 1050000, provider.revenueAtRisk || 1000000];
  const marketShareTrend = provider.marketShareTrend || [45, 42, 40, 38, provider.marketShare || 35];
  const riskScoreTrend = provider.riskScoreTrend || [65, 68, 72, 75, mlPrediction?.riskScore || provider.riskScore || 78];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`fixed inset-4 bg-white rounded-lg shadow-2xl z-50 overflow-hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Provider Analysis</h2>
                <div className="mt-2">
                  <h3 className="text-xl font-semibold text-gray-800">{provider.name || 'Unknown Provider'}</h3>
                  <p className="text-gray-600">NPI: {provider.providerNPI} • {provider.specialty || 'Unknown Specialty'}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Key Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-2xl font-bold text-red-600">{mlPrediction?.riskScore ?? provider.riskScore ?? 'N/A'}%</div>
                        <div className="text-sm text-gray-600">Risk Score</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(provider.revenueAtRisk)}</div>
                        <div className="text-sm text-gray-600">Revenue at Risk</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{provider.marketShare?.toFixed(1) ?? 'N/A'}%</div>
                        <div className="text-sm text-gray-600">Market Share</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">#{provider.marketPosition ?? 'N/A'}</div>
                        <div className="text-sm text-gray-600">Market Position</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Trend Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">Trend Analysis (Last 5 Quarters)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Revenue Trend */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Revenue at Risk</span>
                          <span className="text-xs text-gray-500">↗ +15% vs Q1</span>
                        </div>
                        <div className="flex items-end gap-1 h-16">
                          {revenueTrend.map((value: number, index: number) => (
                            <div
                              key={index}
                              className="flex-1 bg-blue-200 rounded-t"
                              style={{ height: `${(value / Math.max(...revenueTrend)) * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Market Share Trend */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Market Share</span>
                          <span className="text-xs text-gray-500">↘ -22% vs Q1</span>
                        </div>
                        <div className="flex items-end gap-1 h-16">
                          {marketShareTrend.map((value: number, index: number) => (
                            <div
                              key={index}
                              className="flex-1 bg-green-200 rounded-t"
                              style={{ height: `${(value / Math.max(...marketShareTrend)) * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Risk Score Trend */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Risk Score</span>
                          <span className="text-xs text-gray-500">↗ +20% vs Q1</span>
                        </div>
                        <div className="flex items-end gap-1 h-16">
                          {riskScoreTrend.map((value: number, index: number) => (
                            <div
                              key={index}
                              className="flex-1 bg-red-200 rounded-t"
                              style={{ height: `${(value / Math.max(...riskScoreTrend)) * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* AI Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {aiRecommendations.map((rec, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                            <Badge variant={
                              rec.impact === 'High' ? 'destructive' : 
                              rec.impact === 'Medium' ? 'secondary' : 'default'
                            }>
                              {rec.impact} Impact
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Timeline: {rec.timeline}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">High Market Concentration</span>
                        <Badge variant="destructive">Critical</Badge>
                      </div>
                      <Progress value={85} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Above Market Rates</span>
                        <Badge variant="secondary">High</Badge>
                      </div>
                      <Progress value={72} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Declining Market Share</span>
                        <Badge variant="secondary">Medium</Badge>
                      </div>
                      <Progress value={58} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Limited Contract Terms</span>
                        <Badge variant="default">Low</Badge>
                      </div>
                      <Progress value={35} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Intervention History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">Intervention History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Contract Renewal</div>
                          <div className="text-xs text-gray-600">Completed 2 months ago</div>
                        </div>
                        <Badge variant="default">Success</Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Rate Negotiation</div>
                          <div className="text-xs text-gray-600">In progress - 30 days</div>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Relationship Meeting</div>
                          <div className="text-xs text-gray-600">Scheduled for next week</div>
                        </div>
                        <Badge variant="default">Planned</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleString()}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProviderSummaryModal; 