import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { loadImageData, calculateCentroid, calculateRadialProfile, fitGaussian, calculateFitCurve } from '../utils/physics';
import { RadialDataPoint } from '../types';

interface FilmAnalyzerProps {
  imageSrc: string;
  pixelToMm: number;
  onAnalysisComplete: (sigma: number) => void;
  label: string;
}

const FilmAnalyzer: React.FC<FilmAnalyzerProps> = ({ imageSrc, pixelToMm, onAnalysisComplete, label }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sigma, setSigma] = useState<number>(0);
  const [chartData, setChartData] = useState<RadialDataPoint[]>([]);

  useEffect(() => {
    let active = true;

    const analyze = async () => {
      setLoading(true);
      setError(null);
      try {
        // Step 1: Load
        const imgData = await loadImageData(imageSrc);
        
        // Step 2 & 3: Centroid
        const centroid = calculateCentroid(imgData);
        
        // Step 4: Radial Profile
        const rawProfile = calculateRadialProfile(imgData, centroid, pixelToMm);
        
        // Step 6: Fit Gaussian
        const calculatedSigma = fitGaussian(rawProfile);
        
        // Generate Fit Curve for visual verification
        const dataWithFit = calculateFitCurve(rawProfile, calculatedSigma);
        
        if (active) {
          setSigma(calculatedSigma);
          setChartData(dataWithFit);
          onAnalysisComplete(calculatedSigma);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Failed to process image");
          setLoading(false);
        }
      }
    };

    if (imageSrc) {
      analyze();
    } else {
        setLoading(false);
    }

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, pixelToMm]);

  if (loading) return <div className="text-sm text-gray-500 animate-pulse">Analyzing physics...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!imageSrc) return <div className="text-sm text-gray-400 italic">No image uploaded</div>;

  return (
    <div className="flex flex-col gap-2 mt-2 p-2 border border-gray-700 rounded bg-gray-900">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold uppercase text-gray-400">{label} Fit</span>
        <span className="text-sm font-mono text-green-400">σ = {sigma.toFixed(3)} mm</span>
      </div>
      
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="radius" hide />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', fontSize: '12px' }}
                itemStyle={{ color: '#e5e7eb' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [value.toFixed(1), 'Intensity']}
                labelFormatter={(label) => `r: ${Number(label).toFixed(1)} mm`}
            />
            {/* Raw Data */}
            <Line type="monotone" dataKey="intensity" stroke="#60a5fa" dot={false} strokeWidth={1.5} />
            {/* Gaussian Fit */}
            <Line type="monotone" dataKey="fit" stroke="#34d399" dot={false} strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] text-center text-gray-500">
        Blue: Measured Profile | Green: Gaussian Fit (Core)
      </div>
    </div>
  );
};

export default FilmAnalyzer;