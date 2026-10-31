import { useEffect, useMemo, useState } from 'react';
import type {
  DailyObservation,
  DiwaliOutlook,
  InterventionScenario,
  Meta,
  ModelInfo,
  NeighborhoodForecast,
  SimulationResult,
} from '@vaayuvision/shared';
import { api } from './api';
import { Header } from './components/Header';
import { CityKpiBar } from './components/CityKpiBar';
import { AqiMap } from './components/AqiMap';
import { DaySlider } from './components/DaySlider';
import { NeighborhoodPanel } from './components/NeighborhoodPanel';
import { RankingTable } from './components/RankingTable';
import { ModelCard } from './components/ModelCard';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { CommunityHub } from './components/CommunityHub';
import { IntroGate } from './components/IntroGate';
import { HealthPreferenceModal } from './components/HealthPreferenceModal';
import { AQIAssistant } from './components/AQIAssistant';
import { useUserPreferences } from './context/UserPreferencesContext';

type ViewStage = 'radar' | 'simulator' | 'matrix' | 'community' | 'all';

const STAGES: Array<{ id: ViewStage; code: string; label: string }> = [
  { id: 'radar', code: '01', label: 'SPATIAL RADAR & FORECAST' },
  { id: 'simulator', code: '02', label: 'AI MULTI-DATASET HOTSPOT ANALYZER' },
  { id: 'matrix', code: '03', label: 'AREA MATRIX & AI ENGINE' },
  { id: 'community', code: '04', label: 'CITIZEN TELEMETRY (SUPABASE)' },
  { id: 'all', code: 'ALL', label: 'FULL OVERVIEW' },
];

