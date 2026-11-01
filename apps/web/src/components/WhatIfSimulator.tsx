import { useEffect, useState } from 'react';
import {
  aqiColor,
  type InterventionScenario,
  type NeighborhoodForecast,
  type SimulationResult,
} from '@vaayuvision/shared';
import { api } from '../api';
import { buildPollutantMetrics, useUserPreferences } from '../context/UserPreferencesContext';

interface Props {
  forecasts: NeighborhoodForecast[];
  selectedId: string;
  dayIndex: number;
  onSelectArea: (id: string) => void;
  scenario: InterventionScenario;
  onChange: (next: InterventionScenario) => void;
  result: SimulationResult | null;
  onCloseDrawer?: () => void;
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

type InspectorTab = 'overview' | 'insights' | 'comparison';

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
      '65% eastern perimeter crop-smoke & firework reduction, 35% bypass traffic management, and misting.',
  },
  'ranjit-nagar': {
    corridorType: 'NW Residential Perimeter',
    trafficVehiclesPerHr: 1600,
    crackerIndex: '1.10× (High Residential Fireworks)',
    stubbleIndex: '1.05× (Direct NW Crop Smoke Inflow)',
    aiScenario: { fireworksReductionPct: 60, trafficReductionPct: 40, stubbleReductionPct: 70, artificialRain: true },
    aiDiagnosis:
      'According to Ranjit Nagar demo data, direct proximity to NW fields brings strong crop-smoke plumes alongside residential fireworks.',
    aiActionSummary:
      '70% NW crop-residue smoke abatement, 60% firework reduction, and 40% Bhadson Rd outer traffic control.',
  },
  'sanaur-road': {
    corridorType: 'Southern Agricultural & Mandi Belt',
    trafficVehiclesPerHr: 1250,
    crackerIndex: '0.95× (Moderate Peri-Urban Fireworks)',
    stubbleIndex: '1.20× (Peak Southern Crop Smoke Exposure)',
    aiScenario: { fireworksReductionPct: 45, trafficReductionPct: 35, stubbleReductionPct: 80, artificialRain: true },
    aiDiagnosis:
      'According to Sanaur Road belt demo data, regional crop-residue smoke (1.20× exposure) is the #1 pollution driver here.',
    aiActionSummary:
      '80% regional crop-smoke intervention, 45% firework reduction, and 35% mandi freight dust control.',
  },
  'punjabi-uni': {
    corridorType: 'Institutional Green Campus',
    trafficVehiclesPerHr: 980,
    crackerIndex: '0.75× (Low Campus Fireworks)',
    stubbleIndex: '0.90× (Regional Drift)',
    aiScenario: { fireworksReductionPct: 45, trafficReductionPct: 30, stubbleReductionPct: 60, artificialRain: false },
    aiDiagnosis:
      'According to Punjabi University demo data, dense campus tree cover filters local dust, so pollution mainly drifts in from highway traffic and regional smoke.',
    aiActionSummary:
      '60% regional crop-smoke control, 45% perimeter firework curb, and 30% Rajpura highway traffic smoothing.',
  },
  'baradari-gardens': {
    corridorType: 'Heritage Urban Forest & Green Buffer',
    trafficVehiclesPerHr: 820,
    crackerIndex: '0.70× (Lowest Firecracker Zone)',
    stubbleIndex: '0.80× (Canopy-Filtered Zone)',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 30, stubbleReductionPct: 55, artificialRain: false },
    aiDiagnosis:
      'According to Baradari Gardens demo data, this is Patiala’s cleanest area thanks to dense botanical canopy, experiencing only mild drifting smoke on Diwali night.',
    aiActionSummary:
      '50% surrounding buffer firework restriction, 55% regional smoke control, and 30% perimeter traffic calming.',
  },
};

