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
  crackerMultiplier: number;
  crackerIndex: string;
  stubbleMultiplier: number;
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
    crackerMultiplier: 0.9,
    crackerIndex: '0.90× (Moderate Hostel & Sector Bursting)',
    stubbleMultiplier: 0.95,
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
    crackerMultiplier: 1.35,
    crackerIndex: '1.35× (Extreme Old-City Cracker Density)',
    stubbleMultiplier: 0.95,
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
    crackerMultiplier: 1.3,
    crackerIndex: '1.30× (Very High Residential Bursting)',
    stubbleMultiplier: 1.0,
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
    crackerMultiplier: 1.0,
    crackerIndex: '1.00× (Moderate Industrial Zone)',
    stubbleMultiplier: 1.05,
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
    crackerMultiplier: 1.15,
    crackerIndex: '1.15× (High Commercial Zone)',
    stubbleMultiplier: 0.9,
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
    crackerMultiplier: 1.0,
    crackerIndex: '1.00× (Transit Corridor)',
    stubbleMultiplier: 0.95,
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
    crackerMultiplier: 1.2,
    crackerIndex: '1.20× (High Residential Fireworks)',
    stubbleMultiplier: 0.9,
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
    crackerMultiplier: 1.15,
    crackerIndex: '1.15× (High Sector Fireworks)',
    stubbleMultiplier: 1.0,
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
    crackerMultiplier: 1.1,
    crackerIndex: '1.10× (High Residential Fireworks)',
    stubbleMultiplier: 1.05,
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
    crackerMultiplier: 0.95,
    crackerIndex: '0.95× (Moderate Peri-Urban Fireworks)',
    stubbleMultiplier: 1.2,
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
    crackerMultiplier: 0.75,
    crackerIndex: '0.75× (Low Campus Fireworks)',
    stubbleMultiplier: 0.9,
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
    crackerMultiplier: 0.7,
    crackerIndex: '0.70× (Lowest Firecracker Zone)',
    stubbleMultiplier: 0.8,
    stubbleIndex: '0.80× (Canopy-Filtered Zone)',
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 30, stubbleReductionPct: 55, artificialRain: false },
    aiDiagnosis:
      'According to Baradari Gardens demo data, this is Patiala’s cleanest area thanks to dense botanical canopy, experiencing only mild drifting smoke on Diwali night.',
    aiActionSummary:
      '50% surrounding buffer firework restriction, 55% regional smoke control, and 30% perimeter traffic calming.',
  },
};

