'use client';

import React, { useState, useEffect } from 'react';

interface ModelMetrics {
  leakagePredictionAUC: number;
  revenuePredictionR2: number;
  anomalyDetectionRate: number;
  lastModelUpdate: string;
  featureImportance: Array<{ feature: string; importance: number }>;
  modelStatus: 'training' | 'ready' | 'error';
  trainingProgress?: number;
}

export default function MLAnalyticsPage() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching ML metrics
    setTimeout(() => {
      setMetrics({
        leakagePredictionAUC: 0.87,
        revenuePredictionR2: 0.78,
        anomalyDetectionRate: 0.92,
        lastModelUpdate: new Date().toISOString(),
        featureImportance: [
          { feature: "Historical Leakage Rate", importance: 0.32 },
          { feature: "Network Density", importance: 0.28 },
          { feature: "Referral Velocity", importance: 0.18 },
          { feature: "Geographic Distance", importance: 0.12 },
          { feature: "Specialty Risk", importance: 0.10 }
        ],
        modelStatus: 'ready',
        trainingProgress: 100
      });
      setLoading(false);
    }, 1000);
  }, []);

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading ML Analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No ML metrics available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            ML Analytics Dashboard
          </h1>
          <p className="text-gray-300">
            Model performance, feature importance, and training status
          </p>
        </div>

        {/* Model Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Leakage Prediction AUC</p>
                <p className="text-3xl font-bold text-blue-400">
                  {formatPercentage(metrics.leakagePredictionAUC)}
                </p>
                <p className="text-xs text-gray-400">Area Under Curve</p>
              </div>
              <div className="p-2 bg-blue-900 rounded-lg">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Revenue Prediction R²</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatPercentage(metrics.revenuePredictionR2)}
                </p>
                <p className="text-xs text-gray-400">Coefficient of Determination</p>
              </div>
              <div className="p-2 bg-green-900 rounded-lg">
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Anomaly Detection Rate</p>
                <p className="text-3xl font-bold text-purple-400">
                  {formatPercentage(metrics.anomalyDetectionRate)}
                </p>
                <p className="text-xs text-gray-400">Detection Accuracy</p>
              </div>
              <div className="p-2 bg-purple-900 rounded-lg">
                <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Model Status */}
        <div className="bg-gray-800 rounded-lg shadow mb-8 border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Model Status</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  metrics.modelStatus === 'ready' ? 'bg-green-500' :
                  metrics.modelStatus === 'training' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <div>
                  <p className="font-medium text-white">Model Status: {metrics.modelStatus.toUpperCase()}</p>
                  <p className="text-sm text-gray-400">
                    Last updated: {new Date(metrics.lastModelUpdate).toLocaleString()}
                  </p>
                </div>
              </div>
              {metrics.modelStatus === 'training' && metrics.trainingProgress && (
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${metrics.trainingProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-300">{metrics.trainingProgress}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="bg-gray-800 rounded-lg shadow mb-8 border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Feature Importance</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {metrics.featureImportance.map((feature, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{index + 1}.</span>
                    <span className="text-sm text-gray-300">{feature.feature}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${feature.importance * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-white w-12 text-right">
                      {formatPercentage(feature.importance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Model Performance Metrics */}
        <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Model Performance Metrics</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">87.0%</div>
                <div className="text-gray-300 text-sm">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">84.0%</div>
                <div className="text-gray-300 text-sm">Precision</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">89.0%</div>
                <div className="text-gray-300 text-sm">Recall</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 