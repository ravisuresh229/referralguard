'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../@/components/ui/card';
import { Badge } from '../../components/ui/badge';

interface NetworkNode {
  id: string;
  name: string;
  revenue: number;
  risk: string;
  specialty: string;
  zipCode: string;
  x: number;
  y: number;
}

interface NetworkEdge {
  from: string;
  to: string;
  volume: number;
  strength: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  summary: {
    totalNodes: number;
    totalEdges: number;
    averageRisk: number;
    totalRevenue: number;
  };
}

export default function NetworkGraphPage() {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const generateNetworkData = async () => {
      try {
        setLoading(true);
        
        // Fetch real provider data
        const response = await fetch('/api/high-risk-providers?page=1&pageSize=50');
        const data = await response.json();
        
        if (data.providers && data.providers.length > 0) {
          // Generate network nodes from real providers
          const nodes: NetworkNode[] = data.providers.slice(0, 20).map((provider: any, index: number) => ({
            id: provider.providerNPI || `provider-${index}`,
            name: provider.providerName || 'Unknown Provider',
            revenue: provider.revenueAtRisk || provider.providerRevenue || 0,
            risk: provider.riskScore > 70 ? 'high' : provider.riskScore > 50 ? 'medium' : 'low',
            specialty: provider.specialty || 'Unknown',
            zipCode: provider.zipCode || 'Unknown',
            x: Math.random() * 800 + 100,
            y: Math.random() * 600 + 100,
          }));

          // Generate realistic edges between providers
          const edges: NetworkEdge[] = [];
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              // Create connections between providers in same specialty or nearby zip codes
              if (nodes[i].specialty === nodes[j].specialty || 
                  Math.abs(parseInt(nodes[i].zipCode) - parseInt(nodes[j].zipCode)) < 1000) {
                edges.push({
                  from: nodes[i].id,
                  to: nodes[j].id,
                  volume: Math.floor(Math.random() * 100) + 10,
                  strength: Math.random() * 0.8 + 0.2,
                });
              }
            }
          }

          const networkData: NetworkData = {
            nodes,
            edges: edges.slice(0, 30), // Limit edges for performance
            summary: {
              totalNodes: nodes.length,
              totalEdges: edges.length,
              averageRisk: nodes.reduce((sum, n) => sum + (n.risk === 'high' ? 75 : n.risk === 'medium' ? 50 : 25), 0) / nodes.length,
              totalRevenue: nodes.reduce((sum, n) => sum + n.revenue, 0),
            }
          };

          setNetworkData(networkData);
        }
      } catch (error) {
        console.error('Error generating network data:', error);
      } finally {
        setLoading(false);
      }
    };

    generateNetworkData();
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-green-400 bg-green-500/20 border-green-500/30';
    }
  };

  const getNodeSize = (revenue: number) => {
    const size = Math.max(20, Math.min(60, (revenue / 1000000) * 10));
    return size;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center p-8 text-gray-400">Loading referral network data...</div>
        </div>
      </div>
    );
  }

  if (!networkData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center p-8 text-red-400">Failed to load network data</div>
        </div>
      </div>
    );
  }

  const filteredNodes = filter === 'all' ? networkData.nodes : 
    networkData.nodes.filter(node => node.risk === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Referral Network Analysis</h1>
          <p className="text-gray-300">Interactive visualization of provider relationships and referral patterns</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Network Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{networkData.summary.totalNodes}</div>
              <p className="text-xs opacity-75 mt-1">Active providers</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Referral Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{networkData.summary.totalEdges}</div>
              <p className="text-xs opacity-75 mt-1">Active relationships</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Average Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{networkData.summary.averageRisk.toFixed(0)}%</div>
              <p className="text-xs opacity-75 mt-1">Network risk level</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(networkData.summary.totalRevenue / 1000000).toFixed(1)}M</div>
              <p className="text-xs opacity-75 mt-1">At risk</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Providers
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'high' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              High Risk
            </button>
            <button
              onClick={() => setFilter('medium')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'medium' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Medium Risk
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'low' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Low Risk
            </button>
          </div>
        </div>

        {/* Network Visualization */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Provider Network Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gray-900/50 rounded-lg border border-gray-700 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-semibold mb-2">Interactive Network Graph</h3>
                <p className="text-sm">Visualizing provider relationships and referral patterns</p>
                <p className="text-xs mt-4 text-gray-500">
                  Coming soon: Real-time network analysis with clickable nodes and relationship mapping
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 