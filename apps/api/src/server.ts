import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { SyntheticDataSource } from './data/synthetic.js';
import { createRouter } from './routes.js';
import { PredictionService } from './service.js';

const t0 = Date.now();
const source = new SyntheticDataSource(config.today, config.seed, config.historyStart);
const service = new PredictionService(source, {
  today: config.today,
  horizonDays: config.horizonDays,
  lambda: config.ridgeLambda,
}).init();
const ev = service.model().evaluation;
console.log(
  `[vaayuvision] model trained in ${Date.now() - t0} ms on ${service.model().trainRows} rows` +
    (ev ? ` | holdout MAE ${ev.mae.toFixed(1)} vs persistence ${ev.persistenceMae.toFixed(1)} µg/m³` : ''),
);

const app = express();
app.use(cors());
app.use('/api', createRouter(service));

// In production, serve the built dashboard from the same origin.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.listen(config.port, () => {
  console.log(`[vaayuvision] API on http://localhost:${config.port}/api (today=${config.today})`);
});
