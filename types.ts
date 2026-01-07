export interface Point {
  x: number;
  y: number;
}

export interface RadialDataPoint {
  radius: number;
  intensity: number;
  fit?: number;
}

export interface GaussianFitResult {
  sigma: number; // in mm
  amplitude: number;
  rSquared: number;
  centroid: Point;
  points: RadialDataPoint[];
}

export interface FilmSample {
  id: number;
  distanceL: number; // Distance from scattering material (mm)
  
  // Air (Baseline) Data
  airImageSrc: string | null;
  airSigma: number | null; // in mm
  
  // Material Data
  materialImageSrc: string | null;
  materialSigma: number | null; // in mm
}

export interface AnalysisSummary {
  sampleId: number;
  distance: number;
  sigmaAir: number;
  sigmaMaterial: number;
  sigmaCorrected: number; // sqrt(mat^2 - air^2)
  theta: number; // sigmaCorrected / L
  theoreticalSigma: number; // theta_highland * L
}

export interface HighlandParams {
  thickness: number; // x (cm)
  density: number; // rho (g/cm^3)
  radLength: number; // X0 (g/cm^2 or cm)
  momentum: number; // p (MeV/c)
  beta: number; // v/c
}

export interface SavedRun {
  id: string;
  materialName: string;
  timestamp: number;
  results: AnalysisSummary[];
  thetaRms: number;
  highlandParams: HighlandParams;
  theoreticalTheta: number;
}

export enum AnalysisStep {
  SETUP = 'SETUP',
  DATA_ENTRY = 'DATA_ENTRY',
  RESULTS = 'RESULTS',
  COMPARISON = 'COMPARISON'
}