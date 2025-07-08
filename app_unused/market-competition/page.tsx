import MarketCompetitionViz from '../components/market-competition-viz';

export default function MarketCompetitionPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Market Competition Analysis</h1>
          <p className="text-gray-400">
            Analyze market concentration and competition risk across healthcare markets using HHI (Herfindahl-Hirschman Index).
          </p>
        </div>
        
        <MarketCompetitionViz />
      </div>
    </div>
  );
} 