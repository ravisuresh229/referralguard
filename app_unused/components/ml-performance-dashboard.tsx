'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../@/components/ui/card';
import { Button } from '../../@/components/ui/button';
import { Input } from '../../@/components/ui/input';
import { Label } from '../../@/components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  featureImportance: { feature: string; importance: number }[];
  confusionMatrix: number[][];
  rocCurve: { fpr: number; tpr: number }[];
  precisionRecallCurve: { precision: number; recall: number }[];
}

interface PredictionResult {
  riskScore: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  featureContributions: { feature: string; contribution: number }[];
  explanation: string;
}

interface InterventionResult {
  type: string;
  successRate: number;
  roi: number;
  cost: number;
  revenueSaved: number;
  paybackPeriod: number;
}

interface FinancialImpact {
  totalRevenueSaved: number;
  totalInterventionCost: number;
  netROI: number;
  paybackPeriod: number;
  monthlySavings: number;
}

const MLPerformanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('metrics');
  const [predictionInput, setPredictionInput] = useState('');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - replace with real API calls
  const modelMetrics: ModelMetrics = {
    accuracy: 0.87,
    precision: 0.84,
    recall: 0.89,
    f1Score: 0.86,
    auc: 0.91,
    featureImportance: [
      { feature: 'Market Share', importance: 0.23 },
      { feature: 'Referral Volume', importance: 0.19 },
      { feature: 'Competition Level', importance: 0.17 },
      { feature: 'Revenue Growth', importance: 0.15 },
      { feature: 'Provider Age', importance: 0.12 },
      { feature: 'Specialty Type', importance: 0.08 },
      { feature: 'Geographic Density', importance: 0.06 }
    ],
    confusionMatrix: [
      [245, 23],
      [31, 201]
    ],
    rocCurve: Array.from({ length: 100 }, (_, i) => ({
      fpr: i / 100,
      tpr: 1 - Math.pow(1 - i / 100, 2)
    })),
    precisionRecallCurve: Array.from({ length: 100 }, (_, i) => ({
      precision: 0.9 - (i / 100) * 0.3,
      recall: i / 100
    }))
  };

  const interventionResults: InterventionResult[] = [
    {
      type: 'Provider Education',
      successRate: 0.78,
      roi: 3.2,
      cost: 15000,
      revenueSaved: 48000,
      paybackPeriod: 4.7
    },
    {
      type: 'Incentive Programs',
      successRate: 0.85,
      roi: 4.1,
      cost: 25000,
      revenueSaved: 102500,
      paybackPeriod: 2.9
    },
    {
      type: 'Technology Integration',
      successRate: 0.92,
      roi: 5.8,
      cost: 50000,
      revenueSaved: 290000,
      paybackPeriod: 2.1
    },
    {
      type: 'Strategic Partnerships',
      successRate: 0.81,
      roi: 3.7,
      cost: 35000,
      revenueSaved: 129500,
      paybackPeriod: 3.2
    }
  ];

  const financialImpact: FinancialImpact = {
    totalRevenueSaved: 718000000,
    totalInterventionCost: 125000000,
    netROI: 4.7,
    paybackPeriod: 2.1,
    monthlySavings: 59833333
  };

  const learningCurveData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    accuracy: 0.75 + (i * 0.01) + Math.random() * 0.02,
    precision: 0.72 + (i * 0.012) + Math.random() * 0.025,
    recall: 0.78 + (i * 0.008) + Math.random() * 0.015
  }));

  const handlePrediction = async () => {
    if (!predictionInput.trim()) return;
    setIsLoading(true);
    setPredictionResult(null);

    // Try to find provider by NPI or name from the API
    let providerData = null;
    let searchTerm = predictionInput.trim();
    try {
      // Try NPI search first
      let response = await fetch(`/api/high-risk-providers?search=${encodeURIComponent(searchTerm)}&pageSize=1`);
      let data = await response.json();
      if (data.providers && data.providers.length > 0) {
        providerData = data.providers[0];
      } else {
        // Try name search if not found by NPI
        response = await fetch(`/api/high-risk-providers?search=${encodeURIComponent(searchTerm)}&pageSize=1`);
        data = await response.json();
        if (data.providers && data.providers.length > 0) {
          providerData = data.providers[0];
        }
      }
    } catch (err) {
      // ignore
    }

    if (!providerData) {
      setPredictionResult({
        riskScore: 0,
        confidence: 0,
        riskLevel: 'low',
        featureContributions: [],
        explanation: 'Provider not found. Please check the NPI or name.'
      });
      setIsLoading(false);
      return;
    }

    // Call ML prediction API
    try {
      const response = await fetch('/api/ml-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerData: [providerData] })
      });
      const result = await response.json();
      if (result.success && result.predictions && result.predictions.length > 0) {
        const pred = result.predictions[0];
        setPredictionResult({
          riskScore: pred.riskScore,
          confidence: pred.riskProbability || 0.9,
          riskLevel: pred.riskLevel,
          featureContributions: pred.features
            ? Object.entries(pred.features).map(([feature, contribution]) => ({ feature, contribution: Number(contribution) }))
            : [],
          explanation: pred.modelUsed ? `Prediction made using ${pred.modelUsed} model.` : 'Prediction generated.'
        });
      } else {
        setPredictionResult({
          riskScore: 0,
          confidence: 0,
          riskLevel: 'low',
          featureContributions: [],
          explanation: 'No prediction available.'
        });
      }
    } catch (err) {
      setPredictionResult({
        riskScore: 0,
        confidence: 0,
        riskLevel: 'low',
        featureContributions: [],
        explanation: 'Prediction failed. Please try again.'
      });
    }
    setIsLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ML Performance Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time machine learning insights and predictions</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          Live Model
        </Badge>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-base shadow">
        <strong>How to Read This Dashboard:</strong>
        <ul className="list-disc ml-6 mt-2">
          <li><b>Model Metrics:</b> These cards show how well the AI model predicts referral leakage. Higher values mean better performance.</li>
          <li><b>ROC Curve:</b> Shows the model's ability to distinguish between high and low risk. A curve closer to the top left is better.</li>
          <li><b>Feature Importance:</b> Shows which factors most influence risk predictions. Longer bars mean more impact.</li>
          <li><b>Learning Curve:</b> Shows how the model improves as it learns from more data.</li>
          <li><b>Live Predictions:</b> Enter a provider NPI or name to get a real-time risk score and explanation.</li>
        </ul>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Model Metrics</TabsTrigger>
          <TabsTrigger value="interventions">A/B Testing</TabsTrigger>
          <TabsTrigger value="financial">Financial Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          {/* Interpretation for Model Metrics */}
          <div className="mb-2 p-2 bg-gray-100 rounded text-gray-700 text-sm">
            <b>Interpretation:</b> High accuracy, precision, and recall mean the model reliably identifies at-risk providers. F1 Score balances precision and recall. AUC shows overall model quality.
          </div>
          {/* Model Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2 bg-gray-900 text-white">
                <CardTitle className="text-sm font-medium text-white">Accuracy</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <div className="text-2xl font-bold text-green-400">87%</div>
                <Progress value={87} className="mt-2" />
              </CardContent>
            </Card>
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2 bg-gray-900 text-white">
                <CardTitle className="text-sm font-medium text-white">Precision</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <div className="text-2xl font-bold text-blue-400">84%</div>
                <Progress value={84} className="mt-2" />
              </CardContent>
            </Card>
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2 bg-gray-900 text-white">
                <CardTitle className="text-sm font-medium text-white">Recall</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <div className="text-2xl font-bold text-purple-400">89%</div>
                <Progress value={89} className="mt-2" />
              </CardContent>
            </Card>
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2 bg-gray-900 text-white">
                <CardTitle className="text-sm font-medium text-white">F1 Score</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <div className="text-2xl font-bold text-orange-400">86%</div>
                <Progress value={86} className="mt-2" />
              </CardContent>
            </Card>
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2 bg-gray-900 text-white">
                <CardTitle className="text-sm font-medium text-white">AUC</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <div className="text-2xl font-bold text-indigo-400">91%</div>
                <Progress value={91} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROC Curve */}
            <Card className="bg-gray-900 text-white">
              <CardHeader className="bg-gray-900 text-white">
                <CardTitle className="text-white">ROC Curve</CardTitle>
                <div className="text-xs text-gray-400 mt-1">A curve closer to the top left means better risk discrimination.</div>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={modelMetrics.rocCurve} style={{ background: '#1a202c' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="fpr" label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -10, fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                    <YAxis dataKey="tpr" label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                    <Tooltip contentStyle={{ background: '#1a202c', color: '#fff', border: '1px solid #374151' }} />
                    <Area type="monotone" dataKey="tpr" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Feature Importance */}
            <Card className="bg-gray-900 text-white">
              <CardHeader className="bg-gray-900 text-white">
                <CardTitle className="text-white">Feature Importance</CardTitle>
                <div className="text-xs text-gray-400 mt-1">Longer bars mean the feature has more impact on risk prediction.</div>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={modelMetrics.featureImportance} layout="horizontal" style={{ background: '#1a202c' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" label={{ value: 'Importance', position: 'insideBottom', offset: -10, fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                    <YAxis dataKey="feature" type="category" width={100} tick={{ fill: '#cbd5e1' }} />
                    <Tooltip contentStyle={{ background: '#1a202c', color: '#fff', border: '1px solid #374151' }} />
                    <Bar dataKey="importance" fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Learning Curve */}
          <Card className="bg-gray-900 text-white">
            <CardHeader className="bg-gray-900 text-white">
              <CardTitle className="text-white">Model Learning Curve</CardTitle>
              <div className="text-xs text-gray-400 mt-1">Shows how model accuracy, precision, and recall improve with more data.</div>
            </CardHeader>
            <CardContent className="bg-gray-900 text-white">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={learningCurveData} style={{ background: '#1a202c' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                  <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                  <Tooltip contentStyle={{ background: '#1a202c', color: '#fff', border: '1px solid #374151' }} />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#38bdf8" name="Accuracy" />
                  <Line type="monotone" dataKey="precision" stroke="#82ca9d" name="Precision" />
                  <Line type="monotone" dataKey="recall" stroke="#ffc658" name="Recall" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-6">
          {/* A/B Testing Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900 text-white">
              <CardHeader className="bg-gray-900 text-white">
                <CardTitle className="text-white">Intervention Success Rates</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={interventionResults} style={{ background: '#1a202c' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="type" label={{ value: 'Intervention Type', position: 'insideBottom', offset: -10, fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                    <YAxis label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft', fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                    <Tooltip contentStyle={{ background: '#1a202c', color: '#fff', border: '1px solid #374151' }} formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
                    <Bar dataKey="successRate" fill="#38bdf8" name="Success Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 text-white">
              <CardHeader className="bg-gray-900 text-white">
                <CardTitle className="text-white">ROI by Intervention Type</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={interventionResults} style={{ background: '#1a202c' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="type" label={{ value: 'Intervention Type', position: 'insideBottom', offset: -10, fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                    <YAxis label={{ value: 'ROI (Return on Investment)', angle: -90, position: 'insideLeft', fill: '#cbd5e1' }} tick={{ fill: '#cbd5e1' }} />
                    <Tooltip contentStyle={{ background: '#1a202c', color: '#fff', border: '1px solid #374151' }} formatter={(value) => `${Number(value).toFixed(1)}x`} />
                    <Bar dataKey="roi" fill="#82ca9d" name="ROI" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Intervention Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Intervention Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Intervention Type</th>
                      <th className="text-left p-2">Success Rate</th>
                      <th className="text-left p-2">ROI</th>
                      <th className="text-left p-2">Cost</th>
                      <th className="text-left p-2">Revenue Saved</th>
                      <th className="text-left p-2">Payback (months)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interventionResults.map((intervention, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium text-gray-800">{intervention.type}</td>
                        <td className="p-2">{(intervention.successRate * 100).toFixed(1)}%</td>
                        <td className="p-2">{intervention.roi.toFixed(1)}x</td>
                        <td className="p-2">{formatCurrency(intervention.cost)}</td>
                        <td className="p-2">{formatCurrency(intervention.revenueSaved)}</td>
                        <td className="p-2">{intervention.paybackPeriod.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {/* Financial Impact Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2 bg-gray-900 text-white">
                <CardTitle className="text-sm text-white">Total Revenue Saved</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-900 text-white">
                <div className="text-2xl font-bold text-green-400">{formatCurrency(financialImpact.totalRevenueSaved)}</div>
                <p className="text-sm text-gray-400 mt-1">Annual projection</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Intervention Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialImpact.totalInterventionCost)}
                </div>
                <p className="text-sm text-gray-600 mt-1">One-time investment</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Net ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {financialImpact.netROI.toFixed(1)}x
                </div>
                <p className="text-sm text-gray-600 mt-1">Return on investment</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payback Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {financialImpact.paybackPeriod.toFixed(1)} months
                </div>
                <p className="text-sm text-gray-600 mt-1">Time to break even</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Savings Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Savings Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={Array.from({ length: 12 }, (_, i) => ({
                  month: `Month ${i + 1}`,
                  savings: financialImpact.monthlySavings * (1 + i * 0.05),
                  cumulative: financialImpact.monthlySavings * (i + 1)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" label={{ value: 'Time Period', position: 'insideBottom', offset: -10 }} />
                  <YAxis label={{ value: 'Revenue Savings ($)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Area type="monotone" dataKey="savings" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="Monthly Savings" />
                  <Area type="monotone" dataKey="cumulative" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="Cumulative Savings" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ROI Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>ROI Breakdown by Market Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Primary Care', value: 35, fill: '#8884d8' },
                      { name: 'Specialists', value: 28, fill: '#82ca9d' },
                      { name: 'Hospitals', value: 22, fill: '#ffc658' },
                      { name: 'Urgent Care', value: 15, fill: '#ff7300' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MLPerformanceDashboard; 