/** Helper to polar-to-cartesian for SVG radial arc gauges */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

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

  // Compute visual percentages & hourly curve for Traffic Card
  const trafficLoadPct = Math.min(100, Math.round((profile.trafficVehiclesPerHr / 2500) * 100));
  const no2LoadPct = Math.min(100, Math.round((metrics.no2 / 90) * 100));
  const hourlyTrafficRatios = [0.22, 0.38, 0.82, 0.68, 0.62, 0.74, 1.0, 0.86, 0.48, 0.28];
  const hourlyTrafficLabels = ['4a', '6a', '8a', '10a', '12p', '3p', '6p', '8p', '10p', '12a'];
  const sparkPoints = hourlyTrafficRatios
    .map((ratio, idx) => {
      const x = 14 + idx * 28;
      const y = 56 - ratio * 42;
      return `${x},${y.toFixed(1)}`;
    })
    .join(' ');
  const sparkAreaPoints = `14,58 ${sparkPoints} ${14 + (hourlyTrafficRatios.length - 1) * 28},58`;

  // Compute Semi-Circular Arc Gauge for Firecracker Intensity (0.5x to 1.5x)
  const crackerNorm = Math.max(0, Math.min(1, (profile.crackerMultiplier - 0.5) / 1.0));
  const crackerAngle = crackerNorm * 180;
  const needlePos = polarToCartesian(80, 68, 52, crackerAngle);
  const crackerColor =
    profile.crackerMultiplier >= 1.2
      ? '#f87171'
      : profile.crackerMultiplier >= 0.95
        ? '#fbbf24'
        : '#34d399';
  const bariumPct = Math.min(100, Math.round(profile.crackerMultiplier * 68));
  const sulfurPct = Math.min(100, Math.round(profile.crackerMultiplier * 74));
  const potassiumPct = Math.min(100, Math.round(profile.crackerMultiplier * 62));

  // Compute Crop Smoke Plume & Canopy Filtration metrics
  const fireLoadPct = Math.min(100, Math.round((point.fireCount / 3200) * 100));
  const plumePenetrationPct = Math.min(100, Math.round((profile.stubbleMultiplier / 1.3) * 100));
  const canopyShieldPct = Math.max(12, 100 - plumePenetrationPct);
  const weekFireBars = [0.52, 0.64, 0.71, 0.85, 0.78, 0.94, 1.0];

  // Compute Weather & Sensors radial rings
  const pm25RingPct = Math.min(100, Math.round((metrics.pm25 / 300) * 100));
  const pm10RingPct = Math.min(100, Math.round((metrics.pm10 / 420) * 100));
  const windSpeedPct = Math.min(100, Math.round((point.weather.windSpeed / 5.0) * 100));
  const humidityPct = Math.min(100, Math.max(0, Math.round(point.weather.humidity)));
  const tempPct = Math.min(100, Math.max(10, Math.round((point.weather.tempC / 38) * 100)));

  // Compute Stacked Source Attribution Share for Selected Area
  const rawTrafficW = (profile.trafficVehiclesPerHr / 2500) * 32;
  const rawCrackerW = profile.crackerMultiplier * 30;
  const rawStubbleW = profile.stubbleMultiplier * 28;
  const rawWeatherW = Math.max(8, (3.2 - Math.min(2.8, point.weather.windSpeed)) * 10);
  const rawTotal = rawTrafficW + rawCrackerW + rawStubbleW + rawWeatherW;
  const shareTraffic = Math.round((rawTrafficW / rawTotal) * 100);
  const shareCracker = Math.round((rawCrackerW / rawTotal) * 100);
  const shareStubble = Math.round((rawStubbleW / rawTotal) * 100);
  const shareWeather = Math.max(5, 100 - shareTraffic - shareCracker - shareStubble);

  return (
    <div className="simulator ai-analyzer">
      {/* Header + Active Area Summary Switcher */}
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

      {/* Collapsible Horizontal Carousel / Dropdown Selector */}
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

      {/* Currently Active Area Summary Strip with Visual Micro-Bars */}
      <div className="active-area-summary-strip">
        <div className="summary-stat">
          <span className="ambient-metric-label">CURRENT AQI</span>
          <strong style={{ color: aqiColor(point.aqi) }}>
            {point.aqi} ({point.category})
          </strong>
          <div className="mini-stat-bar">
            <span
              style={{
                width: `${Math.min(100, Math.round((point.aqi / 500) * 100))}%`,
                background: aqiColor(point.aqi),
              }}
            />
          </div>
        </div>
        <div className="summary-stat">
          <span className="ambient-metric-label">TRAFFIC FLOW</span>
          <strong>~{profile.trafficVehiclesPerHr.toLocaleString()}/hr</strong>
          <div className="mini-stat-bar">
            <span style={{ width: `${trafficLoadPct}%`, background: '#60a5fa' }} />
          </div>
        </div>
        <div className="summary-stat">
          <span className="ambient-metric-label">FIRECRACKER INDEX</span>
          <strong style={{ color: crackerColor }}>{profile.crackerMultiplier.toFixed(2)}×</strong>
          <div className="mini-stat-bar">
            <span style={{ width: `${Math.round(crackerNorm * 100)}%`, background: crackerColor }} />
          </div>
        </div>
        <div className="summary-stat">
          <span className="ambient-metric-label">DIWALI PEAK MITIGATION</span>
          <strong className="down-text">
            {activeSim
              ? `${activeSim.diwaliPeakBaselineAqi} → ${activeSim.diwaliPeakSimulatedAqi} AQI`
              : `−${profile.aiScenario.fireworksReductionPct}% plan`}
          </strong>
          <div className="mini-stat-bar">
            <span
              style={{
                width: `${activeSim ? Math.min(100, Math.round((activeSim.diwaliPeakSimulatedAqi / activeSim.diwaliPeakBaselineAqi) * 100)) : 65}%`,
                background: '#34d399',
              }}
            />
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Tabs */}
      <div className="inspector-tabs" role="tablist" aria-label="Hotspot Inspector Views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`inspector-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview · Visual Telemetry
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

      {/* Tab 1: Visual Telemetry Graphics (Replaces Plain Text Boxes) */}
      {activeTab === 'overview' && (
        <div className="inspector-tab-panel stage-transition">
          {/* Stacked Source Attribution Ribbon */}
          <div className="source-share-card">
            <div className="source-share-head">
              <span className="dataset-tag">POLLUTION SOURCE ATTRIBUTION SHARE · {area.name.toUpperCase()}</span>
              <span className="small muted">Real-time causal breakdown</span>
            </div>
            <div className="source-share-track" role="img" aria-label="Pollution source share bar">
              <div
                className="source-seg seg-traffic"
                style={{ width: `${shareTraffic}%` }}
                title={`Traffic Exhaust: ${shareTraffic}%`}
              />
              <div
                className="source-seg seg-cracker"
                style={{ width: `${shareCracker}%` }}
                title={`Firecracker Smoke: ${shareCracker}%`}
              />
              <div
                className="source-seg seg-stubble"
                style={{ width: `${shareStubble}%` }}
                title={`Crop Stubble Plume: ${shareStubble}%`}
              />
              <div
                className="source-seg seg-weather"
                style={{ width: `${shareWeather}%` }}
                title={`Inversion Trapping: ${shareWeather}%`}
              />
            </div>
            <div className="source-share-legend">
              <span>
                <i className="legend-dot" style={{ background: '#60a5fa' }} /> Traffic &amp; NO₂{' '}
                <strong>{shareTraffic}%</strong>
              </span>
              <span>
                <i className="legend-dot" style={{ background: '#f97316' }} /> Firecrackers{' '}
                <strong>{shareCracker}%</strong>
              </span>
              <span>
                <i className="legend-dot" style={{ background: '#fbbf24' }} /> Crop Smoke{' '}
                <strong>{shareStubble}%</strong>
              </span>
              <span>
                <i className="legend-dot" style={{ background: '#a78bfa' }} /> Cold Inversion{' '}
                <strong>{shareWeather}%</strong>
              </span>
            </div>
          </div>

          <div className="dialog-grid-2">
            {/* 1. TRAFFIC VISUAL GRAPH CARD */}
            <div className="dialog-stat-card visual-telemetry-card">
              <div className="visual-card-head">
                <div>
                  <span className="dataset-tag">TRAFFIC DEMO DATA</span>
                  <strong className="visual-card-value">
                    ~{profile.trafficVehiclesPerHr.toLocaleString()} <small>veh/hr</small>
                  </strong>
                </div>
                <span className="visual-Load-pill" style={{ color: '#93c5fd', borderColor: 'rgba(96,165,250,0.35)' }}>
                  {point.trafficIndex.toFixed(2)}× Index
                </span>
              </div>

              {/* 24h Traffic Rush-Hour Area Sparkline + Bar Histogram */}
              <div className="visual-sparkline-box">
                <svg viewBox="0 0 280 74" className="telemetry-svg" aria-label="24-hour corridor traffic sparkline">
                  <defs>
                    <linearGradient id={`trafficGrad-${area.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.48" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* Baseline grid lines */}
                  <line x1="10" y1="18" x2="270" y2="18" stroke="rgba(147,197,253,0.1)" strokeDasharray="3 3" />
                  <line x1="10" y1="38" x2="270" y2="38" stroke="rgba(147,197,253,0.1)" strokeDasharray="3 3" />
                  <polygon points={sparkAreaPoints} fill={`url(#trafficGrad-${area.id})`} />
                  <polyline
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparkPoints}
                  />
                  {hourlyTrafficRatios.map((ratio, idx) => {
                    const cx = 14 + idx * 28;
                    const cy = 56 - ratio * 42;
                    return (
                      <g key={idx}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={ratio === 1.0 ? 4 : 2.3}
                          fill={ratio === 1.0 ? '#ffffff' : '#60a5fa'}
                          stroke={ratio === 1.0 ? '#3b82f6' : 'none'}
                          strokeWidth={ratio === 1.0 ? 2 : 0}
                        />
                        <text x={cx} y="70" textAnchor="middle" fill="#93b4db" fontSize="8">
                          {hourlyTrafficLabels[idx]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="visual-meter-stack">
                <div className="visual-meter-row">
                  <div className="visual-meter-labels">
                    <span>Corridor Capacity ({profile.corridorType})</span>
                    <strong>{trafficLoadPct}%</strong>
                  </div>
                  <div className="visual-meter-bar">
                    <span
                      style={{
                        width: `${trafficLoadPct}%`,
                        background: 'linear-gradient(90deg, #38bdf8, #3b82f6)',
                      }}
                    />
                  </div>
                </div>
                <div className="visual-meter-row">
                  <div className="visual-meter-labels">
                    <span>Exhaust NO₂ Plume</span>
                    <strong>{metrics.no2} µg/m³</strong>
                  </div>
                  <div className="visual-meter-bar">
                    <span
                      style={{
                        width: `${no2LoadPct}%`,
                        background: 'linear-gradient(90deg, #60a5fa, #818cf8)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. FIRECRACKER RADIAL GAUGE & CHEMISTRY CARD */}
            <div className="dialog-stat-card visual-telemetry-card">
              <div className="visual-card-head">
                <div>
                  <span className="dataset-tag">FIRECRACKER DEMO DATA</span>
                  <strong className="visual-card-value" style={{ color: crackerColor }}>
                    {profile.crackerMultiplier.toFixed(2)}× <small>intensity</small>
                  </strong>
                </div>
                <span
                  className="visual-Load-pill"
                  style={{ color: crackerColor, borderColor: `${crackerColor}55` }}
                >
                  {profile.crackerIndex.replace(/^[0-9.]+×\s*\(|\)$/g, '')}
                </span>
              </div>

              <div className="cracker-visual-split">
                {/* Semi-Circular Radial Speedometer Gauge */}
                <div className="radial-gauge-wrap">
                  <svg viewBox="0 0 160 88" className="cracker-gauge-svg" aria-label="Firecracker intensity gauge">
                    <defs>
                      <linearGradient id={`crackerArc-${area.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    {/* Track */}
                    <path
                      d="M 28 68 A 52 52 0 0 1 132 68"
                      fill="none"
                      stroke="rgba(147, 197, 253, 0.14)"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    {/* Colored Arc */}
                    <path
                      d="M 28 68 A 52 52 0 0 1 132 68"
                      fill="none"
                      stroke={`url(#crackerArc-${area.id})`}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.round(crackerNorm * 163)} 164`}
                    />
                    {/* Pointer Dot */}
                    <circle
                      cx={needlePos.x}
                      cy={needlePos.y}
                      r="6"
                      fill="#ffffff"
                      stroke={crackerColor}
                      strokeWidth="3"
                    />
                    <text x="80" y="62" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="800">
                      {profile.crackerMultiplier.toFixed(2)}×
                    </text>
                    <text x="26" y="82" textAnchor="middle" fill="#93b4db" fontSize="8.5">
                      0.5× Low
                    </text>
                    <text x="134" y="82" textAnchor="middle" fill="#93b4db" fontSize="8.5">
                      1.5× Max
                    </text>
                  </svg>
                </div>

                {/* Chemical Plume Signature Bars */}
                <div className="chemical-bars-col">
                  <div className="visual-meter-row">
                    <div className="visual-meter-labels">
                      <span>Sulfur (SO₂)</span>
                      <strong>{sulfurPct}%</strong>
                    </div>
                    <div className="visual-meter-bar">
                      <span style={{ width: `${sulfurPct}%`, background: '#fbbf24' }} />
                    </div>
                  </div>
                  <div className="visual-meter-row">
                    <div className="visual-meter-labels">
                      <span>Barium (Ba²⁺)</span>
                      <strong>{bariumPct}%</strong>
                    </div>
                    <div className="visual-meter-bar">
                      <span style={{ width: `${bariumPct}%`, background: '#f97316' }} />
                    </div>
                  </div>
                  <div className="visual-meter-row">
                    <div className="visual-meter-labels">
                      <span>Potassium (KNO₃)</span>
                      <strong>{potassiumPct}%</strong>
                    </div>
                    <div className="visual-meter-bar">
                      <span style={{ width: `${potassiumPct}%`, background: '#fb7185' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. CROP SMOKE RADAR & PLUME TRANSPORT GRAPHIC */}
            <div className="dialog-stat-card visual-telemetry-card">
              <div className="visual-card-head">
                <div>
                  <span className="dataset-tag">CROP SMOKE DEMO DATA (NASA VIIRS)</span>
                  <strong className="visual-card-value" style={{ color: '#fbbf24' }}>
                    {point.fireCount.toLocaleString()} <small>upwind fires</small>
                  </strong>
                </div>
                <span
                  className="visual-Load-pill"
                  style={{ color: '#fcd34d', borderColor: 'rgba(251, 191, 36, 0.38)' }}
                >
                  {profile.stubbleMultiplier.toFixed(2)}× Exposure
                </span>
              </div>

              <div className="cracker-visual-split">
                {/* NASA VIIRS Upwind Radar Graphic */}
                <div className="radar-graphic-wrap">
                  <svg viewBox="0 0 110 92" className="viirs-radar-svg" aria-label="Upwind crop fire radar">
                    <circle cx="55" cy="46" r="38" fill="rgba(15, 29, 62, 0.55)" stroke="rgba(147,197,253,0.18)" />
                    <circle cx="55" cy="46" r="25" fill="none" stroke="rgba(147,197,253,0.14)" strokeDasharray="2 2" />
                    <circle cx="55" cy="46" r="12" fill="none" stroke="rgba(147,197,253,0.14)" />
                    {/* NW Plume Sector Cone */}
                    <path
                      d="M 55 46 L 22 18 A 42 42 0 0 1 62 8 Z"
                      fill="rgba(251, 146, 60, 0.24)"
                    />
                    {/* Thermal Hotspot Dots */}
                    <circle cx="34" cy="24" r="3.5" fill="#f97316" />
                    <circle cx="45" cy="19" r="3" fill="#ef4444" />
                    <circle cx="29" cy="33" r="2.5" fill="#fbbf24" />
                    <circle cx="50" cy="28" r="2.8" fill="#f97316" />
                    {/* Wind Drift Vector to Ward Center */}
                    <line x1="36" y1="24" x2="52" y2="43" stroke="#fbbf24" strokeWidth="1.6" strokeDasharray="3 2" />
                    <circle cx="55" cy="46" r="4.2" fill="#60a5fa" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="55" y="88" textAnchor="middle" fill="#93b4db" fontSize="8">
                      NW Malwa Plume → Ward
                    </text>
                  </svg>
                </div>

                {/* 7-Day Fire Intensity Mini Histogram + Canopy Filter Bar */}
                <div className="chemical-bars-col">
                  <div className="mini-fire-bars" aria-label="7-day fire trend">
                    {weekFireBars.map((b, i) => (
                      <div key={i} className="mini-fire-col">
                        <div className="mini-fire-bar-track">
                          <span
                            style={{
                              height: `${Math.round(b * Math.max(45, fireLoadPct))}%`,
                              background: i === 6 ? '#f97316' : '#fbbf24',
                            }}
                          />
                        </div>
                        <small>D{i - 6 || '0'}</small>
                      </div>
                    ))}
                  </div>
                  <div className="visual-meter-row">
                    <div className="visual-meter-labels">
                      <span>Plume Penetration</span>
                      <strong>{plumePenetrationPct}%</strong>
                    </div>
                    <div className="visual-meter-bar">
                      <span
                        style={{
                          width: `${plumePenetrationPct}%`,
                          background: 'linear-gradient(90deg, #fbbf24, #ef4444)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="visual-meter-row">
                    <div className="visual-meter-labels">
                      <span>Tree Canopy Shield</span>
                      <strong style={{ color: '#6ee7b7' }}>{canopyShieldPct}%</strong>
                    </div>
                    <div className="visual-meter-bar">
                      <span style={{ width: `${canopyShieldPct}%`, background: '#34d399' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. WEATHER & SENSORS MULTI-GAUGE CARD */}
            <div className="dialog-stat-card visual-telemetry-card">
              <div className="visual-card-head">
                <div>
                  <span className="dataset-tag">WEATHER &amp; SENSORS DEMO DATA</span>
                  <strong className="visual-card-value">
                    PM2.5 {metrics.pm25} <small>µg/m³</small>
                  </strong>
                </div>
                <span className="visual-Load-pill" style={{ color: '#93c5fd', borderColor: 'rgba(96,165,250,0.35)' }}>
                  Wind {point.weather.windSpeed.toFixed(1)} m/s
                </span>
              </div>

              {/* 3 Circular Sensor Donut Rings: PM2.5, PM10, Wind Speed */}
              <div className="sensor-rings-grid">
                <div className="sensor-ring-item">
                  <svg viewBox="0 0 64 64" className="sensor-ring-svg">
                    <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(147,197,253,0.14)" strokeWidth="6" />
                    <circle
                      cx="32"
                      cy="32"
                      r="24"
                      fill="none"
                      stroke={aqiColor(point.aqi)}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.round((pm25RingPct / 100) * 150.8)} 151`}
                      transform="rotate(-90 32 32)"
                    />
                    <text x="32" y="31" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">
                      {Math.round(metrics.pm25)}
                    </text>
                    <text x="32" y="42" textAnchor="middle" fill="#93b4db" fontSize="7.5">
                      µg/m³
                    </text>
                  </svg>
                  <span className="sensor-ring-label">PM2.5 Fine</span>
                </div>

                <div className="sensor-ring-item">
                  <svg viewBox="0 0 64 64" className="sensor-ring-svg">
                    <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(147,197,253,0.14)" strokeWidth="6" />
                    <circle
                      cx="32"
                      cy="32"
                      r="24"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.round((pm10RingPct / 100) * 150.8)} 151`}
                      transform="rotate(-90 32 32)"
                    />
                    <text x="32" y="31" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">
                      {Math.round(metrics.pm10)}
                    </text>
                    <text x="32" y="42" textAnchor="middle" fill="#93b4db" fontSize="7.5">
                      µg/m³
                    </text>
                  </svg>
                  <span className="sensor-ring-label">PM10 Coarse</span>
                </div>

                <div className="sensor-ring-item">
                  <svg viewBox="0 0 64 64" className="sensor-ring-svg">
                    <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(147,197,253,0.14)" strokeWidth="6" />
                    <circle
                      cx="32"
                      cy="32"
                      r="24"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.round((windSpeedPct / 100) * 150.8)} 151`}
                      transform="rotate(-90 32 32)"
                    />
                    <text x="32" y="31" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">
                      {point.weather.windSpeed.toFixed(1)}
                    </text>
                    <text x="32" y="42" textAnchor="middle" fill="#93b4db" fontSize="7.5">
                      m/s NW
                    </text>
                  </svg>
                  <span className="sensor-ring-label">Wind Dispersion</span>
                </div>
              </div>

              {/* Humidity & Temperature Visual Progress Bars */}
              <div className="visual-meter-stack">
                <div className="visual-meter-row">
                  <div className="visual-meter-labels">
                    <span>Relative Humidity</span>
                    <strong>{humidityPct}%</strong>
                  </div>
                  <div className="visual-meter-bar">
                    <span
                      style={{
                        width: `${humidityPct}%`,
                        background: 'linear-gradient(90deg, #38bdf8, #60a5fa)',
                      }}
                    />
                  </div>
                </div>
                <div className="visual-meter-row">
                  <div className="visual-meter-labels">
                    <span>Ambient Temperature</span>
                    <strong>{point.weather.tempC.toFixed(1)} °C</strong>
                  </div>
                  <div className="visual-meter-bar">
                    <span
                      style={{
                        width: `${tempPct}%`,
                        background: 'linear-gradient(90deg, #60a5fa, #f59e0b)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Insights & Action Plan with Visual Before/After Bars & Policy Rings */}
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
            <div className="visual-before-after-card">
              <div className="source-share-head">
                <span className="dataset-tag">DIWALI PEAK AQI · BEFORE VS. AFTER AI MITIGATION</span>
                <strong className="down-text">−{activeSim.diwaliPeakPm25Saved} µg/m³ PM2.5 Saved</strong>
              </div>
              <div className="ba-bars-stack">
                <div className="ba-bar-row">
                  <div className="ba-bar-label">
                    <span>Baseline Peak</span>
                    <strong style={{ color: aqiColor(activeSim.diwaliPeakBaselineAqi) }}>
                      {activeSim.diwaliPeakBaselineAqi} AQI
                    </strong>
                  </div>
                  <div className="ba-bar-track">
                    <span
                      style={{
                        width: `${Math.min(100, Math.round((activeSim.diwaliPeakBaselineAqi / 500) * 100))}%`,
                        background: aqiColor(activeSim.diwaliPeakBaselineAqi),
                      }}
                    />
                  </div>
                </div>
                <div className="ba-bar-row">
                  <div className="ba-bar-label">
                    <span>With AI Action Plan</span>
                    <strong style={{ color: aqiColor(activeSim.diwaliPeakSimulatedAqi) }}>
                      {activeSim.diwaliPeakSimulatedAqi} AQI
                    </strong>
                  </div>
                  <div className="ba-bar-track">
                    <span
                      style={{
                        width: `${Math.min(100, Math.round((activeSim.diwaliPeakSimulatedAqi / 500) * 100))}%`,
                        background: aqiColor(activeSim.diwaliPeakSimulatedAqi),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Policy Lever Gauges */}
          <div className="policy-gauges-grid">
            <div className="policy-gauge-card">
              <span className="ambient-metric-label">FIRECRACKER CURB</span>
              <strong style={{ color: '#fbbf24' }}>−{profile.aiScenario.fireworksReductionPct}%</strong>
              <div className="visual-meter-bar">
                <span style={{ width: `${profile.aiScenario.fireworksReductionPct}%`, background: '#fbbf24' }} />
              </div>
            </div>
            <div className="policy-gauge-card">
              <span className="ambient-metric-label">TRAFFIC SMOOTHING</span>
              <strong style={{ color: '#60a5fa' }}>−{profile.aiScenario.trafficReductionPct}%</strong>
              <div className="visual-meter-bar">
                <span style={{ width: `${profile.aiScenario.trafficReductionPct}%`, background: '#60a5fa' }} />
              </div>
            </div>
            <div className="policy-gauge-card">
              <span className="ambient-metric-label">CROP SMOKE CONTROL</span>
              <strong style={{ color: '#34d399' }}>−{profile.aiScenario.stubbleReductionPct}%</strong>
              <div className="visual-meter-bar">
                <span style={{ width: `${profile.aiScenario.stubbleReductionPct}%`, background: '#34d399' }} />
              </div>
            </div>
          </div>

          <div className="personal-advice-card" style={{ marginTop: 14, marginBottom: 0 }}>
            <span className="dataset-tag">RECOMMENDED MITIGATION PROTOCOL</span>
            <span className="small">{profile.aiActionSummary}</span>
          </div>
        </div>
      )}

      {/* Tab 3: All 12 Areas Visual Bar Comparison */}
      {activeTab === 'comparison' && (
        <div className="inspector-tab-panel stage-transition">
          <div className="table-scroll-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Neighborhood</th>
                  <th>Traffic Load</th>
                  <th>Firecracker Index</th>
                  <th>Current AQI</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => {
                  const p = f.points[dayIndex] ?? f.points[0];
                  const hp = HOTSPOT_PROFILES[f.neighborhood.id] ?? HOTSPOT_PROFILES['thapar-prem-nagar'];
                  const tPct = Math.min(100, Math.round((hp.trafficVehiclesPerHr / 2500) * 100));
                  const cPct = Math.min(100, Math.round((hp.crackerMultiplier / 1.4) * 100));
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
                      <td>
                        <div className="table-bar-cell">
                          <span>~{hp.trafficVehiclesPerHr}/hr</span>
                          <div className="table-mini-bar">
                            <span style={{ width: `${tPct}%`, background: '#60a5fa' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-bar-cell">
                          <span>{hp.crackerMultiplier.toFixed(2)}×</span>
                          <div className="table-mini-bar">
                            <span
                              style={{
                                width: `${cPct}%`,
                                background: hp.crackerMultiplier >= 1.15 ? '#f97316' : '#fbbf24',
                              }}
                            />
                          </div>
                        </div>
                      </td>
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
