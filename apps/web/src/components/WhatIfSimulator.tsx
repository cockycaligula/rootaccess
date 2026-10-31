import { useEffect, useState } from 'react';
import {
  aqiColor,
  type InterventionScenario,
  type NeighborhoodForecast,
  type SimulationResult,
} from '@vaayuvision/shared';
import { api } from '../api';
import { buildPollutantMetrics } from '../context/UserPreferencesContext';

interface Props {
  forecasts: NeighborhoodForecast[];
  selectedId: string;
  dayIndex: number;
  onSelectArea: (id: string) => void;
  scenario: InterventionScenario;
  onChange: (next: InterventionScenario) => void;
  result: SimulationResult | null;
}

interface HotspotDatasetProfile {
  corridorType: string;
  aiScenario: InterventionScenario;
  aiDiagnosis: string;
  aiActionSummary: string;
}

const HOTSPOT_PROFILES: Record<string, HotspotDatasetProfile> = {
  'thapar-prem-nagar': {
    corridorType: 'Bhadson Rd Campus & Hostel Corridor',
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 35, stubbleReductionPct: 70, artificialRain: true },
    aiDiagnosis:
      'North-west crop smoke and evening Bhadson Road traffic settle around campus and Prem Nagar when night temperatures drop.',
    aiActionSummary:
      '70% upwind crop-smoke control, 55% green-cracker enforcement, 35% Bhadson Rd traffic smoothing, and water misting.',
  },
  'adalat-bazar': {
    corridorType: 'Old-City Heritage Bazaar',
    aiScenario: { fireworksReductionPct: 80, trafficReductionPct: 50, stubbleReductionPct: 55, artificialRain: true },
    aiDiagnosis:
      'Narrow streets in Old City trap heavy Diwali firecracker smoke and festive market traffic fumes.',
    aiActionSummary:
      '80% firecracker curb, 50% bazaar vehicle restriction, 55% crop-smoke control, and evening misting.',
  },
  tripuri: {
    corridorType: 'High-Density Residential & Market Area',
    aiScenario: { fireworksReductionPct: 75, trafficReductionPct: 40, stubbleReductionPct: 60, artificialRain: true },
    aiDiagnosis:
      'High residential firecracker density combined with northern bypass smoke causes lingering morning smog.',
    aiActionSummary:
      '75% community firecracker reduction, 40% market traffic diversion, 60% crop-smoke control, and water sprinkling.',
  },
  'focal-point': {
    corridorType: 'Industrial & Freight Zone',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 55, stubbleReductionPct: 65, artificialRain: true },
    aiDiagnosis:
      'Industrial emissions, heavy truck dust, and north-east agricultural smoke drive high PM10 and PM2.5 levels.',
    aiActionSummary:
      '55% heavy truck & industrial emission curb, 65% crop-smoke control, 50% firework control, and road-dust misting.',
  },
  'leela-bhawan': {
    corridorType: 'Central Commercial Hub',
    aiScenario: { fireworksReductionPct: 65, trafficReductionPct: 50, stubbleReductionPct: 50, artificialRain: true },
    aiDiagnosis:
      'Heavy commercial traffic around Leela Bhawan Market creates elevated NO₂ and fine particulate buildup.',
    aiActionSummary:
      '50% commercial traffic management, 65% cracker reduction, 50% crop-smoke control, and corridor misting.',
  },
  'bus-stand': {
    corridorType: 'ISBT & Rajpura Highway Corridor',
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 55, stubbleReductionPct: 55, artificialRain: true },
    aiDiagnosis:
      'Bus terminal diesel exhaust and highway traffic create steady particulate spikes during morning and evening rush hours.',
    aiActionSummary:
      '55% bus idling & highway traffic control, 55% cracker & crop-smoke reduction, and dust suppression at ISBT.',
  },
  'model-town': {
    corridorType: 'Planned Residential Sector',
    aiScenario: { fireworksReductionPct: 70, trafficReductionPct: 35, stubbleReductionPct: 55, artificialRain: true },
    aiDiagnosis:
      'Calm evening winds trap residential Diwali firecracker smoke across Model Town.',
    aiActionSummary:
      '70% shift to community green-cracker zones, 55% crop-smoke control, and 35% through-traffic calming.',
  },
  'urban-estate': {
    corridorType: 'Eastern Residential & Bypass Belt',
    aiScenario: { fireworksReductionPct: 65, trafficReductionPct: 35, stubbleReductionPct: 65, artificialRain: true },
    aiDiagnosis:
      'Eastern perimeter receives direct agricultural smoke alongside residential festival emissions.',
    aiActionSummary:
      '65% eastern agricultural smoke control, 65% residential cracker reduction, and 35% bypass traffic smoothing.',
  },
  'ranjit-nagar': {
    corridorType: 'North-West Residential Belt',
    aiScenario: { fireworksReductionPct: 60, trafficReductionPct: 40, stubbleReductionPct: 75, artificialRain: true },
    aiDiagnosis:
      'Direct exposure to north-west agricultural fields brings high crop-residue smoke and road dust.',
    aiActionSummary:
      '75% north-west crop-residue management, 60% firework control, and 40% Bhadson Rd heavy-vehicle curb.',
  },
  'sanaur-road': {
    corridorType: 'Southern Agricultural & Mandi Belt',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 30, stubbleReductionPct: 85, artificialRain: true },
    aiDiagnosis:
      'Highest exposure to southern Malwa paddy-stubble smoke and grain-market transport.',
    aiActionSummary:
      '85% southern Malwa stubble-fire control, 50% cracker restriction, and 30% mandi transport scheduling.',
  },
  'punjabi-uni': {
    corridorType: 'Green University Campus',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 30, stubbleReductionPct: 65, artificialRain: false },
    aiDiagnosis:
      'Campus tree cover keeps local air cleaner, with regional crop smoke as the main external factor.',
    aiActionSummary:
      '65% regional crop-smoke reduction, 50% firework-free campus buffer, and 30% highway perimeter smoothing.',
  },
  'baradari-gardens': {
    corridorType: 'Heritage Urban Green Buffer',
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 35, stubbleReductionPct: 60, artificialRain: false },
    aiDiagnosis:
      'Patiala’s cleanest green zone; affected mainly when calm night air traps drifting city smoke.',
    aiActionSummary:
      '60% regional crop-smoke control, 55% buffer-zone firework restriction, and 35% perimeter traffic calming.',
  },
};

