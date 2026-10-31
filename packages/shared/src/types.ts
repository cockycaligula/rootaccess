/** Shared domain types used by both the API and the web dashboard. */

export type AqiCategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

/** Where a given day sits relative to Diwali. */
export type DiwaliPhase = 'normal' | 'before' | 'during' | 'after';

export interface Neighborhood {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
}

export interface Weather {
  tempC: number;
  humidity: number;
  windSpeed: number; // m/s
  rainMm: number;
  mixingHeightM: number; // planetary boundary layer height
}

/** Exogenous conditions for a day (observed or forecast). */
export interface DayConditions {
  weather: Weather;
  trafficIndex: number; // 1.0 = typical city-wide traffic
  fireCount: number; // satellite-detected farm fires upwind (NASA FIRMS style)
}

export interface DailyObservation extends DayConditions {
  date: string; // YYYY-MM-DD
  neighborhoodId: string;
  pm25: number; // 24h mean, µg/m³
  aqi: number;
  category: AqiCategory;
}

/** A single explanation factor: multiplicative effect on PM2.5, in percent vs. average conditions. */
export interface Driver {
  key: string;
  label: string;
  impactPct: number;
}

export interface ForecastPoint extends DayConditions {
  date: string;
  pm25: number;
  pm25Low: number;
  pm25High: number;
  aqi: number;
  aqiLow: number;
  aqiHigh: number;
  category: AqiCategory;
  phase: DiwaliPhase;
  daysFromDiwali: number;
  drivers: Driver[];
}

export interface NeighborhoodForecast {
  neighborhood: Neighborhood;
  issuedOn: string;
  points: ForecastPoint[];
}

export interface NeighborhoodSummary extends Neighborhood {
  latest: DailyObservation | null;
  today: ForecastPoint | null;
}

export interface PhaseOutlook {
  phase: Exclude<DiwaliPhase, 'normal'>;
  from: string;
  to: string;
  avgPm25: number;
  avgAqi: number;
  peakAqi: number;
  category: AqiCategory;
  source: 'observed' | 'forecast' | 'mixed';
}

export interface DiwaliOutlook {
  neighborhoodId: string;
  diwaliDate: string;
  phases: PhaseOutlook[];
}

export interface FeatureWeight {
  key: string;
  label: string;
  group: string;
  weight: number; // standardized coefficient
}

export interface EvaluationMetrics {
  from: string;
  to: string;
  rows: number;
  mae: number;
  rmse: number;
  r2: number;
  persistenceMae: number;
  persistenceRmse: number;
  diwaliWindowMae: number;
  diwaliWindowPersistenceMae: number;
}

export interface ModelInfo {
  algorithm: string;
  trainedAt: string;
  trainRows: number;
  residualStdLog: number;
  evaluation: EvaluationMetrics | null;
  features: FeatureWeight[];
}

export interface Meta {
  today: string;
  lastObserved: string;
  diwaliDate: string;
  daysToDiwali: number;
  phase: DiwaliPhase;
  dataSource: string;
  horizonDays: number;
}

export interface InterventionScenario {
  fireworksReductionPct: number; // 0..100
  trafficReductionPct: number; // 0..60
  stubbleReductionPct: number; // 0..100
  artificialRain: boolean;
}

export interface SimulationResult {
  neighborhoodId: string;
  scenario: InterventionScenario;
  baseline: ForecastPoint[];
  simulated: ForecastPoint[];
  diwaliPeakBaselineAqi: number;
  diwaliPeakSimulatedAqi: number;
  diwaliPeakPm25Saved: number;
  avgPm25SavedPct: number;
}

