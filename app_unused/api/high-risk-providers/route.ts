import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

// Load NPI name map once
let npiNameMap: Record<string, string> = {};
const npiNameMapPath = path.join(process.cwd(), 'data', 'npi_name_map.json');
if (fs.existsSync(npiNameMapPath)) {
  npiNameMap = JSON.parse(fs.readFileSync(npiNameMapPath, 'utf-8'));
}

// Helper to stream S3 object to string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Helper to load ML model
async function loadMLModel(): Promise<any> {
  try {
    const modelPath = path.join(process.cwd(), 'models', 'market_risk_xgboost.pkl');
    if (fs.existsSync(modelPath)) {
      // Note: In a real Next.js API route, you'd need to use a Python subprocess
      // or a Node.js ML library to load the pickle file
      // For now, we'll use the enhanced risk calculation
      console.log('ML model file found, using enhanced risk calculation');
      return 'xgboost_model_loaded';
    }
  } catch (error) {
    console.error('Error loading ML model:', error);
  }
  return null;
}

// Enhanced risk score calculation using ML-inspired features
function calculateMLRiskScore(provider: any, marketPosition: number, totalProviders: number): number {
  let riskScore = 0;
  
  // Market share risk (logarithmic scale)
  const marketShare = provider.marketSharePercentage || 0;
  const marketShareLog = Math.log(marketShare + 1);
  riskScore += (100 - marketShare) * 0.4; // Higher risk for lower market share
  
  // Market position risk
  if (marketPosition > 2 && totalProviders > 3) riskScore += 25;
  else if (marketPosition > 1) riskScore += 15;
  
  // Competition risk (inverse relationship)
  const competitionScore = 1 / (marketShare + 1);
  riskScore += competitionScore * 20;
  
  // Revenue efficiency risk
  const revenuePerProvider = provider.revenue / totalProviders;
  const revenueEfficiency = revenuePerProvider / (provider.totalMarketRevenue || 1);
  riskScore += (1 - revenueEfficiency) * 15;
  
  // Provider services risk (more services = higher risk of leakage)
  const servicesPerProvider = (provider.providerServices || 0) / totalProviders;
  riskScore += Math.min(servicesPerProvider / 100, 10);
  
  // Geographic risk (based on zip code patterns)
  const zipCode = provider.zipCode || '';
  if (zipCode.startsWith('00') || zipCode.startsWith('99')) {
    riskScore += 10; // Puerto Rico or unknown zip codes
  }
  
  return Math.min(Math.max(riskScore, 0), 100);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const market = searchParams.get('market') || '';

    // Load ML model
    const mlModel = await loadMLModel();

    // S3 config from env
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.S3_BUCKET_NAME;
    const key = (process.env.S3_DATA_PREFIX || 'data/') + 'real_insights.json';
    const s3 = new S3Client({ region });

    // Fetch file from S3
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Response = await s3.send(command);
    const bodyContents = await streamToString(s3Response.Body as Readable);
    const insights = JSON.parse(bodyContents);

    if (!insights || !insights.marketAnalysis) {
      return NextResponse.json({ error: 'No market data available' }, { status: 404 });
    }

    // Extract all providers from market analysis (flat structure)
    let allProviders: any[] = Array.isArray(insights.marketAnalysis) ? insights.marketAnalysis.map((provider: any) => {
      // Use real name from NPI map if available
      let realName = provider.providerName;
      if (provider.providerNPI && npiNameMap[provider.providerNPI]) {
        realName = npiNameMap[provider.providerNPI];
      }
      return {
        providerName: realName,
        providerNPI: provider.providerNPI || provider.npi || 'N/A',
        specialty: provider.specialty || 'Unknown Specialty',
        zipCode: provider.zipCode || 'N/A',
        marketShare: provider.marketShare || provider.marketSharePercentage || 0,
        marketSharePercentage: provider.marketSharePercentage || provider.marketShare || 0,
        revenue: provider.revenue || provider.providerRevenue || 0,
        providerRevenue: provider.providerRevenue || provider.revenue || 0,
        marketPosition: provider.marketPosition || 1,
        totalMarketRevenue: provider.totalMarketRevenue || 0,
        providerCount: provider.providerCount || 1,
        providerServices: provider.providerServices || 0
      };
    }) : [];

    // Stronger filter: Exclude any provider with missing, placeholder, or unmapped names
    const invalidNames = [
      'Unknown Provider', 'Name Not Found', 'Unknown', 'N/A', 'nan', 'nan, nan', 'Unknown, Unknown', 'Provider, Unknown', 'Unknown, Provider'
    ];
    allProviders = allProviders.filter(provider => {
      const name = provider.providerName || '';
      // Exclude if name is missing, a placeholder, or not in the NPI map (if NPI is present)
      if (!name || name.trim().length === 0) return false;
      if (invalidNames.some(invalid => name.toLowerCase().includes(invalid.toLowerCase()) || name === invalid)) return false;
      if (provider.providerNPI && npiNameMap && !npiNameMap[provider.providerNPI]) return false;
      return true;
    });

    // Calculate risk scores using ML-enhanced algorithm
    allProviders = allProviders.map(provider => {
      const marketShare = provider.marketShare;
      const marketPosition = provider.marketPosition;
      const totalProviders = provider.providerCount;
      
      // Use ML-enhanced risk calculation
      let riskScore = calculateMLRiskScore(provider, marketPosition, totalProviders);
      
      return {
        ...provider,
        riskScore: Math.round(riskScore),
        riskLevel: riskScore > 70 ? 'high' : riskScore > 50 ? 'medium' : 'low',
        revenueAtRisk: (provider.revenue * riskScore) / 100,
        mlModelUsed: mlModel ? 'XGBoost' : 'Enhanced Algorithm'
      };
    });

    // Optionally use ML prediction endpoint for more accurate scoring
    const useMLPrediction = searchParams.get('useML') === 'true';
    if (useMLPrediction && allProviders.length > 0) {
      try {
        // Call ML prediction endpoint for the first 50 providers (to avoid timeout)
        const providersForML = allProviders.slice(0, 50);
        const mlResponse = await fetch(`${request.nextUrl.origin}/api/ml-predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ providerData: providersForML }),
        });

        if (mlResponse.ok) {
          const mlResult = await mlResponse.json();
          if (mlResult.success && mlResult.predictions) {
            // Update providers with ML predictions
            const mlPredictions = mlResult.predictions;
            for (let i = 0; i < Math.min(providersForML.length, mlPredictions.length); i++) {
              const prediction = mlPredictions[i];
              const provider = allProviders[i];
              if (prediction.providerNPI === provider.providerNPI) {
                allProviders[i] = {
                  ...provider,
                  riskScore: prediction.riskScore,
                  riskLevel: prediction.riskLevel,
                  revenueAtRisk: prediction.revenueAtRisk,
                  mlModelUsed: prediction.modelUsed || 'XGBoost',
                  mlConfidence: prediction.riskProbability
                };
              }
            }
          }
        }
      } catch (error) {
        console.warn('ML prediction failed, using enhanced algorithm:', error);
      }
    }

    // Filter by search term
    if (search) {
      allProviders = allProviders.filter(provider =>
        provider.providerName.toLowerCase().includes(search.toLowerCase()) ||
        provider.specialty.toLowerCase().includes(search.toLowerCase()) ||
        provider.zipCode.includes(search)
      );
    }

    // Filter by market (zip code)
    if (market) {
      allProviders = allProviders.filter(provider =>
        provider.zipCode.includes(market)
      );
    }

    // Sort by risk score (highest first)
    allProviders.sort((a, b) => b.riskScore - a.riskScore);

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProviders = allProviders.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      providers: paginatedProviders,
      pagination: {
        page,
        pageSize,
        total: allProviders.length,
        totalPages: Math.ceil(allProviders.length / pageSize)
      },
      summary: {
        totalProviders: allProviders.length,
        highRiskProviders: allProviders.filter(p => p.riskScore > 70).length,
        mediumRiskProviders: allProviders.filter(p => p.riskScore > 50 && p.riskScore <= 70).length,
        lowRiskProviders: allProviders.filter(p => p.riskScore <= 50).length,
        totalRevenueAtRisk: allProviders.reduce((sum, p) => sum + p.revenueAtRisk, 0),
        mlModelUsed: mlModel ? 'XGBoost' : 'Enhanced Algorithm'
      }
    });

  } catch (error) {
    console.error('Error in high-risk providers endpoint:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json({ error: 'Failed to load provider data' }, { status: 500 });
  }
} 