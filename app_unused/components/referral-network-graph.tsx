'use client';
import React, { useRef, useEffect } from 'react';
// @ts-ignore
import * as d3 from 'd3';

interface Node {
  id: string;
  revenue: number;
  risk: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  volume: number;
}

// Mock data structure (replace with real data from outputs/real_insights.json or API)
const mockNodes: Node[] = [
  { id: 'Dr. Smith', revenue: 500000, risk: 'low' },
  { id: 'Dr. Lee', revenue: 350000, risk: 'medium' },
  { id: 'Dr. Patel', revenue: 200000, risk: 'high' },
  { id: 'Dr. Jones', revenue: 90000, risk: 'medium' },
  { id: 'Dr. Kim', revenue: 40000, risk: 'low' },
];

const mockLinks: Link[] = [
  { source: 'Dr. Smith', target: 'Dr. Lee', volume: 120 },
  { source: 'Dr. Lee', target: 'Dr. Patel', volume: 80 },
  { source: 'Dr. Patel', target: 'Dr. Jones', volume: 40 },
  { source: 'Dr. Smith', target: 'Dr. Kim', volume: 30 },
  { source: 'Dr. Kim', target: 'Dr. Jones', volume: 20 },
];

const riskColor = (risk: string) => {
  if (risk === 'high') return '#ef4444';
  if (risk === 'medium') return '#f59e42';
  return '#2563eb';
};

// Filter out placeholder nodes
const invalidNames = [
  'Unknown Provider', 'Name Not Found', 'Unknown', 'nan', 'nan, nan', 'N/A', 'Provider, Unknown', 'Unknown, Provider'
];
const filteredNodes = mockNodes.filter(n => n.id && !invalidNames.some(inv => n.id.toLowerCase().includes(inv.toLowerCase())));
const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
const filteredLinks = mockLinks.filter(l => filteredNodeIds.has(l.source as string) && filteredNodeIds.has(l.target as string));

export default function ReferralNetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // D3 force-directed graph setup
    const width = 600;
    const height = 400;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (filteredNodes.length === 0) return;

    const simulation = d3.forceSimulation<Node>(filteredNodes)
      .force('link', d3.forceLink<Node, Link>(filteredLinks).id((d: Node) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw links (edges)
    const link = svg.append('g')
      .attr('stroke', '#aaa')
      .selectAll('line')
      .data(filteredLinks)
      .enter().append('line')
      .attr('stroke-width', (d: Link) => Math.max(2, d.volume / 30))
      .attr('stroke', d => d.volume > 50 ? '#22c55e' : '#ef4444')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke', '#f59e42');
        svg.append('text')
          .attr('id', 'tooltip')
          .attr('x', (d.source as Node).x || 0)
          .attr('y', (d.source as Node).y || 0)
          .attr('fill', '#fff')
          .attr('font-size', 14)
          .attr('text-anchor', 'middle')
          .text(`Referrals: ${d.volume}`);
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke', d => d.volume > 50 ? '#22c55e' : '#ef4444');
        svg.select('#tooltip').remove();
      });

    // Draw nodes
    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .selectAll('circle')
      .data(filteredNodes)
      .enter().append('circle')
      .attr('r', (d: Node) => 18 + Math.log(d.revenue) / 2)
      .attr('fill', (d: Node) => riskColor(d.risk))
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node labels
    svg.append('g')
      .selectAll('text')
      .data(filteredNodes)
      .enter().append('text')
      .attr('x', 10)
      .attr('y', 3)
      .attr('font-size', 12)
      .attr('fill', '#fff')
      .text((d: Node) => d.id);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as Node).x)
        .attr('y1', (d: any) => (d.source as Node).y)
        .attr('x2', (d: any) => (d.target as Node).x)
        .attr('y2', (d: any) => (d.target as Node).y);
      node
        .attr('cx', (d: Node) => d.x || 0)
        .attr('cy', (d: Node) => d.y || 0);
      svg.selectAll('text')
        .attr('x', (d: any) => (d.x || 0) + 20)
        .attr('y', (d: any) => d.y || 0);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x || 0;
      d.fy = d.y || 0;
    }
    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg mt-8 text-white">
      <h2 className="text-2xl font-bold mb-2">Referral Flow Patterns</h2>
      <div className="mb-2 text-gray-300">Flows represent patient referrals between provider types in the last 30 days.</div>
      <svg ref={svgRef} width={600} height={400} className="border rounded bg-gray-800" />
      <div className="flex gap-6 mt-4 items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-2 rounded bg-green-500"></span>
          <span className="text-sm">High Volume (In-Network)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-2 rounded bg-red-500"></span>
          <span className="text-sm">Low Volume (Out-of-Network)</span>
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-400">Left: Referring Providers (PCPs). Right: Receiving Providers (Specialists/Services).</div>
      {filteredNodes.length === 0 && (
        <div className="mt-6 text-center text-red-400 font-semibold">No named providers found for this market.</div>
      )}
    </div>
  );
} 