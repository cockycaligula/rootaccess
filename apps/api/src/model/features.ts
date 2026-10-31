import { dayOfYear, daysFromDiwali, type DayConditions } from '@airsense/shared';

export type FeatureGroup =
  | 'persistence'
  | 'stagnation'
  | 'moisture'
  | 'traffic'
  | 'fires'
  | 'season'
  | 'diwali'
  | 'local';

export const GROUP_LABELS: Record<FeatureGroup, string> = {
  persistence: 'Recent pollution build-up',
  stagnation: 'Wind & mixing height (stagnation)',
  moisture: 'Humidity, rain & temperature',
  traffic: 'Traffic load',
  fires: 'Stubble burning (fire counts)',
  season: 'Seasonal pattern',
  diwali: 'Diwali fireworks & festivities',
  local: 'Neighborhood baseline',
};

export interface FeatureSpec {
  key: string;
  label: string;
  group: FeatureGroup;
}

export const FEATURES: FeatureSpec[] = [
  { key: 'lag1', label: 'log PM2.5 yesterday', group: 'persistence' },
  { key: 'lag2', label: 'log PM2.5 two days ago', group: 'persistence' },
  { key: 'lag7', label: 'log PM2.5 7-day mean', group: 'persistence' },
  { key: 'logWind', label: 'log wind speed', group: 'stagnation' },
  { key: 'logMix', label: 'log mixing height', group: 'stagnation' },
  { key: 'humidity', label: 'relative humidity', group: 'moisture' },
  { key: 'rain', label: 'rain > 2 mm', group: 'moisture' },
  { key: 'temp', label: 'temperature', group: 'moisture' },
  { key: 'traffic', label: 'traffic index', group: 'traffic' },
  { key: 'fires', label: 'log upwind fire count', group: 'fires' },
  { key: 'fireWind', label: 'fires × low wind', group: 'fires' },
  { key: 'seasonCos', label: 'season (cos)', group: 'season' },
  { key: 'seasonSin', label: 'season (sin)', group: 'season' },
  { key: 'preFestive', label: 'pre-Diwali week', group: 'diwali' },
  { key: 'diwaliEve', label: 'Diwali eve', group: 'diwali' },
  { key: 'diwaliDay', label: 'Diwali night', group: 'diwali' },
  { key: 'diwaliNext', label: 'day after Diwali', group: 'diwali' },
  { key: 'diwaliPlus2', label: '2 days after Diwali', group: 'diwali' },
  { key: 'diwaliDayUplift', label: 'Diwali night × local fireworks history', group: 'diwali' },
  { key: 'diwaliNextUplift', label: 'day after × local fireworks history', group: 'diwali' },
  { key: 'diwaliDayWind', label: 'Diwali night × low wind', group: 'diwali' },
  { key: 'baseline', label: 'neighborhood mean log PM2.5', group: 'local' },
];

/** Per-neighborhood context learned from history (target encoding). */
export interface NeighborhoodContext {
  baseline: number; // mean log PM2.5
  diwaliUplift: number; // mean log-ratio of Diwali-night PM2.5 vs. the preceding week
}

/** Minimum number of past days needed to build a feature row. */
export const MIN_HISTORY = 7;

/**
 * Build the feature vector for predicting log PM2.5 on `date`.
 * @param pastLogs log PM2.5 of previous days, most recent last (length ≥ MIN_HISTORY)
 */
export function buildFeatures(
  date: string,
  pastLogs: number[],
  cond: DayConditions,
  ctx: NeighborhoodContext,
): number[] {
  const n = pastLogs.length;
  const lag1 = pastLogs[n - 1];
  const lag2 = pastLogs[n - 2];
  let lag7 = 0;
  for (let i = n - 7; i < n; i++) lag7 += pastLogs[i] / 7;

  const w = cond.weather;
  const logWind = Math.log(w.windSpeed + 0.5);
  const calm = -logWind;
  const fires = Math.log1p(cond.fireCount);
  const angle = (2 * Math.PI * dayOfYear(date)) / 365;
  const off = daysFromDiwali(date);
  const d0 = off === 0 ? 1 : 0;
  const d1 = off === 1 ? 1 : 0;

  return [
    lag1,
    lag2,
    lag7,
    logWind,
    Math.log(w.mixingHeightM),
    w.humidity / 100,
    w.rainMm > 2 ? 1 : 0,
    w.tempC,
    cond.trafficIndex,
    fires,
    fires * calm,
    Math.cos(angle),
    Math.sin(angle),
    off >= -10 && off <= -2 ? 1 : 0,
    off === -1 ? 1 : 0,
    d0,
    d1,
    off === 2 ? 1 : 0,
    d0 * ctx.diwaliUplift,
    d1 * ctx.diwaliUplift,
    d0 * calm,
    ctx.baseline,
  ];
}
