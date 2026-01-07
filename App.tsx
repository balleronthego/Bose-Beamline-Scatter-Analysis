import React, { useState, useMemo } from 'react';
import { FilmSample, AnalysisSummary, AnalysisStep, SavedRun, HighlandParams } from './types';
import FilmAnalyzer from './components/FilmAnalyzer';
import ResultsTable from './components/ResultsTable';
import ComparisonView from './components/ComparisonView';
import { calculateHighlandTheta } from './utils/physics';

// Initialize 10 empty slots
const INITIAL_FILMS: FilmSample[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  distanceL: (i + 1) * 100, // Default increments of 100mm, user can change
  airImageSrc: null,
  airSigma: null,
  materialImageSrc: null,
  materialSigma: null
}));

export default function App() {
  // Config
  const [pixelToMm, setPixelToMm] = useState<number>(0.2); 
  const [currentTab, setCurrentTab] = useState<AnalysisStep>(AnalysisStep.SETUP);
  const [materialName, setMaterialName] = useState<string>("Unknown Material");
  
  // Physics Params for Highland
  const [highlandParams, setHighlandParams] = useState<HighlandParams>({
    thickness: 1.0, // cm
    density: 1.0, // g/cm^3
    radLength: 36.08, // cm (approx water/tissue as default)
    momentum: 150, // MeV/c
    beta: 0.5 // v/c
  });

  // Data
  const [films, setFilms] = useState<FilmSample[]>(INITIAL_FILMS);
  
  // Persistence state
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);

  // Handlers for updating state
  const updateDistance = (id: number, val: number) => {
    setFilms(prev => prev.map(f => f.id === id ? { ...f, distanceL: val } : f));
  };

  const handleImageUpload = (id: number, type: 'air' | 'material', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setFilms(prev => prev.map(f => {
        if (f.id !== id) return f;
        return type === 'air' 
          ? { ...f, airImageSrc: src } 
          : { ...f, materialImageSrc: src };
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAnalysisComplete = (id: number, type: 'air' | 'material', sigma: number) => {
    setFilms(prev => prev.map(f => {
      if (f.id !== id) return f;
      return type === 'air' 
        ? { ...f, airSigma: sigma }
        : { ...f, materialSigma: sigma };
    }));
  };

  // 1. Calculate Theoretical Theta based on inputs
  const theoreticalTheta = useMemo(() => {
    return calculateHighlandTheta(
      highlandParams.thickness,
      highlandParams.radLength,
      highlandParams.momentum,
      highlandParams.beta
    );
  }, [highlandParams]);

  // 2. Compute final results and include theoretical sigma for each point
  const results: AnalysisSummary[] = useMemo(() => {
    return films.map(f => {
      const sa = f.airSigma || 0;
      const sm = f.materialSigma || 0;
      // Formula: sigma_corrected = sqrt(sigma_mat^2 - sigma_air^2)
      const diffSq = (sm * sm) - (sa * sa);
      const sigmaCorrected = diffSq > 0 ? Math.sqrt(diffSq) : 0;
      
      return {
        sampleId: f.id,
        distance: f.distanceL,
        sigmaAir: sa,
        sigmaMaterial: sm,
        sigmaCorrected,
        theta: f.distanceL > 0 ? sigmaCorrected / f.distanceL : 0,
        theoreticalSigma: theoreticalTheta * f.distanceL
      };
    });
  }, [films, theoreticalTheta]);

  const thetaRms = useMemo(() => {
    const validThetas = results.map(r => r.theta).filter(t => t > 0);
    if (validThetas.length === 0) return 0;
    
    // Physics correction: Use Root Mean Square (RMS)
    const sumSquares = validThetas.reduce((sum, theta) => sum + (theta * theta), 0);
    return Math.sqrt(sumSquares / validThetas.length);
  }, [results]);

  const handleSaveRun = () => {
    const newRun: SavedRun = {
      id: Date.now().toString(),
      materialName: materialName,
      timestamp: Date.now(),
      results: results,
      thetaRms: thetaRms,
      highlandParams: { ...highlandParams },
      theoreticalTheta: theoreticalTheta
    };
    setSavedRuns(prev => [newRun, ...prev]);
    alert(`Run for "${materialName}" saved to Comparison history.`);
    setCurrentTab(AnalysisStep.COMPARISON);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg">σ</div>
            <h1 className="text-xl font-bold text-gray-100 tracking-tight">Bose Beamline Scatter Analysis</h1>
          </div>
          <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            {[AnalysisStep.SETUP, AnalysisStep.DATA_ENTRY, AnalysisStep.RESULTS, AnalysisStep.COMPARISON].map(step => (
              <button
                key={step}
                onClick={() => setCurrentTab(step)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  currentTab === step 
                    ? 'bg-gray-700 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {step === AnalysisStep.COMPARISON ? 'COMPARE' : step.replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* SETUP VIEW */}
        {currentTab === AnalysisStep.SETUP && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Column 1: Material & Physics */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                        Experiment & Physics
                    </h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Material Name</label>
                        <input 
                            type="text" 
                            value={materialName}
                            onChange={(e) => setMaterialName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., Lead Sheet 5mm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Thickness <span className="italic">x</span> (cm)</label>
                            <input 
                                type="number" step="0.01"
                                value={highlandParams.thickness}
                                onChange={(e) => setHighlandParams({...highlandParams, thickness: parseFloat(e.target.value)})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Density <span className="italic">ρ</span> (g/cm³)</label>
                            <input 
                                type="number" step="0.001"
                                value={highlandParams.density}
                                onChange={(e) => setHighlandParams({...highlandParams, density: parseFloat(e.target.value)})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Rad Length <span className="italic">X₀</span> (cm)</label>
                            <input 
                                type="number" step="0.01"
                                value={highlandParams.radLength}
                                onChange={(e) => setHighlandParams({...highlandParams, radLength: parseFloat(e.target.value)})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Momentum <span className="italic">p</span> (MeV/c)</label>
                            <input 
                                type="number" step="1"
                                value={highlandParams.momentum}
                                onChange={(e) => setHighlandParams({...highlandParams, momentum: parseFloat(e.target.value)})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Velocity <span className="italic">β</span> (v/c)</label>
                        <input 
                            type="number" step="0.001" max="1"
                            value={highlandParams.beta}
                            onChange={(e) => setHighlandParams({...highlandParams, beta: parseFloat(e.target.value)})}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none font-mono"
                        />
                    </div>
                    
                    <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded border border-gray-700/50">
                        Highland Constant: 17.5 MeV
                    </div>
                </div>

                {/* Column 2: Image Processing */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                            Image Analysis Config
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Scanner Resolution (mm per pixel)</label>
                            <input 
                                type="number" 
                                step="0.001"
                                value={pixelToMm}
                                onChange={(e) => setPixelToMm(parseFloat(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                            />
                        </div>

                        <div className="mt-6 bg-purple-900/20 border border-purple-900/50 p-4 rounded-lg">
                            <h3 className="text-purple-400 text-sm font-bold mb-2">How to interpret Scanner Resolution</h3>
                            <p className="text-sm text-gray-300 mb-2">Resolution is typically in DPI (Dots Per Inch). The mm/pixel value is:</p>
                            <code className="block bg-gray-900 p-2 rounded text-xs text-purple-200 mb-2 text-center">
                                mm/pixel = 25.4 / DPI
                            </code>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• 72 DPI ≈ 0.353 mm/px</li>
                                <li>• 150 DPI ≈ 0.169 mm/px</li>
                                <li>• 300 DPI ≈ 0.085 mm/px</li>
                                <li>• 600 DPI ≈ 0.042 mm/px</li>
                            </ul>
                        </div>
                    </div>

                    <button 
                        onClick={() => setCurrentTab(AnalysisStep.DATA_ENTRY)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors mt-auto"
                    >
                        Start Data Entry &rarr;
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* DATA ENTRY VIEW */}
        {currentTab === AnalysisStep.DATA_ENTRY && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                 <h2 className="text-2xl font-bold text-white">Film Analysis</h2>
                 <p className="text-gray-400 text-sm">Upload Air and Material scans for each distance.</p>
              </div>
              <button 
                onClick={() => setCurrentTab(AnalysisStep.RESULTS)}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
              >
                View Results &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {films.map((film) => (
                <div key={film.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="bg-gray-900/50 px-6 py-3 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="bg-gray-700 text-gray-300 text-xs font-bold px-2 py-1 rounded">FILM {film.id}</span>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-400">Distance L (mm):</label>
                            <input 
                                type="number" 
                                value={film.distanceL}
                                onChange={(e) => updateDistance(film.id, parseFloat(e.target.value))}
                                className="w-24 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white text-right"
                            />
                        </div>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* AIR COLUMN */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                             <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Baseline (Air)</h4>
                             <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-xs px-3 py-1 rounded text-white transition-colors">
                                Upload Scan
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(film.id, 'air', e.target.files[0])} />
                             </label>
                        </div>
                        {film.airImageSrc ? (
                            <FilmAnalyzer 
                                label="Air"
                                imageSrc={film.airImageSrc} 
                                pixelToMm={pixelToMm} 
                                onAnalysisComplete={(sigma) => handleAnalysisComplete(film.id, 'air', sigma)} 
                            />
                        ) : (
                            <div className="h-32 border-2 border-dashed border-gray-700 rounded flex items-center justify-center text-gray-600 text-sm">
                                No Image
                            </div>
                        )}
                    </div>

                    {/* MATERIAL COLUMN */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                             <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider">Material ({materialName})</h4>
                             <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-xs px-3 py-1 rounded text-white transition-colors">
                                Upload Scan
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(film.id, 'material', e.target.files[0])} />
                             </label>
                        </div>
                        {film.materialImageSrc ? (
                            <FilmAnalyzer 
                                label="Material"
                                imageSrc={film.materialImageSrc} 
                                pixelToMm={pixelToMm} 
                                onAnalysisComplete={(sigma) => handleAnalysisComplete(film.id, 'material', sigma)} 
                            />
                        ) : (
                            <div className="h-32 border-2 border-dashed border-gray-700 rounded flex items-center justify-center text-gray-600 text-sm">
                                No Image
                            </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS VIEW */}
        {currentTab === AnalysisStep.RESULTS && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Analysis Report: {materialName}</h2>
            <ResultsTable 
                data={results} 
                thetaRms={thetaRms} 
                theoreticalTheta={theoreticalTheta}
                onSave={handleSaveRun} 
            />
          </div>
        )}

        {/* COMPARISON VIEW */}
        {currentTab === AnalysisStep.COMPARISON && (
          <div className="space-y-6">
             <h2 className="text-2xl font-bold text-white">Multi-Material Comparison</h2>
             <ComparisonView savedRuns={savedRuns} />
          </div>
        )}

      </main>
    </div>
  );
}