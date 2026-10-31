/**
 * Offline evaluation report: trains on data before each past Diwali season
 * and scores one-day-ahead forecasts on that season.
 *
 *   npm run evaluate
 */
import { DIWALI_DATES, addDays } from '@vaayuvision/shared';
import { config } from '../config.js';
import { SyntheticDataSource } from '../data/synthetic.js';
import { evaluate } from '../model/train.js';

const source = new SyntheticDataSource(config.today, config.seed, config.historyStart);
const lastObserved = addDays(config.today, -1);

const rows = Object.values(DIWALI_DATES)
  .filter((d) => d >= '2023-01-01' && addDays(d, 30) <= lastObserved)
  .map((d) => {
    const { metrics: m } = evaluate(source, addDays(d, -35), addDays(d, 30), config.ridgeLambda);
    const f = (v: number) => v.toFixed(1);
    return {
      diwali: d,
      rows: m.rows,
      'MAE model': f(m.mae),
      'MAE persist.': f(m.persistenceMae),
      'RMSE model': f(m.rmse),
      'RMSE persist.': f(m.persistenceRmse),
      R2: m.r2.toFixed(3),
      'Diwali±3d MAE model': f(m.diwaliWindowMae),
      'Diwali±3d MAE persist.': f(m.diwaliWindowPersistenceMae),
    };
  });

console.log(`Data source: ${source.name}; PM2.5 errors in µg/m³ (one-day-ahead, season = Diwali −35d … +30d)`);
console.table(rows);
