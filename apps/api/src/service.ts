import {
  DIWALI_DATES,
  addDays,
  aqiCategory,
  currentDiwali,
  daysFromDiwali,
  diffDays,
  diwaliPhase,
  pm25ToAqi,
  type DailyObservation,
  type DiwaliOutlook,
  type InterventionScenario,
  type Meta,
  type ModelInfo,
  type NeighborhoodForecast,
  type NeighborhoodSummary,
  type PhaseOutlook,
  type SimulationResult,
} from '@vaayuvision/shared';
import type { AirQualityDataSource } from './data/source.js';
import { FEATURES } from './model/features.js';
import { forecastNeighborhood } from './model/forecast.js';
import { evaluate, train, type TrainResult } from './model/train.js';

export interface ServiceOptions {
  today: string;
  horizonDays: number;
  lambda: number;
}

/** Trains the model at startup and serves cached forecasts / outlooks. */
export class PredictionService {
  private trained!: TrainResult;
  private info!: ModelInfo;
  private forecasts = new Map<string, NeighborhoodForecast>();
  readonly lastObserved: string;

  constructor(
    private readonly source: AirQualityDataSource,
    private readonly opts: ServiceOptions,
  ) {
    this.lastObserved = addDays(opts.today, -1);
  }

  init(): this {
    // 1) Honest evaluation on the most recent fully-observed Diwali season.
    const evalSeason = Object.values(DIWALI_DATES)
      .filter((d) => addDays(d, 30) <= this.lastObserved)
      .sort()
      .pop();
    const evaluation = evalSeason
      ? evaluate(this.source, addDays(evalSeason, -35), addDays(evalSeason, 30), this.opts.lambda)
      : null;

    // 2) Production model trained on everything observed so far.
    this.trained = train(this.source, this.lastObserved, this.opts.lambda);
    const residualStdLog = evaluation?.residualStdLog ?? this.trained.residualStdLog;

    this.info = {
      algorithm: 'Ridge regression on log PM2.5 (lags + weather + traffic + fires + Diwali calendar), recursive multi-day',
      trainedAt: new Date().toISOString(),
      trainRows: this.trained.trainRows,
      residualStdLog,
      evaluation: evaluation?.metrics ?? null,
      features: FEATURES.map((f, j) => ({ ...f, weight: this.trained.model.coef[j] })).sort(
        (a, b) => Math.abs(b.weight) - Math.abs(a.weight),
      ),
    };

    for (const n of this.source.neighborhoods()) {
      this.forecasts.set(n.id, {
        neighborhood: n,
        issuedOn: this.opts.today,
        points: forecastNeighborhood(
          this.trained.model,
          this.source,
          n.id,
          this.trained.contexts.get(n.id)!,
          this.opts.today,
          this.opts.horizonDays,
          residualStdLog,
        ),
      });
    }
    return this;
  }

  meta(): Meta {
    const diwaliDate = currentDiwali(this.opts.today);
    return {
      today: this.opts.today,
      lastObserved: this.lastObserved,
      diwaliDate,
      daysToDiwali: diffDays(diwaliDate, this.opts.today),
      phase: diwaliPhase(daysFromDiwali(this.opts.today)),
      dataSource: this.source.name,
      horizonDays: this.opts.horizonDays,
    };
  }

  model(): ModelInfo {
    return this.info;
  }

  neighborhoods(): NeighborhoodSummary[] {
    return this.source.neighborhoods().map((n) => {
      const obs = this.source.observations(n.id);
      return { ...n, latest: obs[obs.length - 1] ?? null, today: this.forecasts.get(n.id)?.points[0] ?? null };
    });
  }

  exists(id: string): boolean {
    return this.forecasts.has(id);
  }

  history(id: string, days: number): DailyObservation[] {
    return this.source.observations(id).slice(-days);
  }

  forecast(id: string, days = this.opts.horizonDays): NeighborhoodForecast | undefined {
    const f = this.forecasts.get(id);
    return f && { ...f, points: f.points.slice(0, days) };
  }

