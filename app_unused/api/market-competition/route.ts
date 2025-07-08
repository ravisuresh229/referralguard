import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Provider {
  npi: string;
  name: string;
  specialty: string;
  market: string;
  market_share: number;
  total_claims: number;
  revenue: number;
}

interface MarketData {
  market: string;
  providers: Provider[];
  total_providers: number;
  hhi: number;
  risk_level: string;
  risk_score: number;
  top_provider: string;
  top_provider_share: number;
}

export async function GET() {
  try {
    // Read the Medicare data
    const dataPath = path.join(process.cwd(), 'data', 'Medicare Physician & Other Practitioners - by Provider and Service', '2023', 'MUP_PHY_R25_P05_V20_D23_Prov_Svc.csv');
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ 
        error: 'Data file not found',
        message: 'Please ensure the Medicare data file is available'
      }, { status: 404 });
    }

    const csvData = fs.readFileSync(dataPath, 'utf-8');
    const lines = csvData.split('\n').slice(1); // Skip header
    
    const providers: Provider[] = [];
    const marketMap = new Map<string, Provider[]>();

    // Parse CSV data
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 8) continue;

      const npi = columns[0]?.trim();
      const name = columns[1]?.trim();
      const specialty = columns[2]?.trim();
      const market = columns[3]?.trim();
      const claims = parseInt(columns[4]?.trim() || '0');
      const revenue = parseFloat(columns[5]?.trim() || '0');

      // Skip providers with placeholder names
      if (!name || name === 'Name Not Found' || name.includes('Unknown') || name.length < 3) {
        continue;
      }

      if (npi && name && specialty && market && claims > 0) {
        const provider: Provider = {
          npi,
          name,
          specialty,
          market,
          total_claims: claims,
          revenue,
          market_share: 0 // Will be calculated below
        };

        providers.push(provider);
        
        if (!marketMap.has(market)) {
          marketMap.set(market, []);
        }
        marketMap.get(market)!.push(provider);
      }
    }

    // Calculate market shares and analyze markets
    const marketAnalysis: MarketData[] = [];

    for (const [market, marketProviders] of marketMap) {
      if (marketProviders.length < 3) continue; // Only analyze markets with 3+ providers

      const totalClaims = marketProviders.reduce((sum, p) => sum + p.total_claims, 0);
      
      // Calculate market shares
      marketProviders.forEach(provider => {
        provider.market_share = (provider.total_claims / totalClaims) * 100;
      });

      // Sort by market share
      marketProviders.sort((a, b) => b.market_share - a.market_share);

      // Calculate HHI
      const hhi = marketProviders.reduce((sum, provider) => {
        return sum + Math.pow(provider.market_share, 2);
      }, 0);

      // Determine risk level based on HHI and market concentration
      let risk_level = 'Low';
      let risk_score = 0;

      if (hhi > 2500) {
        risk_level = 'High';
        risk_score = 85 + Math.random() * 15; // 85-100
      } else if (hhi > 1500) {
        risk_level = 'Medium';
        risk_score = 60 + Math.random() * 25; // 60-85
      } else if (hhi > 1000) {
        risk_level = 'Low-Medium';
        risk_score = 40 + Math.random() * 20; // 40-60
      } else {
        risk_level = 'Low';
        risk_score = 20 + Math.random() * 20; // 20-40
      }

      // Additional risk factors
      const topProviderShare = marketProviders[0]?.market_share || 0;
      if (topProviderShare > 50) {
        risk_level = 'High';
        risk_score = Math.max(risk_score, 90);
      } else if (topProviderShare > 30) {
        risk_level = risk_level === 'Low' ? 'Low-Medium' : risk_level;
        risk_score = Math.max(risk_score, 50);
      }

      marketAnalysis.push({
        market,
        providers: marketProviders.slice(0, 10), // Top 10 providers
        total_providers: marketProviders.length,
        hhi: Math.round(hhi),
        risk_level,
        risk_score: Math.round(risk_score),
        top_provider: marketProviders[0]?.name || 'Unknown',
        top_provider_share: Math.round(topProviderShare * 100) / 100
      });
    }

    // Sort by risk score (highest first)
    marketAnalysis.sort((a, b) => b.risk_score - a.risk_score);

    return NextResponse.json({
      markets: marketAnalysis.slice(0, 20), // Top 20 highest risk markets
      total_markets_analyzed: marketAnalysis.length,
      summary: {
        high_risk_markets: marketAnalysis.filter(m => m.risk_level === 'High').length,
        medium_risk_markets: marketAnalysis.filter(m => m.risk_level === 'Medium').length,
        low_risk_markets: marketAnalysis.filter(m => m.risk_level === 'Low').length
      }
    });

  } catch (error) {
    console.error('Error processing market competition data:', error);
    return NextResponse.json({ 
      error: 'Failed to process market competition data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 