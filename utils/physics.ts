import { RadialDataPoint, GaussianFitResult, Point, HighlandParams } from '../types';

// Constants
const SAMPLE_SIZE = 300; // Work on a resized canvas for performance

/**
 * Loads an image from a source URL and returns a hidden canvas context
 */
export const loadImageData = (src: string): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Scale down for performance if necessary, but keeping aspect ratio
      const scale = Math.min(1, SAMPLE_SIZE / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * STEP 3: Find the Centroid (Center of Mass)
 * We treat "darkness" as mass. 
 * Since radiochromic film gets darker with dose, we invert the pixel value.
 * Intensity = 255 - PixelValue (assuming grayscale)
 */
export const calculateCentroid = (imgData: ImageData): Point => {
  const { width, height, data } = imgData;
  let totalMass = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Convert RGB to grayscale brightness
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      // Invert: Darker = Higher Intensity/Dose
      const intensity = 255 - brightness;
      
      // Threshold to remove background noise (simple gate)
      if (intensity > 20) { 
        sumX += x * intensity;
        sumY += y * intensity;
        totalMass += intensity;
      }
    }
  }

  if (totalMass === 0) return { x: width / 2, y: height / 2 };

  return {
    x: sumX / totalMass,
    y: sumY / totalMass
  };
};

/**
 * STEP 4 & 5: Radial Average and Filtering
 * Generates an Intensity vs Radius profile.
 */
export const calculateRadialProfile = (
  imgData: ImageData, 
  centroid: Point,
  pixelToMm: number
): RadialDataPoint[] => {
  const { width, height, data } = imgData;
  const maxRadius = Math.sqrt(width * width + height * height) / 2;
  const bins = new Array(Math.ceil(maxRadius)).fill(0);
  const counts = new Array(Math.ceil(maxRadius)).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const intensity = 255 - brightness;

      const dx = x - centroid.x;
      const dy = y - centroid.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const binIdx = Math.floor(r);

      if (binIdx < bins.length) {
        bins[binIdx] += intensity;
        counts[binIdx]++;
      }
    }
  }

  // Average and convert to real units
  const profile: RadialDataPoint[] = [];
  for (let i = 0; i < bins.length; i++) {
    if (counts[i] > 0) {
      profile.push({
        radius: i * pixelToMm, // Convert pixels to mm
        intensity: bins[i] / counts[i]
      });
    }
  }
  
  return profile;
};

/**
 * STEP 6: Fit a Gaussian
 * I(r) = A * exp(-r^2 / 2*sigma^2)
 * Linearized: ln(I) = ln(A) - (1/(2*sigma^2)) * r^2
 * y = C + m * x
 * where y = ln(I), x = r^2, m = -1/(2*sigma^2)
 * sigma = sqrt(-1 / (2*m))
 */
export const fitGaussian = (profile: RadialDataPoint[]): number => {
  // 1. Find Peak
  let maxIntensity = 0;
  for (const p of profile) {
    if (p.intensity > maxIntensity) maxIntensity = p.intensity;
  }

  // 2. Filter data: Use top 60-70% of peak (Core only, ignore tails/noise)
  // Also avoid log(0)
  const thresholdHigh = maxIntensity * 0.95; // Ignore slight saturation/noise at very tip
  const thresholdLow = maxIntensity * 0.30; // Cut off tails below 30%

  const validPoints = profile.filter(p => 
    p.intensity < thresholdHigh && 
    p.intensity > thresholdLow && 
    p.radius > 0
  );

  if (validPoints.length < 5) return 0; // Not enough data

  // 3. Linear Regression on ln(I) vs r^2
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = validPoints.length;

  for (const p of validPoints) {
    const x = p.radius * p.radius;
    const y = Math.log(p.intensity);

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // slope m = -1 / (2 * sigma^2)
  // sigma^2 = -1 / (2 * m)
  // sigma = sqrt(-1 / (2 * m))
  
  if (slope >= 0) return 0; // Not a gaussian (points go up or flat)

  const sigma = Math.sqrt(-1 / (2 * slope));
  return sigma;
};

export const calculateFitCurve = (profile: RadialDataPoint[], sigma: number): RadialDataPoint[] => {
   // Find estimate A
   const maxIntensity = Math.max(...profile.map(p => p.intensity));
   
   return profile.map(p => ({
     ...p,
     fit: maxIntensity * Math.exp(-(p.radius * p.radius) / (2 * sigma * sigma))
   }));
};

export const getProcessedImageURL = (imgData: ImageData): string => {
  const canvas = document.createElement('canvas');
  canvas.width = imgData.width;
  canvas.height = imgData.height;
  const ctx = canvas.getContext('2d');
  if(!ctx) return '';
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}

/**
 * Calculates the theoretical scattering angle (RMS) using the Highland approximation.
 * Formula: theta_rms = (17.5 / (beta * p)) * sqrt(x / X0) * (1 + 0.038 * ln(x / X0))
 * 
 * @param thickness (x) in cm
 * @param radLength (X0) in cm
 * @param momentum (p) in MeV/c
 * @param beta (v/c)
 * @returns theta_rms in radians
 */
export const calculateHighlandTheta = (
  thickness: number, 
  radLength: number, 
  momentum: number, 
  beta: number
): number => {
  if (radLength <= 0 || momentum <= 0 || beta <= 0 || thickness <= 0) return 0;
  
  const lx = thickness / radLength; // x / X0
  
  // Constant 17.5 MeV
  const term1 = 17.5 / (beta * momentum);
  const term2 = Math.sqrt(lx);
  const term3 = 1 + 0.038 * Math.log(lx);

  const theta = term1 * term2 * term3;
  return theta > 0 ? theta : 0;
}