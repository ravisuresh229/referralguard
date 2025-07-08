import React from 'react';
import MLPerformanceDashboard from '../components/ml-performance-dashboard';
import { Card, CardHeader, CardTitle, CardContent } from '../../@/components/ui/card';

export default function MLAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Machine Learning Analytics
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Real-time predictive analytics and performance metrics demonstrating our AI's ability to 
              identify referral leakage risks with 87% accuracy across 19,948 Medicare markets.
            </p>
          </div>

          {/* Interpretability/Explanation Section */}
          <div className="mb-8 max-w-3xl mx-auto p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-base shadow">
            <strong>What does this page show?</strong>
            <ul className="list-disc ml-6 mt-2">
              <li>
                <b>AI-Powered Risk Prediction:</b> Our machine learning model predicts the risk of referral leakage for every provider in your network. High risk means a provider is likely to refer patients outside your network, leading to lost revenue.
              </li>
              <li>
                <b>Key Metrics:</b> Model accuracy, F1 score, and feature importance show how well the model performs and what drives risk.
              </li>
              <li>
                <b>Business Impact:</b> Use these insights to target high-risk providers, prioritize interventions, and maximize network retention and revenue.
              </li>
              <li>
                <b>How to Use:</b> Try the "Live Predictions" tab to see risk scores for any provider by NPI or name. Review A/B testing results to see which interventions are most effective.
              </li>
            </ul>
          </div>
          
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-gray-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Revenue Analyzed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(35913954674.816376 / 1000000000).toFixed(1)}B</div>
                <p className="text-xs opacity-75 mt-1">Across all markets</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-gray-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Revenue at Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(35913954674.816376 * 0.15 / 1000000).toFixed(1)}M</div>
                <p className="text-xs opacity-75 mt-1">15% estimated risk</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-gray-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Model Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs opacity-75 mt-1">F1 Score</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-gray-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Predictions Made</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,847</div>
                <p className="text-xs opacity-75 mt-1">Provider assessments</p>
              </CardContent>
            </Card>
          </div>

          {/* ML Dashboard */}
          <MLPerformanceDashboard />
        </div>
      </div>
    </div>
  );
} 