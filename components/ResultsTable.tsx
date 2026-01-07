import React from 'react';
import { AnalysisSummary } from '../types';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface ResultsTableProps {
  data: AnalysisSummary[];
  thetaRms: number;
  theoreticalTheta: number;
  onSave?: () => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data, thetaRms, theoreticalTheta, onSave }) => {
  
  // Calculate match percentage
  // Avoid division by zero
  const matchPercentage = theoreticalTheta > 0 
    ? Math.max(0, 100 - (Math.abs(thetaRms - theoreticalTheta) / theoreticalTheta) * 100)
    : 0;

  return (
    <div className="space-y-8">
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg border border-indigo-500/30">
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Experimental θ RMS</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{thetaRms.toExponential(3)}</span>
            <span className="text-gray-400">rad</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Root Mean Square of all points</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-purple-500/30">
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Highland Theoretical θ</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-200">{theoreticalTheta.toExponential(3)}</span>
            <span className="text-gray-400">rad</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Based on material properties</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-green-500/30">
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Theory Match</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${matchPercentage > 90 ? 'text-green-400' : matchPercentage > 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                {matchPercentage.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Agreement with Highland formula</p>
        </div>

        {/* Action Card */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col justify-between items-start">
             <div>
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Session Actions</h3>
                <p className="mt-1 text-xs text-gray-500">Save run for comparison.</p>
             </div>
             {onSave && (
                <button 
                    onClick={onSave}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                </button>
             )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h4 className="text-sm font-bold text-gray-300 mb-4">Beam Width Evolution: Exp vs Theory</h4>
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="distance" label={{ value: 'Distance L (mm)', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} tick={{fill: '#9ca3af'}} />
                    <YAxis label={{ value: 'Sigma (mm)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} tick={{fill: '#9ca3af'}} />
                    <ChartTooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        formatter={(value: number, name: string) => [value.toFixed(3), name]}
                    />
                    <Legend />
                    <Bar dataKey="sigmaCorrected" name="σ Corrected (Exp)" fill="#34d399" barSize={40} fillOpacity={0.8} />
                    <Line type="monotone" dataKey="theoreticalSigma" name="Highland Theory" stroke="#a78bfa" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
        <div className="mt-2 text-center text-xs text-gray-500">
            The corrected experimental sigma should follow the linear Highland Theoretical prediction if the scattering is purely multiple Coulomb scattering.
        </div>
      </div>

      {/* Detailed Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">L (mm)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-blue-400 uppercase tracking-wider">σ Air (mm)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-pink-400 uppercase tracking-wider">σ Mat (mm)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-green-400 uppercase tracking-wider group cursor-help relative">
                <span className="border-b border-dashed border-green-500">σ Corrected</span>
              </th>
               <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-purple-400 uppercase tracking-wider">σ Theory</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-purple-400 uppercase tracking-wider">θ (rad)</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {data.map((row) => (
              <tr key={row.sampleId} className="hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{row.distance}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-300 font-mono">{row.sigmaAir.toFixed(3)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-pink-300 font-mono">{row.sigmaMaterial.toFixed(3)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-300 font-bold font-mono">{row.sigmaCorrected.toFixed(3)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-300 font-mono italic">{row.theoreticalSigma.toFixed(3)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400 font-mono">{row.theta.toExponential(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;