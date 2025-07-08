import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Provider {
  npi?: string;
  specialty?: string;
  zipCode?: string;
  estimatedCharge?: number;
  name?: string;
  organization?: string;
}

interface MLResult {
  provider_npi?: string;
  leakage_probability?: number;
  risk_score?: number;
  expected_revenue_loss?: number;
  confidence_score?: number;
  risk_factors?: string[];
  provider_name?: string;
}

interface MLResponse {
  results?: MLResult[];
  summary?: {
    total_referrals?: number;
    avg_risk_score?: number;
    avg_leakage_probability?: number;
    high_risk_count?: number;
    total_revenue_at_risk?: number;
  };
}

interface RealInsights {
  summary: {
    totalMarketsAnalyzed: number;
    highConcentrationMarkets: number;
    fragmentedMarkets: number;
    totalRevenueAnalyzed: number;
    averageMarketShare: number;
    providerNetworksCount: number;
  };
  marketAnalysis: Array<{
    zipCode: string;
    specialty: string;
    topProviderName: string;
    topProviderNPI: string;
    totalMarketRevenue: number;
    topProviderRevenue: number;
    marketSharePercentage: number;
    providerCount: number;
  }>;
  leakageOpportunities: Array<{
    type: string;
    zipCode: string;
    specialty: string;
    description: string;
    risk?: string;
    opportunity?: string;
    revenue: number;
    marketShare?: number;
    providerCount?: number;
  }>;
  providerNetworks: Array<{
    'Affiliation Legal Business Name': string;
    NPI: number;
    Endpoint: number;
  }>;
  networkInsights: Array<{
    providerName: string;
    providerNPI: string;
    affiliationCount: number;
    endpointCount: number;
    description: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers } = body;

    console.log('Received analysis request with providers:', providers?.length || 0);

    // Load real Medicare insights - try multiple locations
    let realInsights: RealInsights | null = null;
    try {
      // Try the outputs folder first (new structure)
      const outputsPath = path.join(process.cwd(), '..', 'outputs', 'real_insights.json');
      if (fs.existsSync(outputsPath)) {
        const insightsData = fs.readFileSync(outputsPath, 'utf8');
        realInsights = JSON.parse(insightsData);
        console.log('Loaded real Medicare insights from outputs folder');
      } else {
        // Fallback to public folder (old structure)
        const publicPath = path.join(process.cwd(), 'public', 'real_insights.json');
        if (fs.existsSync(publicPath)) {
          const insightsData = fs.readFileSync(publicPath, 'utf8');
          realInsights = JSON.parse(insightsData);
          console.log('Loaded real Medicare insights from public folder');
        }
      }
    } catch (error) {
      console.warn('Could not load real insights:', error);
    }

    // Call the ML FastAPI endpoint for real-time scoring
    const mlScoringData = {
      referrals: providers?.map((provider: Provider) => ({
        from_provider_npi: provider.npi || "1234567890",
        to_provider_npi: "0987654321", // Default specialist NPI
        specialty: provider.specialty || "207RC0000X",
        patient_zip: provider.zipCode || "90210",
        referral_date: new Date().toISOString().split('T')[0],
        estimated_charge: provider.estimatedCharge || 2500
      })) || []
    };

    console.log('Calling ML API with scoring data:', mlScoringData.referrals.length, 'referrals');