const BASELINE: InterventionScenario = {
  fireworksReductionPct: 0,
  trafficReductionPct: 0,
  stubbleReductionPct: 0,
  artificialRain: false,
};

export function WhatIfSimulator({
  forecasts,
  selectedId,
  dayIndex,
  onSelectArea,
  scenario,
  onChange,
  result,
}: Props) {
  const [aiResult, setAiResult] = useState<SimulationResult | null>(result);
  const [showDatasets, setShowDatasets] = useState(false);

  const selectedForecast = forecasts.find((f) => f.neighborhood.id === selectedId) ?? forecasts[0];
  const area = selectedForecast.neighborhood;
  const point = selectedForecast.points[dayIndex] ?? selectedForecast.points[0];
  const profile = HOTSPOT_PROFILES[area.id] ?? HOTSPOT_PROFILES['thapar-prem-nagar'];
  const metrics = buildPollutantMetrics(area, point);

  const isAppliedToGlobalMap =
    scenario.fireworksReductionPct === profile.aiScenario.fireworksReductionPct &&
    scenario.trafficReductionPct === profile.aiScenario.trafficReductionPct &&
    scenario.stubbleReductionPct === profile.aiScenario.stubbleReductionPct &&
    scenario.artificialRain === profile.aiScenario.artificialRain;

  useEffect(() => {
    let cancelled = false;
    onChange(profile.aiScenario);
    api
      .simulate(area.id, profile.aiScenario)
      .then((res) => {
        if (!cancelled) setAiResult(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [area.id]);

  const activeSim = result ?? aiResult;

  return (
    <div className="simulator ai-analyzer">
      <div className="sim-header">
        <div>
          <h3>AI Hotspot Analysis · {area.name}</h3>
          <p className="muted small">
            Pick any Patiala area below — our AI automatically analyzes local pollution, weather, and traffic data to give you the expected improvement.
          </p>
        </div>
        <div className="preset-row">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowDatasets((v) => !v)}
          >
            {showDatasets ? 'Hide Data Sources' : 'View Data Sources (5)'}
          </button>
          <button
            type="button"
            className={isAppliedToGlobalMap ? 'btn' : 'btn-secondary'}
            onClick={() => onChange(isAppliedToGlobalMap ? BASELINE : profile.aiScenario)}
          >
            {isAppliedToGlobalMap ? 'Showing AI Plan on Chart' : 'Show AI Plan on Chart'}
          </button>
        </div>
      </div>

      {/* Clean Area Selector Bar */}
      <div className="hotspot-pill-bar" role="tablist" aria-label="Patiala Areas">
        {forecasts.map((f) => {
          const p = f.points[dayIndex] ?? f.points[0];
          const active = f.neighborhood.id === area.id;
          return (
            <button
              key={f.neighborhood.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`hotspot-pill ${active ? 'active' : ''}`}
              onClick={() => onSelectArea(f.neighborhood.id)}
            >
              <span className="dot" style={{ background: aqiColor(p.aqi) }} />
              <span>{f.neighborhood.name}</span>
              <span className="hotspot-pill-aqi">{p.aqi}</span>
            </button>
          );
        })}
      </div>

      {/* Main AI Synthesis & Result (Clean & Uncluttered) */}
      <div className="ai-synthesis-box">
        <div className="ai-synthesis-left">
          <div className="dataset-tag">AI SUMMARY FOR {area.name.toUpperCase()}</div>
          <p className="ai-diagnosis-text">{profile.aiDiagnosis}</p>
          <p className="small muted" style={{ margin: 0 }}>
            <strong>Recommended Action:</strong> {profile.aiActionSummary}
          </p>
        </div>

        {activeSim && (
          <div className="sim-impact ai-impact-cards">
            <div className="metric">
              <span className="muted small">Diwali Peak AQI</span>
              <strong>
                <span style={{ color: aqiColor(activeSim.diwaliPeakBaselineAqi) }}>
                  {activeSim.diwaliPeakBaselineAqi}
                </span>
                {' → '}
                <span style={{ color: aqiColor(activeSim.diwaliPeakSimulatedAqi) }}>
                  {activeSim.diwaliPeakSimulatedAqi}
                </span>
              </strong>
              <span className="small down-text">Expected AQI after AI plan</span>
            </div>
            <div className="metric">
              <span className="muted small">Peak PM2.5 Reduced</span>
              <strong className="down-text">−{activeSim.diwaliPeakPm25Saved} µg/m³</strong>
              <span className="small muted">Cleaner air on Diwali night</span>
            </div>
            <div className="metric">
              <span className="muted small">21-Day Improvement</span>
              <strong className="down-text">−{activeSim.avgPm25SavedPct}%</strong>
              <span className="small muted">Average pollution reduction</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Data Sources (Hidden by default so the UI stays clean) */}
      {showDatasets && (
        <div className="dataset-grid" style={{ marginTop: 14, marginBottom: 0 }}>
          <div className="dataset-card">
            <div className="dataset-tag">1. CPCB / PPCB AIR SENSORS</div>
            <strong>PM2.5 {metrics.pm25} · PM10 {metrics.pm10} µg/m³</strong>
            <span className="small muted">Local particulate &amp; AQI readings</span>
          </div>
          <div className="dataset-card">
            <div className="dataset-tag">2. NASA VIIRS CROP FIRES</div>
            <strong>{point.fireCount} Regional Fires</strong>
            <span className="small muted">Upwind Malwa paddy-stubble smoke</span>
          </div>
          <div className="dataset-card">
            <div className="dataset-tag">3. IMD WEATHER &amp; WIND</div>
            <strong>Wind {point.weather.windSpeed.toFixed(1)} m/s · {Math.round(point.weather.humidity)}% RH</strong>
            <span className="small muted">Boundary-layer mixing height {Math.round(point.weather.mixingHeightM)} m</span>
          </div>
          <div className="dataset-card">
            <div className="dataset-tag">4. PATIALA TRAFFIC FLOW</div>
            <strong>{point.trafficIndex.toFixed(1)}× Traffic · NO₂ {metrics.no2} µg/m³</strong>
            <span className="small muted">{profile.corridorType}</span>
          </div>
          <div className="dataset-card">
            <div className="dataset-tag">5. DIWALI HISTORY (2022–2025)</div>
            <strong>Area Festival Profile</strong>
            <span className="small muted">Past Diwali night &amp; post-festival recovery</span>
          </div>
        </div>
      )}
    </div>
  );
}
