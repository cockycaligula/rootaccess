import {
  addDays,
  aqiCategory,
  dateRange,
  dayOfYear,
  daysFromDiwali,
  diffDays,
  parseISODate,
  pm25ToAqi,
  type DailyObservation,
  type DayConditions,
  type Neighborhood,
} from '@vaayuvision/shared';
import type { AirQualityDataSource } from './source.js';
import { PATIALA_NEIGHBORHOODS, type NeighborhoodProfile } from './neighborhoods.js';
import { clamp, gaussian, hashSeed, mulberry32 } from './rng.js';

interface SimRow {
  date: string;
  pm25: number;
  cond: DayConditions;
}

/** Extra particulate load from fireworks, by day offset from Diwali (µg/m³ before scaling). */
const FIREWORKS_LOAD: Record<number, number> = { [-1]: 25, 0: 150, 1: 110, 2: 30 };

/**
 * Seeded physical-ish simulation of daily PM2.5 for Patiala neighborhoods.
 *
 * PM2.5 = persistence + base × season × stagnation(wind, mixing height) × traffic
 *         × stubble smoke × rain washout + Diwali fireworks spike.
 *
 * It exists so the full pipeline (training, evaluation, forecasting, UI) can be
 * demoed offline, and it is replaceable by real feeds through AirQualityDataSource.
 */
export class SyntheticDataSource implements AirQualityDataSource {
  readonly name = 'Synthetic Patiala-Malwa simulation (seeded)';
  private readonly rows = new Map<string, SimRow[]>();
  private readonly start: string;
  readonly lastObserved: string;

  constructor(
    readonly today: string,
    private readonly seed = 42,
    start = '2022-01-01',
    private readonly profiles: NeighborhoodProfile[] = PATIALA_NEIGHBORHOODS,
  ) {
    this.start = start;
    this.lastObserved = addDays(today, -1);
    this.generate(addDays(today, 45));
  }

  neighborhoods(): Neighborhood[] {
    return this.profiles.map(({ id, name, zone, lat, lng }) => ({ id, name, zone, lat, lng }));
  }

  observations(neighborhoodId: string): DailyObservation[] {
    const rows = this.rows.get(neighborhoodId);
    if (!rows) return [];
    const n = diffDays(this.lastObserved, this.start) + 1;
    return rows.slice(0, n).map((r) => {
      const aqi = pm25ToAqi(r.pm25);
      return { date: r.date, neighborhoodId, pm25: r.pm25, aqi, category: aqiCategory(aqi), ...r.cond };
    });
  }

  conditionsForecast(neighborhoodId: string, date: string, issuedOn: string): DayConditions {
    const rows = this.rows.get(neighborhoodId);
    const idx = diffDays(date, this.start);
    if (!rows || idx < 0 || idx >= rows.length) throw new Error(`No conditions for ${neighborhoodId} on ${date}`);
    const truth = rows[idx].cond;
    const lead = Math.max(1, diffDays(date, issuedOn) + 1);
    // Forecast skill decays with lead time: add deterministic noise that grows with lead.
    const r = mulberry32(hashSeed(`${neighborhoodId}|${date}|${issuedOn}`) ^ this.seed);
    const k = Math.sqrt(lead);
    const w = truth.weather;
    return {
      weather: {
        tempC: w.tempC + gaussian(r) * 0.5 * k,
        humidity: clamp(w.humidity + gaussian(r) * 2.5 * k, 5, 100),
        windSpeed: clamp(w.windSpeed * (1 + 0.07 * k * gaussian(r)), 0.2, 12),
        rainMm: Math.max(0, w.rainMm * (1 + 0.2 * k * gaussian(r))),
        mixingHeightM: clamp(w.mixingHeightM * (1 + 0.05 * k * gaussian(r)), 100, 4000),
      },
      trafficIndex: truth.trafficIndex * (1 + 0.02 * gaussian(r)),
      fireCount: Math.max(0, Math.round(truth.fireCount * (1 + 0.08 * k * gaussian(r)))),
    };
  }