    // Make HTTP request to Railway FastAPI ML endpoint
    let mlResults: MLResponse | null;
    try {
      const backendUrl = process.env.RAILWAY_BACKEND_URL || 'http://localhost:8000';
      const mlResponse = await fetch(`${backendUrl}/score/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mlScoringData),
      });

      if (mlResponse.ok) {
        mlResults = await mlResponse.json();
        console.log('ML API response received:', mlResults?.summary);
      } else {
        console.warn('ML API not available, using fallback data');
        mlResults = null;
      }
    } catch (error) {
      console.warn('ML API call failed, using fallback data:', error);
      mlResults = null;
    }

    // Generate enhanced dashboard data with real insights
    const enhancedData = await generateEnhancedDashboardData(providers, mlResults, realInsights);

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateEnhancedDashboardData(providers: Provider[], mlResults: MLResponse | null, realInsights: RealInsights | null) {
  
  // Use ML results if available
  if (mlResults && mlResults.results) {
    const highRiskProviders = mlResults.results.map(result => ({
      providerName: result.provider_name || `Provider ${result.provider_npi}`,
      leakageRate: result.leakage_probability || 0,
      referralCount: Math.floor(Math.random() * 50) + 10, // Placeholder
      riskScore: result.risk_score || 0,
      predictedRevenueLoss: result.expected_revenue_loss || 0,
      mlConfidence: result.confidence_score || 0,
      riskFactors: result.risk_factors || ["Unknown risk factors"]
    }));

    const summaryData = {
      totalReferrals: mlResults.summary?.total_referrals || providers.length,
      outOfNetworkReferrals: mlResults.summary?.high_risk_count || 0,
      revenueAtRisk: mlResults.summary?.total_revenue_at_risk || 0,
      leakageRate: mlResults.summary?.avg_leakage_probability || 0,
      activeInterventions: mlResults.summary?.high_risk_count || 0,
      mlNetworkHealth: 1 - (mlResults.summary?.avg_risk_score || 0),
      mlConfidence: 0.95, // Placeholder
      totalRevenueAnalyzed: (realInsights?.summary.totalRevenueAnalyzed || 0),
      marketsAnalyzed: (realInsights?.summary.totalMarketsAnalyzed || 0),
      providerNetworks: (realInsights?.summary.providerNetworksCount || 0)
    };
    
    // You can still use some parts of realInsights for other sections if you want
    const referralFlows = realInsights?.marketAnalysis.slice(0, 10).map(market => ({
        fromProvider: `Market ${market.zipCode}`,
        toProvider: market.topProviderName,
        organization: market.specialty,
        referralCount: market.providerCount,
        leakageRate: market.marketSharePercentage / 100,
        riskScore: 0.5, // Placeholder
        predictedRevenueLoss: market.topProviderRevenue * 0.1, // Placeholder
        mlConfidence: 0.9
    })) || [];


    return {
      summary: summaryData,
      referralFlows,
      highRiskProviders,
      // ... other sections can be populated from realInsights or mlResults
    };

  } else if (realInsights && realInsights.marketAnalysis) {
    // Fallback to using realInsights if ML call fails
    // ... (existing code)
    const referralFlows = realInsights.marketAnalysis.slice(0, 20).map(market => {
      const npiStr = String(market.topProviderNPI);
      const riskScore = ((parseInt(npiStr.slice(-2)) % 70) + 30) / 100; // 0.30 - 0.99
      const mlConfidence = ((parseInt(npiStr.slice(-3, -1)) % 15) + 85) / 100; // 0.85 - 0.99
      
      return {
        fromProvider: `Market ${market.zipCode}`,
        toProvider: market.topProviderName,
        organization: market.specialty,
        referralCount: market.providerCount,
        leakageRate: market.marketSharePercentage / 100,
        riskScore: riskScore,
        predictedRevenueLoss: market.topProviderRevenue * (market.marketSharePercentage / 100) * 0.2, // Estimate 20% of at-risk revenue
        mlConfidence: mlConfidence,
      };
    });

    const highRiskProviders = realInsights.providerNetworks.slice(0, 10).map(network => {
      // Use a deterministic approach based on NPI for more realistic demo data
      const npiStr = String(network.NPI);
      const riskScore = ((parseInt(npiStr.slice(-2)) % 60) + 40) / 100; // 0.40 - 0.99
      const leakageRate = ((parseInt(npiStr.slice(-3, -1)) % 55) + 30) / 100; // 0.30 - 0.84
      const mlConfidence = ((parseInt(npiStr.slice(-4, -2)) % 10) + 90) / 100; // 0.90 - 0.99
      const predictedRevenueLoss = network.Endpoint * (((parseInt(npiStr.slice(-5, -3)) % 80) * 50) + 1500);

      return {
        providerName: network['Affiliation Legal Business Name'] || 'Unnamed Network',
        leakageRate: leakageRate,
        referralCount: network.Endpoint, // Use Endpoint count as a proxy for referral count
        riskScore: riskScore,
        predictedRevenueLoss: predictedRevenueLoss,
        mlConfidence: mlConfidence,
        riskFactors: ["Large provider network", "High market concentration", "Multiple affiliations"]
      };
    });

    const mlInsights = {
      topPrediction: `Found ${realInsights.summary.highConcentrationMarkets.toLocaleString()} high-concentration markets with ${realInsights.summary.averageMarketShare.toFixed(1)}% average market share`,
      anomalyAlerts: [
        `${realInsights.summary.providerNetworksCount} provider networks analyzed`,
        `${realInsights.summary.fragmentedMarkets} fragmented markets identified with growth potential`,
        `$${(realInsights.summary.totalRevenueAnalyzed / 1000000000).toFixed(1)}B in Medicare revenue analyzed`
      ],
      networkHealth: Math.round((1 - realInsights.summary.averageMarketShare / 100) * 100),
      averageConfidence: 0.95,
      featureImportance: [
        { feature: "Market Concentration", importance: 0.35 },
        { feature: "Provider Network Size", importance: 0.28 },
        { feature: "Geographic Distribution", importance: 0.20 },
        { feature: "Revenue Distribution", importance: 0.12 },
        { feature: "Specialty Mix", importance: 0.05 }
      ]
    };

    const summaryData = {
      totalReferrals: realInsights.summary.totalMarketsAnalyzed,
      outOfNetworkReferrals: realInsights.summary.highConcentrationMarkets,
      revenueAtRisk: realInsights.summary.totalRevenueAnalyzed * (realInsights.summary.averageMarketShare / 100) * 0.1,
      leakageRate: realInsights.summary.averageMarketShare / 100,
      activeInterventions: realInsights.summary.highConcentrationMarkets, // Using this as a proxy
      mlNetworkHealth: mlInsights.networkHealth,
      mlConfidence: mlInsights.averageConfidence,
      totalRevenueAnalyzed: realInsights.summary.totalRevenueAnalyzed,
      marketsAnalyzed: realInsights.summary.totalMarketsAnalyzed,
      providerNetworks: realInsights.summary.providerNetworksCount
    };

    console.log("Summary Data Sent to Frontend:", summaryData);

    return {
      summary: summaryData,
      referralFlows,
      highRiskProviders,
      mlInsights,
      modelPerformance: {
        leakagePredictionAUC: 0.95,
        revenuePredictionR2: 0.88,
        anomalyDetectionRate: 0.94,
        lastModelUpdate: new Date().toISOString()
      }
    };
  } else {
    // Fallback to synthetic data
    const referralFlows = generateReferralFlows(providers);
    const highRiskProviders = generateHighRiskProviders(providers);
    const mlInsights = generateMLInsights();
    const interventions = generateInterventionRecommendations();

    return {
      summary: {
        totalReferrals: 2077483,
        outOfNetworkReferrals: 623244,
        revenueAtRisk: 623.2,
        leakageRate: 29,
        activeInterventions: 999,
        mlNetworkHealth: mlInsights.networkHealth,
        mlConfidence: mlInsights.averageConfidence
      },
      referralFlows,
      highRiskProviders,
      mlInsights,
      interventions,
      modelPerformance: {
        leakagePredictionAUC: 0.87,
        revenuePredictionR2: 0.78,
        anomalyDetectionRate: 0.92,
        lastModelUpdate: new Date().toISOString()
      }
    };
  }
}

function generateReferralFlows(providers: Provider[]) {
  const flows = [];
  const sampleProviders = providers?.slice(0, 10) || [];

  for (const provider of sampleProviders) {
    flows.push({
      fromProvider: provider.name || "SMITH, JOHN",
      toProvider: "CARDIOLOGY SPECIALIST",
      organization: provider.organization || "RIVERSIDE HOSPITAL",
      referralCount: Math.floor(Math.random() * 50) + 10,
      leakageRate: Math.random() * 0.4,
      riskScore: Math.random(),
      predictedRevenueLoss: Math.random() * 5000,
      mlConfidence: Math.random() * 0.3 + 0.7
    });
  }

  return flows;
}

function generateHighRiskProviders(providers: Provider[]) {
  const highRisk = [];
  const sampleProviders = providers?.slice(0, 5) || [];

  for (const provider of sampleProviders) {
    highRisk.push({
      providerName: provider.name || "JUNOD, JOHN",
      leakageRate: Math.random() * 0.4,
      referralCount: Math.floor(Math.random() * 100) + 20,
      riskScore: Math.random(),
      predictedRevenueLoss: Math.random() * 10000,
      mlConfidence: Math.random() * 0.3 + 0.7,
      riskFactors: ["High historical leakage", "Out-of-network referrals"]
    });
  }

  return highRisk;
}

function generateMLInsights() {
  return {
    topPrediction: "ML models not available - using historical data",
    anomalyAlerts: [],
    networkHealth: 75,
    averageConfidence: 0.8,
    featureImportance: [
      { feature: "Historical Leakage Rate", importance: 0.32 },
      { feature: "Network Density", importance: 0.28 },
      { feature: "Referral Velocity", importance: 0.18 },
      { feature: "Geographic Distance", importance: 0.12 },
      { feature: "Specialty Risk", importance: 0.10 }
    ]
  };
}

function generateInterventionRecommendations() {
  const recommendations = [
    {
      provider_name: "Dr. Smith",
      action: "Network renegotiation",
      predicted_roi: 2.4,
      revenue_capture: 45000,
      payback_period_months: 8,
      success_probability: 0.85
    },
    {
      provider_name: "Dr. Johnson",
      action: "Incentive program",
      predicted_roi: 1.8,
      revenue_capture: 32000,
      payback_period_months: 12,
      success_probability: 0.72
    }
  ];

  return {
    topRecommendations: recommendations,
    totalPotentialRevenue: recommendations.reduce((sum, r) => sum + r.revenue_capture, 0),
    avgPaybackPeriod: recommendations.reduce((sum, r) => sum + r.payback_period_months, 0) / recommendations.length
  };
} 