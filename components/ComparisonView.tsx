import React, { useState, useMemo } from 'react';
import { SavedRun } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface ComparisonViewProps {
  savedRuns: SavedRun[];
}

const COLORS = [
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#34d399', // emerald-400
  '#a78bfa', // violet-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#22d3ee', // cyan-400
  '#e879f9', // fuchsia-400
];

const ComparisonView: React.FC<ComparisonViewProps> = ({ savedRuns }) => {
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());

  const toggleRun = (id: string) => {
    const newSet = new Set(selectedRunIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRunIds(newSet);
  };

  const chartData = useMemo(() => {
    if (selectedRunIds.size === 0) return [];

    const selectedRuns = savedRuns.filter(r => selectedRunIds.has(r.id));
    const allDistances = new Set<number>();
    selectedRuns.forEach(run => {
      run.results.forEach(r => allDistances.add(r.distance));
    });
    
    const sortedDistances = Array.from(allDistances).sort((a, b) => a - b);

    return sortedDistances.map(dist => {
      const point: any = { distance: dist };
      selectedRuns.forEach(run => {
        const match = run.results.find(r => r.distance === dist);
        if (match) {
          // Plot strictly experimental sigmaCorrected values
          point[run.id] = match.sigmaCorrected;
        }
      });
      return point;
    });
  }, [savedRuns, selectedRunIds]);

  if (savedRuns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-700 rounded-lg text-gray-500">
        <p>No saved analysis runs found.</p>
        <p className="text-sm mt-2">Go to the Results tab and click "Save" to compare materials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar: Select Runs */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 h-fit">
          <h3 className="text-gray-300 font-bold mb-4 text-sm uppercase">Select Materials</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {savedRuns.map((run, idx) => (
              <label 
                key={run.id} 
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors border ${
                  selectedRunIds.has(run.id) 
                    ? 'bg-gray-700 border-indigo-500/50 shadow-inner' 
                    : 'bg-gray-900/50 border-transparent hover:bg-gray-700'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={selectedRunIds.has(run.id)}
                  onChange={() => toggleRun(run.id)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-200 truncate">{run.materialName}</div>
                  <div className="text-[10px] text-gray-500">{new Date(run.timestamp).toLocaleDateString()}</div>
                </div>
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Main Content: Experimental Comparison Chart */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
            <h4 className="text-lg font-bold text-gray-200 mb-6 flex items-center justify-between">
              <span>Material Comparison (Experimental σ)</span>
              <span className="text-xs font-normal text-gray-500 italic">No Theoretical Lines Shown</span>
            </h4>
            
            {selectedRunIds.size > 0 ? (
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="distance" 
                      label={{ value: 'Distance L (mm)', position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 12 }} 
                      tick={{fill: '#9ca3af', fontSize: 11}} 
                    />
                    <YAxis 
                      label={{ value: 'σ Corrected (mm)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }} 
                      tick={{fill: '#9ca3af', fontSize: 11}} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      labelFormatter={(label) => `Distance: ${label} mm`}
                      formatter={(value: number, name: string) => {
                         const run = savedRuns.find(r => r.id === name);
                         return [value.toFixed(3) + ' mm', run ? run.materialName : name];
                      }}
                    />
                    <Legend 
                        formatter={(value) => {
                            const run = savedRuns.find(r => r.id === value);
                            return <span className="text-gray-300 text-sm">{run ? run.materialName : value}</span>;
                        }}
                    />
                    {savedRuns.filter(r => selectedRunIds.has(r.id)).map((run, idx) => {
                       const globalIdx = savedRuns.findIndex(r => r.id === run.id);
                       return (
                         <Line 
                           key={run.id}
                           type="monotone" 
                           dataKey={run.id} 
                           stroke={COLORS[globalIdx % COLORS.length]} 
                           strokeWidth={3}
                           dot={{ r: 4, strokeWidth: 2 }}
                           activeDot={{ r: 6, strokeWidth: 0 }}
                         />
                       );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-900/50 rounded border border-dashed border-gray-700">
                Select materials from the left sidebar to plot experimental curves.
              </div>
            )}
          </div>

          {/* Comparative Stats Table */}
          {selectedRunIds.size > 0 && (
            <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Material</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-purple-400 uppercase tracking-wider">Exp. θ RMS (rad)</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-green-400 uppercase tracking-wider">Max σ (mm)</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {savedRuns.filter(r => selectedRunIds.has(r.id)).map(run => {
                    const maxSigma = Math.max(...run.results.map(res => res.sigmaCorrected));
                    return (
                      <tr key={run.id} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[savedRuns.findIndex(r => r.id === run.id) % COLORS.length] }} />
                                <span className="text-sm font-bold text-gray-200">{run.materialName}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-300 font-mono">
                          {run.thetaRms.toExponential(4)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-300 font-mono">
                          {maxSigma.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;