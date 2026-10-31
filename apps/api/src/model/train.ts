import {
  DIWALI_DATES,
  addDays,
  daysFromDiwali,
  diffDays,
  type DailyObservation,
  type EvaluationMetrics,
} from '@airsense/shared';
import type { AirQualityDataSource } from '../data/source.js';
import { MIN_HISTORY, buildFeatures, type NeighborhoodContext } from './features.js';
import { RidgeRegression } from './ridge.js';

const log = (v: number) => Math.log(Math.max(v, 1));

/** Learn per-neighborhood context (baseline and historical Diwali uplift) from data up to `until`. */
export function computeContext(obs: DailyObservation[], until: string): NeighborhoodContext {
  const train = obs.filter((o) => o.date <= until);
  const baseline = train.reduce((a, o) => a + log(o.pm25), 0) / Math.max(train.length, 1);

  const byDate = new Map(train.map((o) => [o.date, o.pm25]));
  const uplifts: number[] = [];
  for (const d of Object.values(DIWALI_DATES)) {
    const peak = byDate.get(d);
    if (peak === undefined) continue;
    const prior: number[] = [];
    for (let k = -10; k <= -3; k++) {
      const v = byDate.get(addDays(d, k));
      if (v !== undefined) prior.push(log(v));
    }
    if (prior.length < 4) continue;
    uplifts.push(log(peak) - prior.reduce((a, b) => a + b, 0) / prior.length);
  }
  const diwaliUplift = uplifts.length ? uplifts.reduce((a, b) => a + b, 0) / uplifts.length : 0.5;
  return { baseline, diwaliUplift };
}

export interface Row {
  x: number[];
  y: number; // log PM2.5
  date: string;
  neighborhoodId: string;
  lag1Pm25: number;
}

/** Build supervised rows (features → next-day log PM2.5) for one neighborhood within [from, to]. */
export function buildRows(obs: DailyObservation[], ctx: NeighborhoodContext, from: string, to: string): Row[] {
  const logs = obs.map((o) => log(o.pm25));
  const rows: Row[] = [];
  for (let i = MIN_HISTORY; i < obs.length; i++) {
    const o = obs[i];
    if (o.date < from || o.date > to) continue;
    // Require a contiguous history window.
    if (diffDays(o.date, obs[i - MIN_HISTORY].date) !== MIN_HISTORY) continue;
    rows.push({
      x: buildFeatures(o.date, logs.slice(i - MIN_HISTORY, i), o, ctx),
      y: logs[i],
      date: o.date,
      neighborhoodId: o.neighborhoodId,
      lag1Pm25: obs[i - 1].pm25,
    });
  }
  return rows;
}

export interface TrainResult {
  model: RidgeRegression;
  contexts: Map<string, NeighborhoodContext>;
  trainRows: number;
  residualStdLog: number;
}

export function train(source: AirQualityDataSource, until: string, lambda: number): TrainResult {
  const contexts = new Map<string, NeighborhoodContext>();
  const rows: Row[] = [];
  for (const n of source.neighborhoods()) {
    const obs = source.observations(n.id);
    const ctx = computeContext(obs, until);
    contexts.set(n.id, ctx);
    rows.push(...buildRows(obs, ctx, '0000-00-00', until));
  }
  const model = new RidgeRegression(lambda).fit(
    rows.map((r) => r.x),
    rows.map((r) => r.y),
  );
  const resid = rows.map((r) => r.y - model.predict(r.x));
  const residualStdLog = Math.sqrt(resid.reduce((a, e) => a + e * e, 0) / resid.length);
  return { model, contexts, trainRows: rows.length, residualStdLog };
}

function errorStats(pairs: Array<[number, number]>): { mae: number; rmse: number } {
  if (!pairs.length) return { mae: NaN, rmse: NaN };
  let ae = 0;
  let se = 0;
  for (const [pred, actual] of pairs) {
    ae += Math.abs(pred - actual);
    se += (pred - actual) ** 2;
  }
  return { mae: ae / pairs.length, rmse: Math.sqrt(se / pairs.length) };
}

/**
 * Time-based holdout: train strictly before `testFrom`, score one-day-ahead PM2.5
 * predictions on [testFrom, testTo] against a persistence ("tomorrow = today") baseline.
 */
export function evaluate(
  source: AirQualityDataSource,
  testFrom: string,
  testTo: string,
  lambda: number,
): { metrics: EvaluationMetrics; residualStdLog: number } {
  const trainEnd = addDays(testFrom, -1);
  const { model, contexts } = train(source, trainEnd, lambda);

  const rows: Row[] = [];
  for (const n of source.neighborhoods()) {
    rows.push(...buildRows(source.observations(n.id), contexts.get(n.id)!, testFrom, testTo));
  }
  const preds = rows.map((r) => model.predict(r.x));
  const actual = rows.map((r) => Math.exp(r.y));
  const predPm = preds.map((p) => Math.exp(p));

  const all = errorStats(predPm.map((p, i) => [p, actual[i]]));
  const persist = errorStats(rows.map((r, i) => [r.lag1Pm25, actual[i]]));
  const diwaliIdx = rows.map((r, i) => (Math.abs(daysFromDiwali(r.date)) <= 3 ? i : -1)).filter((i) => i >= 0);
  const diwali = errorStats(diwaliIdx.map((i) => [predPm[i], actual[i]]));
  const diwaliPersist = errorStats(diwaliIdx.map((i) => [rows[i].lag1Pm25, actual[i]]));

  const meanActual = actual.reduce((a, b) => a + b, 0) / actual.length;
  const ssTot = actual.reduce((a, v) => a + (v - meanActual) ** 2, 0);
  const ssRes = actual.reduce((a, v, i) => a + (v - predPm[i]) ** 2, 0);

  const logResid = rows.map((r, i) => r.y - preds[i]);
  const residualStdLog = Math.sqrt(logResid.reduce((a, e) => a + e * e, 0) / logResid.length);

  return {
    metrics: {
      from: testFrom,
      to: testTo,
      rows: rows.length,
      mae: all.mae,
      rmse: all.rmse,
      r2: 1 - ssRes / ssTot,
      persistenceMae: persist.mae,
      persistenceRmse: persist.rmse,
      diwaliWindowMae: diwali.mae,
      diwaliWindowPersistenceMae: diwaliPersist.mae,
    },
    residualStdLog,
  };
}
