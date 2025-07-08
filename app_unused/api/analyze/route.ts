import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Type definitions
interface Provider {
  name: string;
  organization?: string;
  npi?: string;
  specialty?: string;
  revenue?: number;
}

interface RealInsights {
  marketAnalysis: Array<{
    zipCode: string;
    specialty: string;
    marketSharePercentage: number;
    totalMarketRevenue: number;
    providerCount: number;
    providers?: Array<{
      name: string;
      npi: string;
      marketShare: number;
      revenue: number;
    }>;
  }>;
  providerNetworks: Array<{
    name: string;
    providerCount: number;
    totalRevenue: number;
  }>;
  summary: {
    totalRevenueAtRisk: number;
    totalMarkets: number;
    averageMarketConcentration: number;
    totalRevenueAnalyzed: number;
  };
}

let realInsights: RealInsights | null = null;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save uploaded file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = path.join(process.cwd(), 'temp_upload.csv');
    
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, buffer);

    // Run Python analysis script
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [
        path.join(process.cwd(), 'analyze_cms_data.py'),
        '--input', tempFilePath,
        '--output', path.join(process.cwd(), 'outputs'),
        '--use-cloud'
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code: number) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.warn('Failed to clean up temp file:', e);
        }

        if (code === 0) {
          // Load results using cloud-based retrieval
          try {
            const { load_data_from_cloud } = require('../../config.py');
            const insights = load_data_from_cloud('real_insights.json');
            
            if (insights) {
              realInsights = insights;
              resolve(NextResponse.json({
                success: true,
                message: 'Analysis completed successfully',
                summary: insights.summary,
                marketsAnalyzed: insights.marketAnalysis?.length || 0,
                providersAnalyzed: insights.providerNetworks?.length || 0
              }));
            } else {
              resolve(NextResponse.json({ 
                error: 'Analysis completed but results not found' 
              }, { status: 500 }));
            }
          } catch (e) {
            console.error('Error loading results:', e);
            resolve(NextResponse.json({ 
              error: 'Failed to load analysis results' 
            }, { status: 500 }));
          }
        } else {
          console.error('Python script failed:', errorOutput);
          resolve(NextResponse.json({ 
            error: 'Analysis failed', 
            details: errorOutput 
          }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Load data using cloud-based retrieval
    const { load_data_from_cloud } = require('../../config.py');
    const insights = load_data_from_cloud('real_insights.json');
    
    if (!insights) {
      return NextResponse.json({ 
        error: 'No analysis data available' 
      }, { status: 404 });
    }

    realInsights = insights;
    
    return NextResponse.json({
      success: true,
      data: insights,
      summary: insights.summary,
      marketsAnalyzed: insights.marketAnalysis?.length || 0,
      providersAnalyzed: insights.providerNetworks?.length || 0
    });

  } catch (error) {
    console.error('Error loading analysis data:', error);
    return NextResponse.json({ 
      error: 'Failed to load analysis data' 
    }, { status: 500 });
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