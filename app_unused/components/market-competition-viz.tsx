'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

interface MarketCompetitionData {
  markets: MarketData[];
  total_markets_analyzed: number;
  summary: {
    high_risk_markets: number;
    medium_risk_markets: number;
    low_risk_markets: number;
  };
}

export default function MarketCompetitionViz() {
  const [data, setData] = useState<MarketCompetitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/market-competition');
      if (!response.ok) {
        throw new Error('Failed to fetch market competition data');
      }
      const marketData = await response.json();
      setData(marketData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High':
        return 'bg-red-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-black';
      case 'Low-Medium':
        return 'bg-orange-500 text-white';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getHHIInterpretation = (hhi: number) => {
    if (hhi > 2500) return 'Highly Concentrated';
    if (hhi > 1500) return 'Moderately Concentrated';
    if (hhi > 1000) return 'Somewhat Concentrated';
    return 'Competitive';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center text-red-400">
              <p className="text-lg font-semibold">Error Loading Market Data</p>
              <p className="text-sm mt-2">{error}</p>
              <button 
                onClick={fetchMarketData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center text-gray-400">
              <p>No market competition data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Total Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{data.total_markets_analyzed}</div>
            <p className="text-sm text-gray-400 mt-1">Markets Analyzed</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{data.summary.high_risk_markets}</div>
            <p className="text-sm text-gray-400 mt-1">Markets</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Medium Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">{data.summary.medium_risk_markets}</div>
            <p className="text-sm text-gray-400 mt-1">Markets</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Low Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{data.summary.low_risk_markets}</div>
            <p className="text-sm text-gray-400 mt-1">Markets</p>
          </CardContent>
        </Card>
      </div>

      {/* Market List */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Market Competition Analysis</CardTitle>
          <CardDescription className="text-gray-400">
            Top markets ranked by competition risk. HHI (Herfindahl-Hirschman Index) measures market concentration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.markets.map((market, index) => (
              <div 
                key={market.market}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-gray-800 ${
                  selectedMarket?.market === market.market 
                    ? 'bg-gray-800 border-blue-500' 
                    : 'bg-gray-900 border-gray-700'
                }`}
                onClick={() => setSelectedMarket(selectedMarket?.market === market.market ? null : market)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-500">#{index + 1}</span>
                    <h3 className="text-lg font-semibold text-white">{market.market}</h3>
                    <Badge className={getRiskColor(market.risk_level)}>
                      {market.risk_level} Risk
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{market.risk_score}</div>
                    <div className="text-sm text-gray-400">Risk Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-gray-400">HHI Score</div>
                    <div className="text-lg font-semibold text-white">{market.hhi.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{getHHIInterpretation(market.hhi)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Providers</div>
                    <div className="text-lg font-semibold text-white">{market.total_providers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Top Provider Share</div>
                    <div className="text-lg font-semibold text-white">{market.top_provider_share}%</div>
                    <div className="text-xs text-gray-500 truncate">{market.top_provider}</div>
                  </div>
                </div>

                {/* Provider Breakdown - Show when selected */}
                {selectedMarket?.market === market.market && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-md font-semibold text-white mb-3">Top Providers in {market.market}</h4>
                    <div className="space-y-2">
                      {market.providers.slice(0, 5).map((provider, idx) => (
                        <div key={provider.npi} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-mono text-gray-500">#{idx + 1}</span>
                            <div>
                              <div className="text-sm font-medium text-white">{provider.name}</div>
                              <div className="text-xs text-gray-400">{provider.specialty}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-white">{provider.market_share.toFixed(1)}%</div>
                            <div className="text-xs text-gray-400">{provider.total_claims.toLocaleString()} claims</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Level Definitions */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Risk Level Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge className="bg-red-500 text-white">High Risk</Badge>
                <span className="text-sm text-gray-300">HHI > 2500 or Top Provider > 50%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-yellow-500 text-black">Medium Risk</Badge>
                <span className="text-sm text-gray-300">HHI 1500-2500</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge className="bg-orange-500 text-white">Low-Medium Risk</Badge>
                <span className="text-sm text-gray-300">HHI 1000-1500</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-500 text-white">Low Risk</Badge>
                <span className="text-sm text-gray-300">HHI < 1000</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 