export function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [forecasts, setForecasts] = useState<NeighborhoodForecast[]>([]);
  const [simForecasts, setSimForecasts] = useState<NeighborhoodForecast[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [history, setHistory] = useState<DailyObservation[]>([]);
  const [outlook, setOutlook] = useState<DiwaliOutlook | null>(null);
  const [scenario, setScenario] = useState<InterventionScenario>({
    fireworksReductionPct: 0,
    trafficReductionPct: 0,
    stubbleReductionPct: 0,
    artificialRain: false,
  });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [stage, setStage] = useState<ViewStage>('radar');
  const { onboarded, openModal } = useUserPreferences();

  const handleGateEnter = () => {
    setGateOpen(true);
    if (!onboarded) {
      window.setTimeout(() => openModal(), 450);
    }
  };

  useEffect(() => {
    Promise.all([api.meta(), api.model(), api.forecasts()])
      .then(([m, mi, f]) => {
        setMeta(m);
        setModel(mi);
        setForecasts(f);
        const diwaliIdx = f[0]?.points.findIndex((p) => p.daysFromDiwali === 0) ?? -1;
        const idx = diwaliIdx >= 0 ? diwaliIdx : 0;
        setDayIndex(idx);
        const worst = [...f].sort((a, b) => (b.points[idx]?.aqi ?? 0) - (a.points[idx]?.aqi ?? 0))[0];
        setSelectedId(worst?.neighborhood.id ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([api.history(selectedId, 30), api.outlook(selectedId)])
      .then(([h, o]) => {
        setHistory(h);
        setOutlook(o);
      })
      .catch((e: Error) => setError(e.message));
  }, [selectedId]);

  const isSimActive =
    scenario.fireworksReductionPct > 0 ||
    scenario.trafficReductionPct > 0 ||
    scenario.stubbleReductionPct > 0 ||
    scenario.artificialRain;

  useEffect(() => {
    if (!selectedId || !isSimActive) {
      setSimResult(null);
      setSimForecasts(null);
      return;
    }
    Promise.all([api.simulate(selectedId, scenario), api.simulateAll(scenario)])
      .then(([res, allSim]) => {
        setSimResult(res);
        setSimForecasts(allSim);
      })
      .catch((e: Error) => setError(e.message));
  }, [selectedId, scenario, isSimActive]);

  const activeForecasts = simForecasts ?? forecasts;
  const dates = forecasts[0]?.points.map((p) => p.date) ?? [];
  const selected = useMemo(() => forecasts.find((f) => f.neighborhood.id === selectedId) ?? null, [forecasts, selectedId]);

  if (error) {
    return (
      <div className="center-message">
        <h2>Could not reach the API</h2>
        <p>{error}</p>
        <p>
          Start it with <code>npm run dev</code> from the repo root.
        </p>
      </div>
    );
  }
  if (!meta || !forecasts.length) return <div className="center-message">Training model &amp; loading forecasts…</div>;

  return (
    <>
      {!gateOpen && <IntroGate meta={meta} forecasts={forecasts} onEnter={handleGateEnter} />}
      <HealthPreferenceModal />
      {gateOpen && selected && (
        <AQIAssistant
          neighborhood={selected.neighborhood}
          point={(simResult?.simulated ?? selected.points)[dayIndex] ?? selected.points[0]}
        />
      )}

      <div className={`app ${gateOpen ? 'app-revealed' : 'app-gated'}`}>
        <Header meta={meta} onLockGate={() => setGateOpen(false)} />

        <CityKpiBar
          baselineForecasts={forecasts}
          activeForecasts={activeForecasts}
          isSimActive={isSimActive}
          dayIndex={dayIndex}
          onSelectWard={setSelectedId}
        />

        <nav className="stage-dock" aria-label="Command Center Sections">
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`stage-pill ${stage === s.id ? 'active' : ''}`}
              onClick={() => setStage(s.id)}
            >
              <span className="stage-code">{s.code}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <main key={stage} className="grid stage-transition">
          {(stage === 'radar' || stage === 'all') && (
            <>
              <section className="card map-card">
                <DaySlider dates={dates} points={activeForecasts[0].points} index={dayIndex} onChange={setDayIndex} />
                <AqiMap forecasts={activeForecasts} dayIndex={dayIndex} selectedId={selectedId} onSelect={setSelectedId} />
              </section>
              <section className="card detail-card">
                {selected && (
                  <NeighborhoodPanel
                    forecast={selected}
                    simulatedPoints={simResult?.simulated ?? null}
                    history={history}
                    outlook={outlook}
                    dayIndex={dayIndex}
                    diwaliDate={meta.diwaliDate}
                  />
                )}
              </section>
            </>
          )}

          {(stage === 'simulator' || stage === 'all') && selected && (
            <>
              <section className="card full-span">
                <WhatIfSimulator
                  forecasts={forecasts}
                  selectedId={selected.neighborhood.id}
                  dayIndex={dayIndex}
                  onSelectArea={setSelectedId}
                  scenario={scenario}
                  onChange={setScenario}
                  result={simResult}
                />
              </section>
              {stage === 'simulator' && (
                <>
                  <section className="card map-card">
                    <DaySlider dates={dates} points={activeForecasts[0].points} index={dayIndex} onChange={setDayIndex} />
                    <AqiMap forecasts={activeForecasts} dayIndex={dayIndex} selectedId={selectedId} onSelect={setSelectedId} />
                  </section>
                  <section className="card detail-card">
                    <NeighborhoodPanel
                      forecast={selected}
                      simulatedPoints={simResult?.simulated ?? null}
                      history={history}
                      outlook={outlook}
                      dayIndex={dayIndex}
                      diwaliDate={meta.diwaliDate}
                    />
                  </section>
                </>
              )}
            </>
          )}

          {(stage === 'matrix' || stage === 'all') && (
            <>
              <section className="card">
                <RankingTable
                  forecasts={activeForecasts}
                  baselineForecasts={forecasts}
                  isSimActive={isSimActive}
                  dayIndex={dayIndex}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </section>
              <section className="card">{model && <ModelCard model={model} />}</section>
            </>
          )}

          {(stage === 'community' || stage === 'all') && selected && (
            <section className="card full-span">
              <CommunityHub
                neighborhoods={forecasts.map((f) => f.neighborhood)}
                selectedId={selected.neighborhood.id}
                onSelectWard={setSelectedId}
              />
            </section>
          )}
        </main>

        <footer className="footer">
          Data: {meta.dataSource} · Last observation {meta.lastObserved} · Forecast issued {meta.today}
        </footer>
      </div>
    </>
  );
}
