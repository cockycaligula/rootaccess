import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aqiCategory, daysFromDiwali, diwaliPhase, pm25ToAqi } from '@vaayuvision/shared';
import { buildHealthSystemPrompt, generateAssistantResponse } from '../src/assistant.js';
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

  const f = service.forecast('adalat-bazar')!;
  const diwali = f.points.find((p) => p.daysFromDiwali === 0)!;
  const weekBefore = f.points.find((p) => p.daysFromDiwali === -5)!;
  assert.ok(diwali.pm25 > weekBefore.pm25, 'Diwali night should be worse than the week before');
  assert.equal(service.outlook('adalat-bazar').phases.length, 3);

  const sim = service.simulate('adalat-bazar', {
    fireworksReductionPct: 60,
    trafficReductionPct: 30,
    stubbleReductionPct: 50,
    artificialRain: true,
  })!;
  assert.ok(sim.diwaliPeakPm25Saved > 50, 'Policy intervention should cut Diwali peak PM2.5 significantly');
  assert.ok(sim.avgPm25SavedPct > 10, 'Policy intervention should reduce 21-day average PM2.5');
});

test('health assistant injects PM2.5, PM10, NO2 & conditions and applies stricter thresholds for Asthma', async () => {
  const ctx = {
    wardId: 'thapar-prem-nagar',
    wardName: 'Thapar / Prem Nagar',
    zone: 'North West',
    date: '2026-10-31',
    aqi: 135,
    category: 'Moderate' as const,
    pm25: 70.5,
    pm10: 118.2,
    no2: 52.4,
    windSpeed: 1.6,
    mixingHeightM: 410,
    humidity: 62,
    daysFromDiwali: -8,
  };

  const asthmaProfile = { name: 'Rohan', conditions: ['Asthma' as const] };
  const prompt = buildHealthSystemPrompt(asthmaProfile, ctx);
  assert.ok(prompt.includes('Rohan'), 'System prompt includes user name');
  assert.ok(prompt.includes('Asthma'), 'System prompt includes Asthma condition');
  assert.ok(prompt.includes('70.5 µg/m³'), 'System prompt includes PM2.5');
  assert.ok(prompt.includes('118.2 µg/m³'), 'System prompt includes PM10');
  assert.ok(prompt.includes('52.4 µg/m³'), 'System prompt includes NO2');

  const asthmaRun = await generateAssistantResponse({
    message: 'Can I go for a run today?',
    profile: asthmaProfile,
    context: ctx,
  });
  const genericRun = await generateAssistantResponse({
    message: 'Can I go for a run today?',
    profile: { name: '', conditions: [] },
    context: ctx,
  });

  // At AQI 135, Asthma (ceiling <= 100) is cautioned against running outdoors, while Generic Safe Mode (<= 150) allows afternoon exercise.
  assert.equal(asthmaRun.safetyLevel, 'caution');
  assert.ok(asthmaRun.reply.includes('avoid outdoor running'), 'Asthma user should be advised against outdoor running at AQI 135');
  assert.equal(genericRun.safetyLevel, 'safe');
  assert.ok(genericRun.reply.includes('General Safe Mode'), 'Skipped profile falls back to General Safe Mode');
});