  allForecasts(days = this.opts.horizonDays): NeighborhoodForecast[] {
    return [...this.forecasts.keys()].map((id) => this.forecast(id, days)!);
  }

  simulateAll(scenario: InterventionScenario): NeighborhoodForecast[] {
    return this.source.neighborhoods().map((n) => ({
      neighborhood: n,
      issuedOn: this.opts.today,
      points: forecastNeighborhood(
        this.trained.model,
        this.source,
        n.id,
        this.trained.contexts.get(n.id)!,
        this.opts.today,
        this.opts.horizonDays,
        this.info.residualStdLog,
        scenario,
      ),
    }));
  }

  simulate(id: string, scenario: InterventionScenario): SimulationResult | undefined {
    const baseFc = this.forecasts.get(id);
    const ctx = this.trained.contexts.get(id);
    if (!baseFc || !ctx) return undefined;
    const baseline = baseFc.points;
    const simulated = forecastNeighborhood(
      this.trained.model,
      this.source,
      id,
      ctx,
      this.opts.today,
      this.opts.horizonDays,
      this.info.residualStdLog,
      scenario,
    );
    const diwaliWindow = baseline
      .map((_, i) => i)
      .filter((i) => baseline[i].daysFromDiwali === 0 || baseline[i].daysFromDiwali === 1);
    const idxs = diwaliWindow.length ? diwaliWindow : baseline.map((_, i) => i);
    const basePeakIdx = idxs.reduce((best, i) => (baseline[i].pm25 > baseline[best].pm25 ? i : best), idxs[0]);
    const baseSum = baseline.reduce((s, p) => s + p.pm25, 0);
    const simSum = simulated.reduce((s, p) => s + p.pm25, 0);

    return {
      neighborhoodId: id,
      scenario,
      baseline,
      simulated,
      diwaliPeakBaselineAqi: baseline[basePeakIdx].aqi,
      diwaliPeakSimulatedAqi: simulated[basePeakIdx].aqi,
      diwaliPeakPm25Saved: Math.round((baseline[basePeakIdx].pm25 - simulated[basePeakIdx].pm25) * 10) / 10,
      avgPm25SavedPct: baseSum > 0 ? Math.round(((baseSum - simSum) / baseSum) * 1000) / 10 : 0,
    };
  }

  /** Before / during / after Diwali summary for the current season, blending observations and forecasts. */
  outlook(id: string, diwaliDate = currentDiwali(this.opts.today)): DiwaliOutlook {
    const observed = new Map(this.source.observations(id).map((o) => [o.date, o.pm25]));
    const forecast = new Map((this.forecasts.get(id)?.points ?? []).map((p) => [p.date, p.pm25]));

    const windows: Array<[PhaseOutlook['phase'], number, number]> = [
      ['before', -7, -1],
      ['during', 0, 1],
      ['after', 2, 7],
    ];
    const phases: PhaseOutlook[] = [];
    for (const [phase, a, b] of windows) {
      const values: number[] = [];
      let nObs = 0;
      let nFc = 0;
      for (let k = a; k <= b; k++) {
        const d = addDays(diwaliDate, k);
        const o = observed.get(d);
        const f = forecast.get(d);
        if (o !== undefined) {
          values.push(o);
          nObs++;
        } else if (f !== undefined) {
          values.push(f);
          nFc++;
        }
      }
      if (!values.length) continue;
      const avgPm25 = values.reduce((s, v) => s + v, 0) / values.length;
      const avgAqi = pm25ToAqi(avgPm25);
      phases.push({
        phase,
        from: addDays(diwaliDate, a),
        to: addDays(diwaliDate, b),
        avgPm25: Math.round(avgPm25 * 10) / 10,
        avgAqi,
        peakAqi: Math.max(...values.map(pm25ToAqi)),
        category: aqiCategory(avgAqi),
        source: nFc === 0 ? 'observed' : nObs === 0 ? 'forecast' : 'mixed',
      });
    }
    return { neighborhoodId: id, diwaliDate, phases };
  }
}
