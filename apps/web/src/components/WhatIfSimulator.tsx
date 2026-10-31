import { useEffect, useState } from 'react';
import {
  aqiColor,
  type InterventionScenario,
  type NeighborhoodForecast,
  type SimulationResult,
} from '@vaayuvision/shared';
import { api } from '../api';
import { buildPollutantMetrics, useUserPreferences } from '../context/UserPreferencesContext';
import { formatDate } from '../format';

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
  trafficVehiclesPerHr: number;
  crackerIndex: string;
  stubbleIndex: string;
  aiScenario: InterventionScenario;
  aiDiagnosis: string;
  aiActionSummary: string;
}

type SimulatorDialog = 'demo' | 'prediction' | 'all-areas' | null;

const HOTSPOT_PROFILES: Record<string, HotspotDatasetProfile> = {
  'thapar-prem-nagar': {
    corridorType: 'Bhadson Rd Campus & Hostel Corridor',
    trafficVehiclesPerHr: 1450,
    crackerIndex: '0.90× (Moderate Hostel & Sector Bursting)',
    stubbleIndex: '0.95× (NW Sangrur / Nabha Plume)',
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 35, stubbleReductionPct: 70, artificialRain: true },
    aiDiagnosis:
      'According to Thapar / Prem Nagar demo data, NW crop-stubble smoke and evening Bhadson Road traffic combine under cool night air to push Diwali AQI into the Severe zone.',
    aiActionSummary:
      '70% upwind crop-smoke control, 55% green-cracker transition, 35% Bhadson Rd traffic smoothing, and evening water misting.',
  },
  'adalat-bazar': {
    corridorType: 'Old-City Heritage Bazaar',
    trafficVehiclesPerHr: 2300,
    crackerIndex: '1.35× (Extreme Old-City Cracker Density)',
    stubbleIndex: '0.95× (Regional Drift)',
    aiScenario: { fireworksReductionPct: 80, trafficReductionPct: 50, stubbleReductionPct: 55, artificialRain: true },
    aiDiagnosis:
      'According to Adalat Bazar & Qila Mubarak demo data, narrow heritage streets trap dense Diwali firecracker smoke (1.35× index) and bazaar shopping traffic.',
    aiActionSummary:
      '80% firecracker curb, 50% bazaar vehicle restriction, 55% crop-smoke control, and evening misting.',
  },
  tripuri: {
    corridorType: 'High-Density Residential & Market Area',
    trafficVehiclesPerHr: 1950,
    crackerIndex: '1.30× (Very High Residential Bursting)',
    stubbleIndex: '1.00× (Northern Sirhind Bypass Inflow)',
    aiScenario: { fireworksReductionPct: 75, trafficReductionPct: 40, stubbleReductionPct: 60, artificialRain: true },
    aiDiagnosis:
      'According to Tripuri Town demo data, intense rooftop firecracker bursting (1.30×) and northern crop smoke create heavy post-Diwali morning smog.',
    aiActionSummary:
      '75% community firecracker reduction, 40% market traffic diversion, 60% crop-smoke control, and water sprinkling.',
  },
  'focal-point': {
    corridorType: 'Industrial & Freight Zone',
    trafficVehiclesPerHr: 2100,
    crackerIndex: '1.00× (Moderate Industrial Zone)',
    stubbleIndex: '1.05× (NE Rural Plume)',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 55, stubbleReductionPct: 65, artificialRain: true },
    aiDiagnosis:
      'According to Focal Point demo data, heavy freight trucks, industrial foundry exhaust, and NE agricultural smoke drive high daily PM2.5 and PM10.',
    aiActionSummary:
      '55% heavy truck & industrial emission curb, 65% crop-smoke control, 50% firework control, and road-dust misting.',
  },
  'leela-bhawan': {
    corridorType: 'Central Commercial Hub',
    trafficVehiclesPerHr: 2450,
    crackerIndex: '1.15× (High Commercial Zone)',
    stubbleIndex: '0.90× (Central Drift)',
    aiScenario: { fireworksReductionPct: 65, trafficReductionPct: 50, stubbleReductionPct: 50, artificialRain: true },
    aiDiagnosis:
      'According to Leela Bhawan Market demo data, Patiala’s highest commercial traffic load (2,450 vehicles/hr) drives elevated NO₂ and evening particulate buildup.',
    aiActionSummary:
      '50% commercial traffic management, 65% cracker reduction, 50% crop-smoke control, and corridor misting.',
  },
  'bus-stand': {
    corridorType: 'ISBT & Rajpura Highway Corridor',
    trafficVehiclesPerHr: 2400,
    crackerIndex: '1.00× (Transit Corridor)',
    stubbleIndex: '0.95× (East Highway Drift)',
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 55, stubbleReductionPct: 55, artificialRain: true },
    aiDiagnosis:
      'According to ISBT & Rajpura Road demo data, diesel bus idling and highway freight traffic create persistent morning and evening pollution peaks.',
    aiActionSummary:
      '55% bus idling & highway traffic control, 55% cracker & crop-smoke reduction, and dust suppression at ISBT.',
  },
  'model-town': {
    corridorType: 'Planned Residential Sector',
    trafficVehiclesPerHr: 1350,
    crackerIndex: '1.20× (High Residential Fireworks)',
    stubbleIndex: '0.90× (Central-West Drift)',
    aiScenario: { fireworksReductionPct: 70, trafficReductionPct: 35, stubbleReductionPct: 55, artificialRain: true },
    aiDiagnosis:
      'According to Model Town demo data, calm evening winds trap residential Diwali firecracker smoke (1.20× index).',
    aiActionSummary:
      '70% shift to community green-cracker zones, 55% crop-smoke control, and 35% through-traffic calming.',
  },
  'urban-estate': {
    corridorType: 'Eastern Residential & Bypass Belt',
    trafficVehiclesPerHr: 1400,
    crackerIndex: '1.15× (High Sector Fireworks)',
    stubbleIndex: '1.00× (Eastern Agricultural Inflow)',
    aiScenario: { fireworksReductionPct: 65, trafficReductionPct: 35, stubbleReductionPct: 65, artificialRain: true },
    aiDiagnosis:
      'According to Urban Estate Phase-2 demo data, eastern agricultural smoke combines with residential festival fireworks.',
    aiActionSummary:
      '65% eastern agricultural smoke control, 65% residential cracker reduction, and 35% bypass traffic smoothing.',
  },
  'ranjit-nagar': {
    corridorType: 'North-West Residential Belt',
    trafficVehiclesPerHr: 1600,
    crackerIndex: '1.10× (High Residential Fireworks)',
    stubbleIndex: '1.05× (Direct NW Field Edge)',
    aiScenario: { fireworksReductionPct: 60, trafficReductionPct: 40, stubbleReductionPct: 75, artificialRain: true },
    aiDiagnosis:
      'According to Ranjit Nagar demo data, direct proximity to NW agricultural fields brings high paddy-stubble smoke and road dust.',
    aiActionSummary:
      '75% north-west crop-residue management, 60% firework control, and 40% Bhadson Rd heavy-vehicle curb.',
  },
  'sanaur-road': {
    corridorType: 'Southern Agricultural & Mandi Belt',
    trafficVehiclesPerHr: 1250,
    crackerIndex: '0.95× (Peri-Urban Belt)',
    stubbleIndex: '1.20× (Peak Southern Malwa Plume)',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 30, stubbleReductionPct: 85, artificialRain: true },
    aiDiagnosis:
      'According to Sanaur Road demo data, southern Malwa paddy-stubble smoke (1.20× index) is the primary pollution driver.',
    aiActionSummary:
      '85% southern Malwa stubble-fire control, 50% cracker restriction, and 30% mandi transport scheduling.',
  },
  'punjabi-uni': {
    corridorType: 'Green University Campus',
    trafficVehiclesPerHr: 980,
    crackerIndex: '0.75× (Low Campus Activity)',
    stubbleIndex: '0.90× (Regional Drift)',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 30, stubbleReductionPct: 65, artificialRain: false },
    aiDiagnosis:
      'According to Punjabi University demo data, dense campus tree cover keeps local air cleaner, with regional crop smoke as the main external factor.',
    aiActionSummary:
      '65% regional crop-smoke reduction, 50% firework-free campus buffer, and 30% highway perimeter smoothing.',
  },
  'baradari-gardens': {
    corridorType: 'Heritage Urban Green Buffer',
    trafficVehiclesPerHr: 820,
    crackerIndex: '0.70× (Protected Green Zone)',
    stubbleIndex: '0.80× (Canopy Filtered)',
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 35, stubbleReductionPct: 60, artificialRain: false },
    aiDiagnosis:
      'According to Baradari Gardens demo data, this is Patiala’s cleanest green refuge, affected mainly when calm night air traps drifting city smoke.',
    aiActionSummary:
      '60% regional crop-smoke control, 55% buffer-zone firework restriction, and 35% perimeter traffic calming.',
  },
};

