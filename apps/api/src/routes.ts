import { Router, type Request, type Response } from 'express';
import type { ReportIssueType } from '@vaayuvision/shared';
import { SupabaseCommunityStore } from './data/supabase.js';
import type { PredictionService } from './service.js';

function intParam(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
}

const VALID_ISSUES = new Set<ReportIssueType>([
  'firecrackers',
  'stubble_smoke',
  'traffic_fumes',
  'industrial_dust',
  'waste_burning',
]);

export function createRouter(service: PredictionService): Router {
  const r = Router();
  const horizon = service.meta().horizonDays;
  const community = new SupabaseCommunityStore();

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

  r.get('/community', async (req, res) => {
    const ward = typeof req.query.neighborhoodId === 'string' && req.query.neighborhoodId ? req.query.neighborhoodId : undefined;
    res.json(await community.getFeed(ward));
  });

  r.post('/community/reports', async (req, res) => {
    const body = req.body ?? {};
    const neighborhoodId = String(body.neighborhoodId ?? '');
    if (!service.exists(neighborhoodId)) {
      res.status(400).json({ error: 'Invalid neighborhoodId' });
      return;
    }
    const issueType: ReportIssueType = VALID_ISSUES.has(body.issueType) ? body.issueType : 'firecrackers';
    const severity = body.severity === 'low' || body.severity === 'high' ? body.severity : 'medium';
    const note = String(body.note ?? '').trim().slice(0, 280);
    if (!note) {
      res.status(400).json({ error: 'Report note is required' });
      return;
    }
    const reporterName = String(body.reporterName ?? 'Patiala Resident').trim().slice(0, 60) || 'Patiala Resident';
    const created = await community.addReport({ neighborhoodId, issueType, severity, note, reporterName });
    res.status(201).json(created);
  });

  r.post('/community/subscriptions', async (req, res) => {
    const body = req.body ?? {};
    const neighborhoodId = String(body.neighborhoodId ?? '');
    if (!service.exists(neighborhoodId)) {
      res.status(400).json({ error: 'Invalid neighborhoodId' });
      return;
    }
    const contact = String(body.contact ?? '').trim().slice(0, 120);
    if (!contact) {
      res.status(400).json({ error: 'Contact email or phone is required' });
      return;
    }
    const organization = String(body.organization ?? 'Patiala Citizen').trim().slice(0, 80) || 'Patiala Citizen';
    const thresholdAqi = intParam(body.thresholdAqi, 300, 100, 500);
    const created = await community.addSubscription({ neighborhoodId, contact, organization, thresholdAqi });
    res.status(201).json(created);
  });

  return r;
}
