import { Router, type Request, type Response } from 'express';
import type { PredictionService } from './service.js';

function intParam(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
}

export function createRouter(service: PredictionService): Router {
  const r = Router();
  const horizon = service.meta().horizonDays;

  r.get('/health', (_req, res) => res.json({ ok: true }));

  r.get('/meta', (_req, res) => res.json(service.meta()));

  r.get('/model', (_req, res) => res.json(service.model()));

  r.get('/neighborhoods', (_req, res) => res.json(service.neighborhoods()));

  const requireNeighborhood = (req: Request, res: Response): string | null => {
    const id = req.params.id;
    if (!service.exists(id)) {
      res.status(404).json({ error: `Unknown neighborhood '${id}'` });
      return null;
    }
    return id;
  };

  r.get('/neighborhoods/:id/history', (req, res) => {
    const id = requireNeighborhood(req, res);
    if (id) res.json(service.history(id, intParam(req.query.days, 60, 1, 2000)));
  });

  r.get('/neighborhoods/:id/outlook', (req, res) => {
    const id = requireNeighborhood(req, res);
    if (id) res.json(service.outlook(id));
  });

  r.get('/forecast', (req, res) => {
    res.json(service.allForecasts(intParam(req.query.days, horizon, 1, horizon)));
  });

  r.get('/forecast/:id', (req, res) => {
    const id = requireNeighborhood(req, res);
    if (id) res.json(service.forecast(id, intParam(req.query.days, horizon, 1, horizon)));
  });

  r.get('/simulate', (req, res) => {
    const scenario = {
      fireworksReductionPct: intParam(req.query.fireworks, 0, 0, 100),
      trafficReductionPct: intParam(req.query.traffic, 0, 0, 60),
      stubbleReductionPct: intParam(req.query.stubble, 0, 0, 100),
      artificialRain: req.query.rain === '1' || req.query.rain === 'true',
    };
    res.json(service.simulateAll(scenario));
  });

  r.get('/simulate/:id', (req, res) => {
    const id = requireNeighborhood(req, res);
    if (!id) return;
    const scenario = {
      fireworksReductionPct: intParam(req.query.fireworks, 0, 0, 100),
      trafficReductionPct: intParam(req.query.traffic, 0, 0, 60),
      stubbleReductionPct: intParam(req.query.stubble, 0, 0, 100),
      artificialRain: req.query.rain === '1' || req.query.rain === 'true',
    };
    res.json(service.simulate(id, scenario));
  });

  return r;
}
