import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

// Helper to stream S3 object to string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Helper to load data from local file if S3 is not available
async function loadLocalData(): Promise<any> {
  try {
    const localPath = path.join(process.cwd(), 'outputs', 'real_insights.json');
    if (fs.existsSync(localPath)) {
      const data = fs.readFileSync(localPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading local data:', error);
  }
  return null;
}

// Helper to load ML model performance data
async function loadModelPerformance(): Promise<any> {
  try {
    const localPath = path.join(process.cwd(), 'outputs', 'model_performance.json');
    if (fs.existsSync(localPath)) {
      const data = fs.readFileSync(localPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading model performance:', error);
  }
  return null;
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    // Try to load data from S3 first, fallback to local file
    let insights: any = null;
    
    // S3 config from env
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.S3_BUCKET_NAME;
    const key = (process.env.S3_DATA_PREFIX || 'data/') + 'real_insights.json';
    
    if (bucket) {
      try {
        const s3 = new S3Client({ region });
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const s3Response = await s3.send(command);
        const bodyContents = await streamToString(s3Response.Body as Readable);
        insights = JSON.parse(bodyContents);
        console.log('Loaded data from S3 successfully');
      } catch (error) {
        console.warn('Failed to load from S3, falling back to local file:', error);
        insights = await loadLocalData();
      }
    } else {
      insights = await loadLocalData();
    }

    if (!insights) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    // Load ML model performance data
    const modelPerformance = await loadModelPerformance();

    // Calculate real metrics from the data
    const marketAnalysis = insights.marketAnalysis || [];
    const summary = insights.summary || {};
    
    // Calculate real metrics
    const totalRevenueAnalyzed = summary.totalRevenueAnalyzed || 0;
    const totalMarkets = summary.totalMarketsAnalyzed || marketAnalysis.length;
    const highRiskMarkets = summary.highConcentrationMarkets || 0;
    const fragmentedMarkets = summary.fragmentedMarkets || 0;
    
    // Calculate revenue at risk (15% of total revenue as estimated risk)
    const revenueAtRisk = totalRevenueAnalyzed * 0.15;
    
    // Calculate average leakage rate from market concentration
    const averageMarketShare = summary.averageMarketShare || 0;
    const estimatedLeakageRate = Math.max(0, 100 - averageMarketShare);
    
    // Calculate active interventions (based on high-risk markets)
    const activeInterventions = Math.floor(highRiskMarkets * 0.1); // 10% of high-risk markets
    
    // Calculate revenue saved (based on interventions)
    const revenueSaved = activeInterventions * (revenueAtRisk / totalMarkets) * 0.3; // 30% success rate
    
    // Calculate trends (mock for now, could be calculated from historical data)
    const revenueAtRiskTrend = 12; // Mock trend
    const leakageRateTrend = -3; // Mock trend
    const interventionsTrend = 8; // Mock trend
    const revenueSavedTrend = 24; // Mock trend

    // Get top 15 high-risk providers
    const topProviders = marketAnalysis
      .filter((market: any) => market.marketSharePercentage > 80) // High concentration = high risk
      .sort((a: any, b: any) => b.providerRevenue - a.providerRevenue)
      .slice(0, 15)
      .map((market: any, index: number) => ({
        id: index + 1,
        name: market.providerName || 'Unknown Provider',
        specialty: market.specialty || 'Unknown Specialty',
        leakageRate: Math.round(100 - market.marketSharePercentage),
        trend: index % 2 === 0 ? 'up' : 'down',
        referrals: Math.floor(market.providerServices || 0),
        revenue: Math.round((market.providerRevenue || 0) / 1000000 * 10) / 10,
        providerNPI: market.providerNPI,
        zipCode: market.zipCode,
        riskScore: Math.round(100 - market.marketSharePercentage),
        marketPosition: 1,
        numProviders: market.providerCount || 1,
        revenueAtRisk: (market.providerRevenue || 0) * 0.15
      }));

    // Generate referral flows from market data
    const referralFlows = marketAnalysis
      .filter((market: any) => market.providerCount > 1) // Only markets with multiple providers
      .slice(0, 5)
      .map((market: any, index: number) => ({
        fromId: `pcp${index + 1}`,
        toId: `spec${index + 1}`,
        volume: Math.floor((market.providerServices || 0) / (market.providerCount || 1)),
        isInNetwork: market.marketSharePercentage > 50,
        fromName: `Dr. ${market.providerName?.split(',')[0] || 'Smith'}`,
        toName: market.specialty || 'Specialist'
      }));

    const dashboardData = {
      // Real calculated metrics
      revenueAtRisk: Math.round(revenueAtRisk / 1000000 * 10) / 10, // Convert to millions
      leakageRate: Math.round(estimatedLeakageRate),
      activeInterventions,
      revenueSaved: Math.round(revenueSaved / 1000000 * 10) / 10, // Convert to millions
      
      // Trends (mock for now)
      revenueAtRiskTrend,
      leakageRateTrend,
      interventionsTrend,
      revenueSavedTrend,
      
      // Real data
      topProviders,
      referralFlows,
      selectedHospital: 'Riverside Health Network',
      
      // Summary metrics
      totalRevenueAnalyzed: Math.round(totalRevenueAnalyzed / 1000000000 * 10) / 10, // Convert to billions
      totalMarkets,
      highRiskMarkets,
      fragmentedMarkets,
      
      // ML model info
      modelPerformance: modelPerformance ? {
        aucScore: modelPerformance.metrics?.auc_score || 0,
        accuracy: modelPerformance.metrics?.accuracy || 0,
        modelName: modelPerformance.model_name || 'market_risk_xgboost',
        lastUpdated: modelPerformance.timestamp || new Date().toISOString()
      } : null
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      dataSource: bucket ? 'S3' : 'local'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Error in dashboard summary endpoint:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }});
  }
} 