  private generate(end: string): void {
    const dates = dateRange(this.start, end);
    const rand = mulberry32(this.seed);

    // City-wide weather & upwind fires.
    let windAnom = 0;
    const city = dates.map((date) => {
      const doy = dayOfYear(date);
      const year = Number(date.slice(0, 4));
      const monsoon = Math.exp(-(((doy - 215) / 35) ** 2));
      const tempC = 24 + 10 * Math.sin((2 * Math.PI * (doy - 105)) / 365) + gaussian(rand) * 1.5;
      windAnom = 0.7 * windAnom + 0.5 * gaussian(rand);
      const windSpeed = clamp(2.6 + 1.0 * Math.sin((2 * Math.PI * (doy - 80)) / 365) + windAnom, 0.3, 9);
      const raining = rand() < 0.04 + 0.45 * monsoon + (doy < 60 ? 0.03 : 0);
      const rainMm = raining ? -Math.log(1 - rand()) * (6 + 14 * monsoon) : 0;
      const humidity = clamp(45 + 35 * monsoon + (tempC < 18 ? 15 : 0) + (rainMm > 0 ? 10 : 0) + gaussian(rand) * 6, 10, 100);
      const mixingHeightM = clamp(150 + 60 * (tempC - 8) + 80 * windSpeed + gaussian(rand) * 100, 120, 3500);
      const yearFire = 0.6 + 0.8 * mulberry32(hashSeed(`fire${year}`) ^ this.seed)();
      const stubble = Math.exp(-(((doy - 308) / 13) ** 2));
      const fireCount = Math.max(0, Math.round(2200 * yearFire * stubble + gaussian(rand) * 60 * stubble + rand() * 15));
      return { tempC, humidity, windSpeed, rainMm, mixingHeightM, fireCount };
    });

    for (const p of this.profiles) {
      const r = mulberry32(this.seed ^ hashSeed(p.id));
      let prev = p.base;
      const rows: SimRow[] = dates.map((date, i) => {
        const c = city[i];
        const doy = dayOfYear(date);
        const off = daysFromDiwali(date);
        const dow = parseISODate(date).getUTCDay();

        const weather = {
          tempC: c.tempC + gaussian(r) * 0.6,
          humidity: clamp(c.humidity + gaussian(r) * 3, 5, 100),
          windSpeed: clamp(c.windSpeed * (1 + 0.08 * gaussian(r)), 0.2, 10),
          rainMm: c.rainMm,
          mixingHeightM: clamp(c.mixingHeightM * (1 + 0.05 * gaussian(r)), 100, 4000),
        };

        const weekday = dow === 0 ? 0.8 : dow === 6 ? 0.92 : 1;
        const festive =
          off >= -10 && off <= -1 ? 1 + 0.18 * (1 - (Math.abs(off) - 1) / 10) : off === 0 ? 0.85 : off === 1 ? 0.8 : 1;
        const trafficIndex = clamp(p.traffic * weekday * festive * (1 + 0.05 * gaussian(r)), 0.2, 2.5);

        const seasonal = 1.05 + 0.75 * Math.cos((2 * Math.PI * (doy - 355)) / 365);
        const stagnation = Math.sqrt(2.5 / (weather.windSpeed + 0.5)) * Math.pow(700 / weather.mixingHeightM, 0.35);
        const smoke = 1 + (p.stubbleExposure * c.fireCount) / 1500;
        const washout = weather.rainMm > 2 ? 0.6 : 1;
        const target = 0.7 * p.base * seasonal * stagnation * (0.55 + 0.45 * trafficIndex) * smoke * washout;

        const state = 0.5 * prev + 0.5 * target;
        const fireworks = (FIREWORKS_LOAD[off] ?? 0) * p.fireworks * stagnation;
        const pm25 = clamp(state * Math.exp(0.1 * gaussian(r)) + fireworks, 5, 999);
        prev = pm25;

        return { date, pm25: Math.round(pm25 * 10) / 10, cond: { weather, trafficIndex, fireCount: c.fireCount } };
      });
      this.rows.set(p.id, rows);
    }
  }
}