export function WhatIfSimulator({
  forecasts,
  selectedId,
  dayIndex,
  onSelectArea,
  onChange,
  result,
}: Props) {
  const [aiResult, setAiResult] = useState<SimulationResult | null>(result);
  const [dialog, setDialog] = useState<SimulatorDialog>(null);
  const { profile: userProfile } = useUserPreferences();

  const selectedForecast = forecasts.find((f) => f.neighborhood.id === selectedId) ?? forecasts[0];
  const area = selectedForecast.neighborhood;
  const point = selectedForecast.points[dayIndex] ?? selectedForecast.points[0];
  const profile = HOTSPOT_PROFILES[area.id] ?? HOTSPOT_PROFILES['thapar-prem-nagar'];
  const metrics = buildPollutantMetrics(area, point);

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
  const userName = userProfile.name.trim();

  return (
    <div className="simulator ai-analyzer">
      <div className="sim-header">
        <div>
          <span className="section-kicker">SECTION 03 · AI HOTSPOT &amp; DEMO DATA INSPECTOR</span>
          <h3>{area.name} · AI Insights</h3>
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
              <span className="hotspot-pill-aqi">AQI {p.aqi}</span>
            </button>
          );
        })}
      </div>

      {/* 3 Clickable Cards that open Dialog Boxes — No Long Descriptions on Main Page */}
      <div className="clickable-cards-grid three-col">
        <button type="button" className="hub-action-card" onClick={() => setDialog('demo')}>
          <span className="dataset-tag">1. NEIGHBORHOOD DEMO DATA</span>
          <strong>Traffic ({profile.trafficVehiclesPerHr}/hr) &amp; Firecrackers</strong>
          <span className="muted small">Click to open →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setDialog('prediction')}>
          <span className="dataset-tag">2. WHY &amp; AI ACTION PLAN</span>
          <strong>
            {activeSim
              ? `AQI ${activeSim.diwaliPeakBaselineAqi} → ${activeSim.diwaliPeakSimulatedAqi}`
              : `Current AQI ${point.aqi}`}
          </strong>
          <span className="muted small">Click to open →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setDialog('all-areas')}>
          <span className="dataset-tag">3. ALL 12 AREAS COMPARISON</span>
          <strong>Compare Traffic &amp; AQI</strong>
          <span className="muted small">Click to open →</span>
        </button>
      </div>

      {/* Dialog Box for Demo Data / AI Prediction / 12-Area Table */}
      {dialog && (
        <div className="pref-modal-backdrop" onClick={() => setDialog(null)} role="dialog" aria-modal="true">
          <div className="pref-modal detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pref-modal-header">
              <div>
                <span className="pref-kicker">{area.name.toUpperCase()} · {formatDate(point.date, true).toUpperCase()}</span>
                <h2>
                  {dialog === 'demo' && `Demo Datasets for ${area.name}`}
                  {dialog === 'prediction' && `AI Predictions for ${area.name}`}
                  {dialog === 'all-areas' && `Patiala 12-Neighborhood Demo Data & AI Predictions`}
                </h2>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setDialog(null)}>
                Close ✕
              </button>
            </div>

            {dialog === 'demo' && (
              <div className="dialog-body">
                <p className="muted small">
                  Our AI gathered the following neighborhood demo data for <strong>{area.name}</strong>:
                </p>
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">TRAFFIC DEMO DATA</span>
                    <strong>~{profile.trafficVehiclesPerHr.toLocaleString()} vehicles/hr ({point.trafficIndex.toFixed(2)}×)</strong>
                    <span className="small muted">
                      Corridor: {profile.corridorType} · Exhaust NO₂: {metrics.no2} µg/m³
                    </span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">FIRECRACKER DEMO DATA</span>
                    <strong>{profile.crackerIndex}</strong>
                    <span className="small muted">Historical Diwali evening barium/sulfur smoke intensity</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">CROP SMOKE DEMO DATA</span>
                    <strong>{point.fireCount} Upwind Fires · {profile.stubbleIndex}</strong>
                    <span className="small muted">NASA VIIRS Malwa paddy-stubble smoke transport</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">WEATHER &amp; SENSORS DEMO DATA</span>
                    <strong>
                      PM2.5 {metrics.pm25} µg/m³ · Wind {point.weather.windSpeed.toFixed(1)} m/s
                    </strong>
                    <span className="small muted">
                      PM10 {metrics.pm10} µg/m³ · Humidity {Math.round(point.weather.humidity)}% · Temp{' '}
                      {point.weather.tempC.toFixed(1)} °C
                    </span>
                  </div>
                </div>
              </div>
            )}

            {dialog === 'prediction' && activeSim && (
              <div className="dialog-body">
                <p className="verdict-lead">
                  {userName ? `${userName}, ` : ''}
                  {profile.aiDiagnosis}
                </p>
                <div className="sim-impact">
                  <div className="metric">
                    <span className="muted small">Predicted Diwali Peak AQI</span>
                    <strong>
                      <span style={{ color: aqiColor(activeSim.diwaliPeakBaselineAqi) }}>
                        {activeSim.diwaliPeakBaselineAqi}
                      </span>
                      {' → '}
                      <span style={{ color: aqiColor(activeSim.diwaliPeakSimulatedAqi) }}>
                        {activeSim.diwaliPeakSimulatedAqi}
                      </span>
                    </strong>
                    <span className="small down-text">Before vs. After AI Plan</span>
                  </div>
                  <div className="metric">
                    <span className="muted small">Peak PM2.5 Reduced</span>
                    <strong className="down-text">−{activeSim.diwaliPeakPm25Saved} µg/m³</strong>
                    <span className="small muted">Cleaner air on Diwali night</span>
                  </div>
                  <div className="metric">
                    <span className="muted small">21-Day Avg Improvement</span>
                    <strong className="down-text">−{activeSim.avgPm25SavedPct}%</strong>
                    <span className="small muted">Across the 21-day forecast</span>
                  </div>
                </div>
                <div className="personal-advice-card" style={{ marginTop: 14, marginBottom: 0 }}>
                  <strong>AI Action Plan for {area.name}:</strong>
                  <span className="small muted">{profile.aiActionSummary}</span>
                </div>
              </div>
            )}

            {dialog === 'all-areas' && (
              <div className="dialog-body">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Neighborhood</th>
                      <th>Traffic Demo</th>
                      <th>Firecracker Index</th>
                      <th>Predicted AQI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.map((f) => {
                      const p = f.points[dayIndex] ?? f.points[0];
                      const hp = HOTSPOT_PROFILES[f.neighborhood.id] ?? HOTSPOT_PROFILES['thapar-prem-nagar'];
                      return (
                        <tr
                          key={f.neighborhood.id}
                          className={f.neighborhood.id === area.id ? 'selected' : ''}
                          onClick={() => {
                            onSelectArea(f.neighborhood.id);
                            setDialog('prediction');
                          }}
                        >
                          <td>
                            <strong>{f.neighborhood.name}</strong>
                          </td>
                          <td>~{hp.trafficVehiclesPerHr}/hr</td>
                          <td>{hp.crackerIndex.split(' ')[0]}</td>
                          <td>
                            <span className="dot" style={{ background: aqiColor(p.aqi) }} />
                            <strong>AQI {p.aqi}</strong> ({p.pm25} µg/m³)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
