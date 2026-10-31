import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aqiCategory, daysFromDiwali, diwaliPhase, pm25ToAqi } from '@airsense/shared';
import { RidgeRegression } from '../src/model/ridge.js';
import { SyntheticDataSource } from '../src/data/synthetic.js';
import { PredictionService } from '../src/service.js';

test('pm25ToAqi follows CPCB breakpoints', () => {
  assert.equal(pm25ToAqi(0), 0);
  assert.equal(pm25ToAqi(30), 50);
  assert.equal(pm25ToAqi(60), 100);
  assert.equal(pm25ToAqi(90), 200);
  assert.equal(pm25ToAqi(250), 400);
  assert.equal(pm25ToAqi(900), 500);
  assert.equal(aqiCategory(pm25ToAqi(300)), 'Severe');
});

test('Diwali phases', () => {
  assert.equal(daysFromDiwali('2026-11-08'), 0);
  assert.equal(diwaliPhase(daysFromDiwali('2026-11-01')), 'before');
  assert.equal(diwaliPhase(daysFromDiwali('2026-11-09')), 'during');
  assert.equal(diwaliPhase(daysFromDiwali('2026-11-15')), 'after');
  assert.equal(diwaliPhase(daysFromDiwali('2026-06-01')), 'normal');
});

test('ridge regression recovers a linear relationship', () => {
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 200; i++) {
    const a = Math.sin(i);
    const b = Math.cos(i * 0.7);
    X.push([a, b]);
    y.push(3 + 2 * a - 1.5 * b);
  }
  const m = new RidgeRegression(1e-6).fit(X, y);
  assert.ok(Math.abs(m.predict([0.5, -0.2]) - (3 + 1 + 0.3)) < 1e-3);
});

test('model beats persistence and forecasts a Diwali spike', () => {
  const today = '2026-10-31';
  const source = new SyntheticDataSource(today, 42);
  const service = new PredictionService(source, { today, horizonDays: 21, lambda: 1 }).init();
  const ev = service.model().evaluation!;
  assert.ok(ev.mae < ev.persistenceMae, `model MAE ${ev.mae} should beat persistence ${ev.persistenceMae}`);

  const f = service.forecast('punjabi-bagh')!;
  const diwali = f.points.find((p) => p.daysFromDiwali === 0)!;
  const weekBefore = f.points.find((p) => p.daysFromDiwali === -5)!;
  assert.ok(diwali.pm25 > weekBefore.pm25, 'Diwali night should be worse than the week before');
  assert.equal(service.outlook('punjabi-bagh').phases.length, 3);
});
