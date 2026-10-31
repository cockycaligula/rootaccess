import type { AqiCategory } from './types.js';

/**
 * India National AQI (CPCB) breakpoints for 24-hour PM2.5 (µg/m³).
 * [concLow, concHigh, aqiLow, aqiHigh]
 */
const PM25_BREAKPOINTS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 30, 0, 50],
  [30, 60, 50, 100],
  [60, 90, 100, 200],
  [90, 120, 200, 300],
  [120, 250, 300, 400],
  [250, 500, 400, 500],
];

/** Convert a 24h PM2.5 concentration to the Indian AQI sub-index. */
export function pm25ToAqi(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 <= 0) return 0;
  for (const [cLo, cHi, aLo, aHi] of PM25_BREAKPOINTS) {
    if (pm25 <= cHi) {
      return Math.round(aLo + ((pm25 - cLo) * (aHi - aLo)) / (cHi - cLo));
    }
  }
  return 500;
}

export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export const AQI_COLORS: Record<AqiCategory, string> = {
  Good: '#55a84f',
  Satisfactory: '#a3c853',
  Moderate: '#fff833',
  Poor: '#f29c33',
  'Very Poor': '#e93f33',
  Severe: '#af2d24',
};

export const AQI_ADVICE: Record<AqiCategory, string> = {
  Good: 'Minimal impact. Enjoy outdoor activities.',
  Satisfactory: 'Minor breathing discomfort for sensitive people.',
  Moderate: 'Breathing discomfort for people with lung/heart disease, children and older adults.',
  Poor: 'Breathing discomfort for most people on prolonged exposure. Limit outdoor exertion.',
  'Very Poor': 'Respiratory illness on prolonged exposure. Avoid outdoor activity; use N95 masks.',
  Severe: 'Affects healthy people, serious impact on those with existing disease. Stay indoors, run air purifiers.',
};

export function aqiColor(aqi: number): string {
  return AQI_COLORS[aqiCategory(aqi)];
}