export function WhatIfSimulator({
  forecasts,
  selectedId,
  dayIndex,
  onSelectArea,
  onChange,
  result,
  onCloseDrawer,
}: Props) {
  const [aiResult, setAiResult] = useState<SimulationResult | null>(result);
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { profile: userProfile } = useUserPreferences();

  const currentIdx = Math.max(0, forecasts.findIndex((f) => f.neighborhood.id === selectedId));
  const selectedForecast = forecasts[currentIdx] ?? forecasts[0];
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

  const stepArea = (delta: number) => {
    const nextIdx = (currentIdx + delta + forecasts.length) % forecasts.length;
    onSelectArea(forecasts[nextIdx].neighborhood.id);
  };

  return (
    <div className="simulator ai-analyzer">
      {/* Header + Active Area Summary Switcher (No 12-Pill Clutter) */}
      <div className="inspector-top-bar">
        <div>
          <span className="section-kicker">AI HOTSPOT &amp; DEMO DATA INSPECTOR</span>
          <h3 className="inspector-heading">{area.name}</h3>
          <span className="muted small">{profile.corridorType}</span>
        </div>

        <div className="inspector-switcher-controls">
          <div className="carousel-stepper">
            <button
              type="button"
              className="dock-btn icon-only"
              onClick={() => stepArea(-1)}
              title="Previous Area"
              aria-label="Previous Area"
            >
              ‹
            </button>
            <button
              type="button"
              className="dock-btn area-dropdown-trigger"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
            >
              <span className="status-dot" style={{ background: aqiColor(point.aqi) }} />
              <span>
                {currentIdx + 1}/{forecasts.length} · Switch Area
              </span>
              <span>{pickerOpen ? '▴' : '▾'}</span>
            </button>
            <button
              type="button"
              className="dock-btn icon-only"
              onClick={() => stepArea(1)}
              title="Next Area"
              aria-label="Next Area"
            >
              ›
            </button>
          </div>

          {onCloseDrawer && (
            <button type="button" className="dock-btn" onClick={onCloseDrawer}>
              Close ✕
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Horizontal Carousel / Dropdown Selector — Only Visible When Toggled */}
      {pickerOpen && (
        <div className="area-carousel-drawer" role="listbox" aria-label="Switch Patiala Area">
          <div className="area-carousel-track">
            {forecasts.map((f) => {
              const p = f.points[dayIndex] ?? f.points[0];
              const active = f.neighborhood.id === area.id;
              return (
                <button
                  key={f.neighborhood.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`hotspot-pill ${active ? 'active' : ''}`}
                  onClick={() => {
                    onSelectArea(f.neighborhood.id);
                    setPickerOpen(false);
                  }}
                >
                  <span className="status-dot" style={{ background: aqiColor(p.aqi) }} />
                  <span>{f.neighborhood.name}</span>
                  <span className="hotspot-pill-aqi">AQI {p.aqi}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Currently Active Area Summary Strip */}
      <div className="active-area-summary-strip">
        <div className="summary-stat">
          <span className="ambient-metric-label">CURRENT AQI</span>
          <strong style={{ color: aqiColor(point.aqi) }}>
            {point.aqi} ({point.category})
          </strong>
        </div>
        <div className="summary-stat">
          <span className="ambient-metric-label">TRAFFIC FLOW</span>
          <strong>~{profile.trafficVehiclesPerHr.toLocaleString()}/hr</strong>
        </div>
        <div className="summary-stat">
          <span className="ambient-metric-label">FIRECRACKER INDEX</span>
          <strong>{profile.crackerIndex.split(' ')[0]}</strong>
        </div>
        <div className="summary-stat">
          <span className="ambient-metric-label">DIWALI PEAK MITIGATION</span>
          <strong className="down-text">
            {activeSim
              ? `${activeSim.diwaliPeakBaselineAqi} → ${activeSim.diwaliPeakSimulatedAqi} AQI`
              : `−${profile.aiScenario.fireworksReductionPct}% plan`}
          </strong>
        </div>
      </div>

      {/* Progressive Disclosure Tabs — Only One Section Expands at a Time */}
      <div className="inspector-tabs" role="tablist" aria-label="Hotspot Inspector Views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`inspector-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview · Demo Data
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'insights'}
          className={`inspector-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          AI Insights &amp; Action Plan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'comparison'}
          className={`inspector-tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          All 12 Areas Comparison
        </button>
      </div>

      {/* Tab 1: Overview (Neighborhood Demo Data) */}
      {activeTab === 'overview' && (
        <div className="inspector-tab-panel stage-transition">
          <div className="dialog-grid-2">
            <div className="dialog-stat-card">
              <span className="dataset-tag">TRAFFIC DEMO DATA</span>
              <strong>
                ~{profile.trafficVehiclesPerHr.toLocaleString()} vehicles/hr ({point.trafficIndex.toFixed(2)}×)
              </strong>
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
              <span className="dataset-tag">CROP SMOKE DEMO DATA (NASA VIIRS)</span>
              <strong>
                {point.fireCount} Upwind Fires · {profile.stubbleIndex}
              </strong>
              <span className="small muted">Malwa paddy-stubble plume transport into {area.name}</span>
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

      {/* Tab 2: AI Insights & Action Plan */}
      {activeTab === 'insights' && (
        <div className="inspector-tab-panel stage-transition">
          <div className="personal-advice-card">
            <span className="dataset-tag">AI CAUSE DIAGNOSIS FOR {area.name.toUpperCase()}</span>
            <p className="verdict-lead" style={{ margin: '4px 0 0' }}>
              {userName ? `${userName}, ` : ''}
              {profile.aiDiagnosis}
            </p>
          </div>

          {activeSim && (
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
          )}

          <div className="personal-advice-card" style={{ marginTop: 14, marginBottom: 0 }}>
            <span className="dataset-tag">RECOMMENDED MITIGATION PROTOCOL</span>
            <span className="small">{profile.aiActionSummary}</span>
          </div>
        </div>
      )}

      {/* Tab 3: All 12 Areas Comparison */}
      {activeTab === 'comparison' && (
        <div className="inspector-tab-panel stage-transition">
          <div className="table-scroll-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Neighborhood</th>
                  <th>Traffic Demo</th>
                  <th>Firecracker Index</th>
                  <th>Current AQI</th>
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
                        setActiveTab('overview');
                      }}
                    >
                      <td>
                        <strong>{f.neighborhood.name}</strong>
                      </td>
                      <td>~{hp.trafficVehiclesPerHr}/hr</td>
                      <td>{hp.crackerIndex.split(' ')[0]}</td>
                      <td>
                        <span
                          className="soft-aqi-badge compact"
                          style={{
                            background: `${aqiColor(p.aqi)}20`,
                            borderColor: `${aqiColor(p.aqi)}55`,
                          }}
                        >
                          <span className="status-dot" style={{ background: aqiColor(p.aqi) }} />
                          <span>
                            {p.aqi} · {p.category}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
