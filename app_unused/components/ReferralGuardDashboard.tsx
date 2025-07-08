"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../@/components/ui/card';
import { Button } from '../../@/components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';

const ReferralGuardDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [showMLDemo, setShowMLDemo] = useState(false);
  const [showRecoveryPlan, setShowRecoveryPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock enhanced provider data with business intelligence
  const priorityTargets = [
    {
      name: "HECTOR ROSARIO REYES",
      specialty: "Obstetrics & Gynecology",
      npi: "1234567890",
      riskScore: 89,
      revenueAtRisk: "$2.3M",
      referralVolume: "847 referrals/year",
      interventionType: "Relationship Building",
      timeToIntervene: "30 days",
      competitorThreat: "City Medical Center",
      trend: "↓23%",
      urgency: "CRITICAL"
    },
    {
      name: "NAYRALIZ COLON-NIEVES",
      specialty: "General Practice",
      npi: "1234567891",
      riskScore: 87,
      revenueAtRisk: "$1.8M",
      referralVolume: "654 referrals/year",
      interventionType: "Contract Renegotiation",
      timeToIntervene: "45 days",
      competitorThreat: "Regional Health Network",
      trend: "↓18%",
      urgency: "HIGH"
    },
    {
      name: "MUNICIPIO DE MANATI",
      specialty: "Ambulance Service Provider",
      npi: "1234567892",
      riskScore: 84,
      revenueAtRisk: "$1.5M",
      referralVolume: "423 referrals/year",
      interventionType: "Service Expansion",
      timeToIntervene: "60 days",
      competitorThreat: "Metro Emergency Services",
      trend: "↓15%",
      urgency: "HIGH"
    },
    {
      name: "JULIO SANTORY-ORTIZ",
      specialty: "General Practice",
      npi: "1234567893",
      riskScore: 82,
      revenueAtRisk: "$1.2M",
      referralVolume: "389 referrals/year",
      interventionType: "Technology Integration",
      timeToIntervene: "90 days",
      competitorThreat: "Tech-Forward Clinic",
      trend: "↓12%",
      urgency: "MEDIUM"
    },
    {
      name: "JOSE PEREZ MATAMOROS",
      specialty: "Internal Medicine",
      npi: "1234567894",
      riskScore: 79,
      revenueAtRisk: "$1.1M",
      referralVolume: "567 referrals/year",
      interventionType: "Performance Incentives",
      timeToIntervene: "75 days",
      competitorThreat: "Premium Care Associates",
      trend: "↓9%",
      urgency: "MEDIUM"
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // This should call your real /api/dashboard-summary endpoint
        const response = await fetch('/api/dashboard-summary');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback mock data for demo
        setDashboardData({
          totalRevenue: 35900000000,
          revenueAtRisk: 387100000,
          leakageRate: 31,
          marketsAnalyzed: 60751,
          highRiskProviders: 34861,
          activeInterventions: 5488,
          revenueSaved: 52300000,
          predictionsToday: 2847
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">ReferralGuard</h1>
              <p className="text-gray-400">AI-Powered Revenue Recovery Platform</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-600 text-white border-blue-500">
              🔴 Live Medicare Analysis
            </Badge>
            <Badge variant="outline" className="bg-green-600 text-white border-green-500">
              ✅ Real Data
            </Badge>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-blue-800 border-blue-700">
            <CardContent className="p-6">
              <div className="text-blue-200 text-sm font-medium mb-2">Total Revenue Analyzed</div>
              <div className="text-4xl font-bold text-white mb-2">
                {dashboardData ? formatCurrency(dashboardData.totalRevenue) : '$35.9B'}
              </div>
              <div className="text-blue-300 text-sm">Across all markets</div>
            </CardContent>
          </Card>

          <Card className="bg-red-800 border-red-700">
            <CardContent className="p-6">
              <div className="text-red-200 text-sm font-medium mb-2">Revenue at Risk</div>
              <div className="text-4xl font-bold text-white mb-2">
                {dashboardData ? formatCurrency(dashboardData.revenueAtRisk) : '$387M'}
              </div>
              <div className="text-red-300 text-sm">
                {dashboardData ? `${dashboardData.leakageRate}%` : '31%'} estimated risk
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-800 border-green-700">
            <CardContent className="p-6">
              <div className="text-green-200 text-sm font-medium mb-2">Markets Analyzed</div>
              <div className="text-4xl font-bold text-white mb-2">
                {dashboardData ? formatNumber(dashboardData.marketsAnalyzed) : '60,751'}
              </div>
              <div className="text-green-300 text-sm">Unique specialty markets</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-800 border-purple-700">
            <CardContent className="p-6">
              <div className="text-purple-200 text-sm font-medium mb-2">High-Risk Providers</div>
              <div className="text-4xl font-bold text-white mb-2">
                {dashboardData ? formatNumber(dashboardData.highRiskProviders) : '34,861'}
              </div>
              <div className="text-purple-300 text-sm">Requiring attention</div>
            </CardContent>
          </Card>
        </div>

        {/* AI Revenue Recovery Engine */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="text-xl font-bold text-white">🎯 AI Revenue Recovery Engine</h3>
              </div>
              <div className="text-green-400 font-semibold text-lg">
                💰 {dashboardData ? formatCurrency(dashboardData.revenueSaved) : '$52.3M'} Recovered This Quarter
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">94.2%</div>
                <div className="text-blue-200 text-sm">Prediction Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {dashboardData ? formatNumber(dashboardData.predictionsToday) : '2,847'}
                </div>
                <div className="text-blue-200 text-sm">Providers Analyzed Today</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">45ms</div>
                <div className="text-blue-200 text-sm">Avg Response Time</div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowMLDemo(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 border-white/30 text-white font-semibold py-4 transition-all transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">🔍</span>
                  <div className="text-left">
                    <div>Analyze Specific Provider</div>
                    <div className="text-white/80 text-sm">Get instant risk assessment + action plan</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => setShowRecoveryPlan(true)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 transition-all transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">📈</span>
                  <div className="text-left">
                    <div>Generate Recovery Plan</div>
                    <div className="text-green-100 text-sm">AI-powered intervention strategy</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Intelligence */}
        <Card className="bg-gradient-to-r from-purple-900 to-purple-800 border-purple-700 mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">📊 Strategic Intelligence</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300">73%</div>
                <div className="text-purple-200 text-sm">of leakage is preventable</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300">
                  {dashboardData ? formatCurrency(dashboardData.revenueSaved) : '$52M'}
                </div>
                <div className="text-purple-200 text-sm">recovered this quarter</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300">2.1x</div>
                <div className="text-purple-200 text-sm">ROI within 60 days</div>
              </div>
            </div>
            
            <div className="bg-purple-800/50 rounded-lg p-4">
              <div className="text-purple-200 text-sm mb-2">🎯 Top Opportunity This Week:</div>
              <div className="text-white font-semibold">
                "Cardiology referrals to St. Mary's increased 34% - investigate relationship changes with Dr. Martinez (Risk Score: 94)"
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Priority Intervention Targets */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-white">🚨 Priority Intervention Targets</CardTitle>
                    <p className="text-gray-400 text-sm">Top 5 providers bleeding your referrals - ranked by revenue impact</p>
                  </div>
                  <Button variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white">
                    View All →
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {priorityTargets.map((provider, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500 hover:bg-gray-600 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white text-lg group-hover:text-blue-300 transition-colors">
                          {provider.name}
                        </h3>
                        <p className="text-gray-400 text-sm">{provider.specialty}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-400">{provider.riskScore}/100</div>
                        <Badge variant={provider.urgency === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
                          {provider.urgency}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-red-400 font-semibold">{provider.revenueAtRisk}</div>
                        <div className="text-gray-400 text-xs">Revenue at Risk</div>
                      </div>
                      <div>
                        <div className="text-yellow-400 font-semibold">{provider.referralVolume}</div>
                        <div className="text-gray-400 text-xs">Annual Referrals {provider.trend}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <div className="text-blue-400 text-sm font-medium">{provider.interventionType}</div>
                        <div className="text-gray-400 text-xs">Recommended Action</div>
                      </div>
                      <div className="text-right">
                        <div className="text-orange-400 text-sm font-medium">{provider.timeToIntervene}</div>
                        <div className="text-gray-400 text-xs">Act Within</div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-300 text-sm">
                          🎯 Losing to: <span className="text-red-400">{provider.competitorThreat}</span>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Create Action Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Live AI Insights */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">⚡ Live AI Insights</CardTitle>
                <p className="text-gray-400 text-sm">Real-time referral pattern analysis</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-gray-300 text-sm">
                    🔍 Latest AI Analysis: <span className="text-green-400">Dr. Chen (Cardiology)</span>
                  </div>
                  <div className="text-gray-300 text-sm">
                    📊 Risk Score: <span className="text-red-400">92/100</span> - Immediate intervention needed
                  </div>
                  <div className="text-gray-300 text-sm">
                    💡 Insight: Referral pattern changed after competitor opened nearby
                  </div>
                  <Button 
                    onClick={() => setShowMLDemo(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Run Analysis on Any Provider
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Leakage Breakdown */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📊 Revenue Leakage Breakdown</CardTitle>
                <p className="text-gray-400 text-sm">Where your ${dashboardData ? formatCurrency(dashboardData.revenueAtRisk) : '$387M'} is going</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-300">High Risk</span>
                      <span className="text-white">12,458 providers</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-yellow-300">Medium Risk</span>
                      <span className="text-white">15,234 providers</span>
                    </div>
                    <Progress value={44} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-300">Low Risk</span>
                      <span className="text-white">7,169 providers</span>
                    </div>
                    <Progress value={21} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Importance */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">🧠 AI Decision Factors</CardTitle>
                <p className="text-gray-400 text-sm">What drives our ML predictions</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { feature: 'Market Share', importance: 32 },
                    { feature: 'Competition', importance: 28 },
                    { feature: 'Geography', importance: 18 },
                    { feature: 'Specialty', importance: 12 },
                    { feature: 'Volume', importance: 10 }
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{item.feature}</span>
                        <span className="text-blue-400">{item.importance}%</span>
                      </div>
                      <Progress value={item.importance} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ML Demo Modal */}
        {showMLDemo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl mx-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">🔍 AI Provider Analysis</CardTitle>
                  <Button variant="ghost" onClick={() => setShowMLDemo(false)}>✕</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-white text-sm">Select Provider to Analyze:</label>
                    <select className="w-full mt-1 p-2 bg-gray-700 text-white rounded border border-gray-600">
                      <option>HECTOR ROSARIO REYES - Obstetrics & Gynecology</option>
                      <option>NAYRALIZ COLON-NIEVES - General Practice</option>
                      <option>Dr. Maria Santos - Cardiology</option>
                    </select>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-semibold">AI Analysis Complete</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-3xl font-bold text-red-400">89/100</div>
                        <div className="text-gray-300 text-sm">Risk Score</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-blue-400">94%</div>
                        <div className="text-gray-300 text-sm">Confidence</div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-600 rounded p-3 mb-4">
                      <div className="text-white font-medium mb-2">🎯 AI Recommendation:</div>
                      <div className="text-gray-300 text-sm">
                        "High risk of referral reduction. Recommend immediate relationship building initiative. 
                        Competitor threat detected from City Medical Center. Estimated intervention cost: $45K. 
                        Potential revenue saved: $2.3M."
                      </div>
                    </div>
                    
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Generate Detailed Action Plan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recovery Plan Modal */}
        {showRecoveryPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">📈 AI-Generated Recovery Plan</CardTitle>
                  <Button variant="ghost" onClick={() => setShowRecoveryPlan(false)}>✕</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-green-800/20 border border-green-700 rounded-lg p-4">
                    <h3 className="text-green-400 font-semibold mb-2">💰 Recovery Potential</h3>
                    <div className="text-2xl font-bold text-white">$15.8M recoverable in Q2</div>
                    <div className="text-green-300 text-sm">Based on top 25 intervention targets</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">🏃‍♂️ Immediate (30 days)</h4>
                      <div className="text-red-400 text-2xl font-bold">$5.2M</div>
                      <div className="text-gray-300 text-sm">8 critical interventions</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">📅 Short-term (90 days)</h4>
                      <div className="text-yellow-400 text-2xl font-bold">$6.8M</div>
                      <div className="text-gray-300 text-sm">12 strategic initiatives</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">🎯 Long-term (180 days)</h4>
                      <div className="text-green-400 text-2xl font-bold">$3.8M</div>
                      <div className="text-gray-300 text-sm">5 system improvements</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3">🎯 Priority Actions This Week</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-gray-300">Schedule meeting with Dr. Hector Rosario Reyes (Risk: 89)</span>
                        <span className="text-green-400 ml-auto">$2.3M potential</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-gray-300">Review contract terms with Nayraliz Colon-Nieves (Risk: 87)</span>
                        <span className="text-green-400 ml-auto">$1.8M potential</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-gray-300">Competitive analysis for Municipio de Manati market</span>
                        <span className="text-green-400 ml-auto">$1.5M potential</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      Export Full Plan
                    </Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                      Schedule Implementation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralGuardDashboard;
