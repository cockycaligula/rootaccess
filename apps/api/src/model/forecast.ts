import {
  addDays,
  aqiCategory,
  daysFromDiwali,
  diwaliPhase,
  pm25ToAqi,
  type Driver,
  type ForecastPoint,
} from '@airsense/shared';
import type { AirQualityDataSource } from '../data/source.js';
import { FEATURES, GROUP_LABELS, MIN_HISTORY, buildFeatures, type FeatureGroup, type NeighborhoodContext } from './features.js';
import type { RidgeRegression } from './ridge.js';

const Z80 = 1.2816; // two-sided 80% interval

/**
 * Groups that only describe autocorrelation / identity. They are excluded from the
 * drivers list because "it was polluted yesterday" doesn't explain *why*.
 */
const NON_CAUSAL: ReadonlySet<FeatureGroup> = new Set(['persistence', 'local']);

/** Aggregate per-feature contributions (log space) into human-readable causal drivers. */
export function explain(model: RidgeRegression, x: number[], top = 5): Driver[] {
  const contrib = model.contributions(x);
  const byGroup = new Map<FeatureGroup, number>();
  FEATURES.forEach((f, j) => {
    if (!NON_CAUSAL.has(f.group)) byGroup.set(f.group, (byGroup.get(f.group) ?? 0) + contrib[j]);
  });
  return [...byGroup.entries()]
    .map(([key, v]) => ({ key, label: GROUP_LABELS[key], impactPct: Math.round((Math.exp(v) - 1) * 1000) / 10 }))
    .sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct))
    .slice(0, top);
}

/**
 * Recursive multi-day forecast: each day's prediction feeds the lag features of the next.
 * Uncertainty grows with lead time.
 */
export function forecastNeighborhood(
  model: RidgeRegression,
  source: AirQualityDataSource,
  neighborhoodId: string,
  ctx: NeighborhoodContext,
  issuedOn: string,
  days: number,
  residualStdLog: number,
): ForecastPoint[] {
  const obs = source.observations(neighborhoodId);
  if (obs.length < MIN_HISTORY) return [];
  const logs = obs.slice(-MIN_HISTORY).map((o) => Math.log(Math.max(o.pm25, 1)));

  const points: ForecastPoint[] = [];
  for (let h = 0; h < days; h++) {
    const date = addDays(issuedOn, h);
    const cond = source.conditionsForecast(neighborhoodId, date, issuedOn);
    const x = buildFeatures(date, logs, cond, ctx);
    const yLog = model.predict(x);
    const sigma = residualStdLog * Math.sqrt(1 + 0.35 * h);

    const pm25 = Math.exp(yLog);
    const pm25Low = Math.exp(yLog - Z80 * sigma);
    const pm25High = Math.exp(yLog + Z80 * sigma);
    const aqi = pm25ToAqi(pm25);
    const off = daysFromDiwali(date);

    points.push({
      date,
      ...cond,
      pm25: round1(pm25),
      pm25Low: round1(pm25Low),
      pm25High: round1(pm25High),
      aqi,
      aqiLow: pm25ToAqi(pm25Low),
      aqiHigh: pm25ToAqi(pm25High),
      category: aqiCategory(aqi),
      phase: diwaliPhase(off),
      daysFromDiwali: off,
      drivers: explain(model, x),
    });
    logs.push(yLog);
    logs.shift();
  }
  return points;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
