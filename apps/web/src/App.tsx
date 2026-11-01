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
import { Header, type ViewStage } from './components/Header';
import { CityKpiBar } from './components/CityKpiBar';
import { AqiMap } from './components/AqiMap';
import { NeighborhoodPanel } from './components/NeighborhoodPanel';
import { RankingTable } from './components/RankingTable';
import { ModelCard } from './components/ModelCard';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { CommunityHub } from './components/CommunityHub';
import { IntroGate } from './components/IntroGate';
import { HealthPreferenceModal } from './components/HealthPreferenceModal';
import { AQIAssistant } from './components/AQIAssistant';
import { useUserPreferences } from './context/UserPreferencesContext';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; live: boolean }>({
    lat: 30.354,
    lng: 76.3685,
    live: false,
  });
  const [gpsAreaId, setGpsAreaId] = useState<string>('thapar-prem-nagar');
  const { openModal } = useUserPreferences();

  const handleGateEnter = () => {
    setGateOpen(true);
    // Always prompt for user name and medical info when entering the website
    window.setTimeout(() => openModal(), 320);
  };

  useEffect(() => {
    Promise.all([api.meta(), api.model(), api.forecasts()])
      .then(([m, mi, f]) => {
        setMeta(m);
        setModel(mi);
        setForecasts(f);
        // Always start on Day 0 (Today's Current Live AQI, not Diwali Peak)
        setDayIndex(0);
        const defaultArea = f.find((item) => item.neighborhood.id === 'thapar-prem-nagar') ?? f[0];
        if (defaultArea) {
          setSelectedId(defaultArea.neighborhood.id);
          setGpsAreaId(defaultArea.neighborhood.id);
          setGpsCoords({ lat: defaultArea.neighborhood.lat, lng: defaultArea.neighborhood.lng, live: false });
        }

        // Detect user's current live GPS coordinates and match to the closest Patiala area
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              const nearest = [...f].sort((a, b) => {
                const dA = Math.hypot(a.neighborhood.lat - latitude, a.neighborhood.lng - longitude);
                const dB = Math.hypot(b.neighborhood.lat - latitude, b.neighborhood.lng - longitude);
                return dA - dB;
              })[0];
              if (nearest) {
                setGpsCoords({ lat: latitude, lng: longitude, live: true });
                setGpsAreaId(nearest.neighborhood.id);
                setSelectedId(nearest.neighborhood.id);
              }
            },
            () => {
              // Keep default Patiala GPS area if browser location permission is denied
            },
            { enableHighAccuracy: true, timeout: 6000 },
          );
        }
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
  const gpsForecast = useMemo(
    () => forecasts.find((f) => f.neighborhood.id === gpsAreaId) ?? selected ?? forecasts[0],
    [forecasts, gpsAreaId, selected],
  );

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
      {!gateOpen && gpsForecast && (
        <IntroGate gpsForecast={gpsForecast} gpsCoords={gpsCoords} onEnter={handleGateEnter} />
      )}
      <HealthPreferenceModal />
      {gateOpen && selected && (
        <AQIAssistant
          neighborhood={selected.neighborhood}
          point={(simResult?.simulated ?? selected.points)[dayIndex] ?? selected.points[0]}
        />
      )}

      <div className={`app ${gateOpen ? 'app-revealed' : 'app-gated'}`}>
        <Header
          meta={meta}
          stage={stage}
          onStageChange={setStage}
          dates={dates}
          points={activeForecasts[0].points}
          dayIndex={dayIndex}
          onDayChange={setDayIndex}
          onLockGate={() => setGateOpen(false)}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((v) => !v)}
        />

        <main key={stage} className="grid stage-transition">
          {(stage === 'radar' || stage === 'all') && (
            <>
              <section className="card map-card hero-surface">
                <AqiMap forecasts={activeForecasts} dayIndex={dayIndex} selectedId={selectedId} onSelect={setSelectedId} />
              </section>
              <section className="card detail-card hero-surface">
                {selected && (
                  <NeighborhoodPanel
                    forecast={selected}
                    simulatedPoints={simResult?.simulated ?? null}
                    history={history}
                    outlook={outlook}
                    dayIndex={dayIndex}
                    diwaliDate={meta.diwaliDate}
                    onInspectArea={() => setDrawerOpen(true)}
                  />
                )}
              </section>
            </>
          )}

          {(stage === 'simulator' || stage === 'all') && selected && (
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

        {/* Toggleable Slide-Out Deep Dive Drawer for AI Diagnostic Tools & Neighborhood Inspector */}
        {drawerOpen && selected && (
          <div
            className="deep-dive-backdrop"
            onClick={() => setDrawerOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Inspect Area Deep Dive Drawer"
          >
            <aside className="deep-dive-drawer" onClick={(e) => e.stopPropagation()}>
              <WhatIfSimulator
                forecasts={forecasts}
                selectedId={selected.neighborhood.id}
                dayIndex={dayIndex}
                onSelectArea={setSelectedId}
                scenario={scenario}
                onChange={setScenario}
                result={simResult}
                onCloseDrawer={() => setDrawerOpen(false)}
              />
              {model && (
                <div className="drawer-secondary-section">
                  <ModelCard model={model} />
                </div>
              )}
            </aside>
          </div>
        )}

        <CityKpiBar
          baselineForecasts={forecasts}
          activeForecasts={activeForecasts}
          dayIndex={dayIndex}
          gpsCoords={gpsCoords}
          onSelectWard={setSelectedId}
        />

        <footer className="footer">
          VaayuVision · Patiala Air Quality &amp; Health Guide
        </footer>
      </div>
    </>
  );
}
