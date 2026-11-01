import { useEffect, useState } from 'react';
import {
  type InterventionScenario,
  type NeighborhoodForecast,
  type SimulationResult,
} from '@vaayuvision/shared';
import { api } from '../api';
import { useUserPreferences } from '../context/UserPreferencesContext';

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
  areaTag: string;
  trafficVehiclesPerHr: number;
  crackerLevel: number; // 0 to 100
  smokeLevel: number; // 0 to 100
  aiScenario: InterventionScenario;
  simpleSummary: string;
  simplePlan: string;
}

type InspectorTab = 'overview' | 'insights' | 'comparison';

/** Simple 3-color traffic-light helper: Green (Good/Low), Yellow (Medium), Red (High/Bad) */
function simpleLevelColor(pct: number): string {
  if (pct < 45) return '#22c55e'; // Green
  if (pct < 72) return '#eab308'; // Yellow
  return '#ef4444'; // Red
}

function simpleLevelText(pct: number): 'Low' | 'Medium' | 'High' {
  if (pct < 45) return 'Low';
  if (pct < 72) return 'Medium';
  return 'High';
}

function simpleAqiColor(aqi: number): string {
  if (aqi <= 120) return '#22c55e'; // Green
  if (aqi <= 250) return '#eab308'; // Yellow
  return '#ef4444'; // Red
}

const HOTSPOT_PROFILES: Record<string, HotspotDatasetProfile> = {
  'thapar-prem-nagar': {
    areaTag: 'College & Hostel Area',
    trafficVehiclesPerHr: 1450,
    crackerLevel: 58,
    smokeLevel: 68,
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 35, stubbleReductionPct: 70, artificialRain: true },
    simpleSummary:
      'Evening road traffic and smoke from nearby farm fields get trapped when the night air turns cold.',
    simplePlan: 'Use green crackers, reduce evening road traffic on Bhadson Road, and spray water mist to settle dust.',
  },
  'adalat-bazar': {
    areaTag: 'Busy Old-City Market',
    trafficVehiclesPerHr: 2300,
    crackerLevel: 92,
    smokeLevel: 65,
    aiScenario: { fireworksReductionPct: 80, trafficReductionPct: 50, stubbleReductionPct: 55, artificialRain: true },
    simpleSummary:
      'Narrow market streets trap heavy Diwali firecracker smoke and slow-moving shopping traffic.',
    simplePlan: 'Limit heavy firecrackers in narrow lanes and keep main bazaar roads car-free during peak evening hours.',
  },
  tripuri: {
    areaTag: 'Dense Residential & Market Area',
    trafficVehiclesPerHr: 1950,
    crackerLevel: 86,
    smokeLevel: 72,
    aiScenario: { fireworksReductionPct: 75, trafficReductionPct: 40, stubbleReductionPct: 60, artificialRain: true },
    simpleSummary:
      'High rooftop firecracker bursting and market traffic cause thick morning and evening smog here.',
    simplePlan: 'Switch to community green fireworks and smooth out evening market traffic.',
  },
  'focal-point': {
    areaTag: 'Factory & Truck Zone',
    trafficVehiclesPerHr: 2100,
    crackerLevel: 60,
    smokeLevel: 78,
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 55, stubbleReductionPct: 65, artificialRain: true },
    simpleSummary:
      'Heavy trucks, factory smoke, and nearby farm smoke keep dust levels high all day.',
    simplePlan: 'Control factory exhaust, reroute heavy trucks at peak hours, and sprinkle water on dusty roads.',
  },
  'leela-bhawan': {
    areaTag: 'Main Shopping Center',
    trafficVehiclesPerHr: 2450,
    crackerLevel: 76,
    smokeLevel: 58,
    aiScenario: { fireworksReductionPct: 65, trafficReductionPct: 50, stubbleReductionPct: 50, artificialRain: true },
    simpleSummary:
      'This area has the busiest car and scooter traffic in Patiala, causing high vehicle smoke in the evening.',
    simplePlan: 'Manage parking and traffic flow at Leela Bhawan chowk and cut down evening firecrackers.',
  },
  'bus-stand': {
    areaTag: 'Bus Stand & Highway',
    trafficVehiclesPerHr: 2400,
    crackerLevel: 64,
    smokeLevel: 66,
    aiScenario: { fireworksReductionPct: 55, trafficReductionPct: 55, stubbleReductionPct: 55, artificialRain: true },
    simpleSummary:
      'Buses and highway trucks create constant exhaust smoke and road dust from morning to night.',
    simplePlan: 'Stop bus engine idling at the stand, smooth highway traffic, and spray water to stop road dust.',
  },
  'model-town': {
    areaTag: 'Residential Neighborhood',
    trafficVehiclesPerHr: 1350,
    crackerLevel: 78,
    smokeLevel: 56,
    aiScenario: { fireworksReductionPct: 70, trafficReductionPct: 35, stubbleReductionPct: 55, artificialRain: true },
    simpleSummary:
      'Daytime air is decent, but heavy neighborhood fireworks on Diwali night get trapped in calm air.',
    simplePlan: 'Encourage green crackers in residential parks and keep through-traffic light.',
  },
  'urban-estate': {
    areaTag: 'Residential Sector & Bypass',
    trafficVehiclesPerHr: 1400,
    crackerLevel: 74,
    smokeLevel: 70,
    aiScenario: { fireworksReductionPct: 65, trafficReductionPct: 35, stubbleReductionPct: 65, artificialRain: true },
    simpleSummary:
      'Smoke from eastern farm fields mixes with residential fireworks in the evening.',
    simplePlan: 'Reduce farm smoke drifting from the east and limit late-night firecrackers.',
  },
  'ranjit-nagar': {
    areaTag: 'Outer Residential Area',
    trafficVehiclesPerHr: 1600,
    crackerLevel: 72,
    smokeLevel: 76,
    aiScenario: { fireworksReductionPct: 60, trafficReductionPct: 40, stubbleReductionPct: 70, artificialRain: true },
    simpleSummary:
      'Close to open fields, so farm smoke blows straight into the neighborhood along with local fireworks.',
    simplePlan: 'Stop nearby field burning and cut down evening fireworks and road dust.',
  },
  'sanaur-road': {
    areaTag: 'Farm & Mandi Belt',
    trafficVehiclesPerHr: 1250,
    crackerLevel: 55,
    smokeLevel: 88,
    aiScenario: { fireworksReductionPct: 45, trafficReductionPct: 35, stubbleReductionPct: 80, artificialRain: true },
    simpleSummary:
      'Farm smoke from surrounding fields is the #1 reason for poor air here.',
    simplePlan: 'Focus on stopping crop-field smoke and controlling grain-market road dust.',
  },
  'punjabi-uni': {
    areaTag: 'Green University Campus',
    trafficVehiclesPerHr: 980,
    crackerLevel: 35,
    smokeLevel: 52,
    aiScenario: { fireworksReductionPct: 45, trafficReductionPct: 30, stubbleReductionPct: 60, artificialRain: false },
    simpleSummary:
      'Lots of campus trees keep the air cleaner than the rest of the city, with only light highway traffic smoke.',
    simplePlan: 'Keep campus green buffer protected and manage traffic outside the main gate.',
  },
  'baradari-gardens': {
    areaTag: 'City Park & Green Zone',
    trafficVehiclesPerHr: 820,
    crackerLevel: 28,
    smokeLevel: 38,
    aiScenario: { fireworksReductionPct: 50, trafficReductionPct: 30, stubbleReductionPct: 55, artificialRain: false },
    simpleSummary:
      'Cleanest air in Patiala because thick park trees block dust and very few firecrackers are burst here.',
    simplePlan: 'Keep the park zone firework-free and calm traffic around the garden roads.',
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

  // Simple 0-100% levels with 3-color coding (Green = Low, Yellow = Medium, Red = High)
  const trafficPct = Math.min(100, Math.round((profile.trafficVehiclesPerHr / 2500) * 100));
  const crackerPct = profile.crackerLevel;
  const smokePct = profile.smokeLevel;
  // Low wind = high trapped air
  const trappedAirPct = Math.min(100, Math.max(20, Math.round(((3.2 - Math.min(3.0, point.weather.windSpeed)) / 3.0) * 100)));

  // 4 Simple Time-of-Day bars for Road Traffic (Morning, Afternoon, Evening, Night)
  const timeSlots = [
    { label: 'Morning', pct: Math.round(trafficPct * 0.75) },
    { label: 'Afternoon', pct: Math.round(trafficPct * 0.6) },
    { label: 'Evening', pct: trafficPct },
    { label: 'Night', pct: Math.round(trafficPct * 0.35) },
  ];

  const mainCauses = [
    { label: 'Road Traffic', pct: trafficPct },
    { label: 'Firecrackers', pct: crackerPct },
    { label: 'Farm Smoke', pct: smokePct },
    { label: 'Low Wind (Trapped Air)', pct: trappedAirPct },
  ];

  return (
    <div className="simulator ai-analyzer">
      {/* Top Area Switcher */}
      <div className="inspector-top-bar">
        <div>
          <span className="section-kicker">AREA POLLUTION BREAKDOWN</span>
          <h3 className="inspector-heading">{area.name}</h3>
          <span className="muted small">{profile.areaTag}</span>
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
              <span className="status-dot" style={{ background: simpleAqiColor(point.aqi) }} />
              <span>
                {currentIdx + 1}/{forecasts.length} · Change Area
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

      {/* Collapsible Area List */}
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
                  <span className="status-dot" style={{ background: simpleAqiColor(p.aqi) }} />
                  <span>{f.neighborhood.name}</span>
                  <span className="hotspot-pill-aqi">AQI {p.aqi}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Simple 3-Color Legend Strip */}
      <div className="simple-color-legend">
        <span className="simple-legend-title">Simple Color Guide:</span>
        <span className="simple-legend-item">
          <i className="status-dot" style={{ background: '#22c55e' }} /> Green = Low / Good
        </span>
        <span className="simple-legend-item">
          <i className="status-dot" style={{ background: '#eab308' }} /> Yellow = Medium
        </span>
        <span className="simple-legend-item">
          <i className="status-dot" style={{ background: '#ef4444' }} /> Red = High / Bad
        </span>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs" role="tablist" aria-label="Inspector Views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`inspector-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Simple Visuals
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'insights'}
          className={`inspector-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          How to Fix It (AI Plan)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'comparison'}
          className={`inspector-tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Compare All 12 Areas
        </button>
      </div>

      {/* TAB 1: Super Simple Visual Graphs */}
      {activeTab === 'overview' && (
        <div className="inspector-tab-panel stage-transition">
          {/* 1. Main Bar Chart: What's Causing Pollution Here? */}
          <div className="simple-chart-box">
            <div className="simple-chart-header">
              <strong>What’s Causing Pollution in {area.name}?</strong>
              <span className="muted small">Bigger bar = bigger problem</span>
            </div>
            <div className="simple-bars-list">
              {mainCauses.map((item) => {
                const color = simpleLevelColor(item.pct);
                const level = simpleLevelText(item.pct);
                return (
                  <div key={item.label} className="simple-bar-row">
                    <div className="simple-bar-top">
                      <span>{item.label}</span>
                      <strong style={{ color }}>
                        {level} ({item.pct}%)
                      </strong>
                    </div>
                    <div className="simple-bar-track">
                      <span style={{ width: `${item.pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Four Simple Cards (1 Clean Visual Per Card, Zero Jargon) */}
          <div className="dialog-grid-2">
            {/* Card 1: Road Traffic */}
            <div className="dialog-stat-card simple-visual-card">
              <div className="simple-card-top">
                <div>
                  <span className="dataset-tag">1. ROAD TRAFFIC</span>
                  <strong className="simple-big-text">~{profile.trafficVehiclesPerHr.toLocaleString()} cars/hr</strong>
                </div>
                <span
                  className="simple-status-pill"
                  style={{
                    color: simpleLevelColor(trafficPct),
                    borderColor: simpleLevelColor(trafficPct),
                  }}
                >
                  {simpleLevelText(trafficPct)}
                </span>
              </div>

              {/* Simple 4-Bar Chart: Morning, Afternoon, Evening, Night */}
              <div className="simple-column-chart">
                {timeSlots.map((slot) => {
                  const barColor = simpleLevelColor(slot.pct);
                  return (
                    <div key={slot.label} className="simple-col-item">
                      <span className="simple-col-val" style={{ color: barColor }}>
                        {slot.pct}%
                      </span>
                      <div className="simple-col-track">
                        <span style={{ height: `${slot.pct}%`, background: barColor }} />
                      </div>
                      <span className="simple-col-label">{slot.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Firecrackers */}
            <div className="dialog-stat-card simple-visual-card">
              <div className="simple-card-top">
                <div>
                  <span className="dataset-tag">2. FIRECRACKER SMOKE</span>
                  <strong className="simple-big-text">{simpleLevelText(crackerPct)} Fireworks</strong>
                </div>
                <span
                  className="simple-status-pill"
                  style={{
                    color: simpleLevelColor(crackerPct),
                    borderColor: simpleLevelColor(crackerPct),
                  }}
                >
                  {crackerPct}%
                </span>
              </div>

              <div className="simple-meter-section">
                <div className="simple-bar-track thick">
                  <span style={{ width: `${crackerPct}%`, background: simpleLevelColor(crackerPct) }} />
                </div>
                <div className="simple-meter-scale">
                  <span>Low (Clean)</span>
                  <span>Medium</span>
                  <span>High (Smoky)</span>
                </div>
                <p className="muted small" style={{ margin: '6px 0 0' }}>
                  {crackerPct < 45
                    ? 'Very few firecrackers are burst in this green zone.'
                    : crackerPct < 72
                      ? 'Moderate firecracker smoke in the evening.'
                      : 'Heavy firecracker smoke gets trapped here on Diwali night.'}
                </p>
              </div>
            </div>

            {/* Card 3: Farm Smoke */}
            <div className="dialog-stat-card simple-visual-card">
              <div className="simple-card-top">
                <div>
                  <span className="dataset-tag">3. FARM SMOKE</span>
                  <strong className="simple-big-text">{simpleLevelText(smokePct)} Field Smoke</strong>
                </div>
                <span
                  className="simple-status-pill"
                  style={{
                    color: simpleLevelColor(smokePct),
                    borderColor: simpleLevelColor(smokePct),
                  }}
                >
                  {smokePct}%
                </span>
              </div>

              <div className="simple-meter-section">
                <div className="simple-bar-track thick">
                  <span style={{ width: `${smokePct}%`, background: simpleLevelColor(smokePct) }} />
                </div>
                <div className="simple-meter-scale">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
                <p className="muted small" style={{ margin: '6px 0 0' }}>
                  {smokePct < 45
                    ? 'Trees block most of the outside farm smoke here.'
                    : smokePct < 72
                      ? 'Some crop smoke blows in from nearby villages.'
                      : 'Strong farm smoke blows directly into this area.'}
                </p>
              </div>
            </div>

            {/* Card 4: Weather & Wind */}
            <div className="dialog-stat-card simple-visual-card">
              <div className="simple-card-top">
                <div>
                  <span className="dataset-tag">4. WEATHER &amp; WIND</span>
                  <strong className="simple-big-text">
                    {trappedAirPct >= 70 ? 'Air is Trapped' : trappedAirPct >= 45 ? 'Slow Breeze' : 'Good Breeze'}
                  </strong>
                </div>
                <span
                  className="simple-status-pill"
                  style={{
                    color: simpleLevelColor(trappedAirPct),
                    borderColor: simpleLevelColor(trappedAirPct),
                  }}
                >
                  {point.weather.windSpeed.toFixed(1)} m/s Wind
                </span>
              </div>

              <div className="simple-meter-section">
                <div className="simple-bar-track thick">
                  <span style={{ width: `${trappedAirPct}%`, background: simpleLevelColor(trappedAirPct) }} />
                </div>
                <div className="simple-meter-scale">
                  <span>Windy (Good)</span>
                  <span>Calm</span>
                  <span>Stuck Air (Bad)</span>
                </div>
                <p className="muted small" style={{ margin: '6px 0 0' }}>
                  Temp: {point.weather.tempC.toFixed(0)}°C · Humidity: {Math.round(point.weather.humidity)}% — Cool,
                  slow air keeps smoke near the ground.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Simple Before vs After AI Plan */}
      {activeTab === 'insights' && (
        <div className="inspector-tab-panel stage-transition">
          <div className="simple-chart-box">
            <strong>Why It Gets Polluted Here</strong>
            <p className="verdict-lead" style={{ margin: '6px 0 0' }}>
              {userName ? `${userName}, ` : ''}
              {profile.simpleSummary}
            </p>
          </div>

          {activeSim && (
            <div className="simple-chart-box">
              <div className="simple-chart-header">
                <strong>Diwali Night AQI: Before vs. After Action Plan</strong>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>
                  −{activeSim.avgPm25SavedPct}% Less Pollution
                </span>
              </div>

              <div className="simple-bars-list" style={{ marginTop: 10 }}>
                <div className="simple-bar-row">
                  <div className="simple-bar-top">
                    <span>Without Action (Current Trend)</span>
                    <strong style={{ color: simpleAqiColor(activeSim.diwaliPeakBaselineAqi) }}>
                      {activeSim.diwaliPeakBaselineAqi} AQI
                    </strong>
                  </div>
                  <div className="simple-bar-track thick">
                    <span
                      style={{
                        width: `${Math.min(100, Math.round((activeSim.diwaliPeakBaselineAqi / 500) * 100))}%`,
                        background: simpleAqiColor(activeSim.diwaliPeakBaselineAqi),
                      }}
                    />
                  </div>
                </div>

                <div className="simple-bar-row">
                  <div className="simple-bar-top">
                    <span>With AI Action Plan</span>
                    <strong style={{ color: simpleAqiColor(activeSim.diwaliPeakSimulatedAqi) }}>
                      {activeSim.diwaliPeakSimulatedAqi} AQI (Cleaner!)
                    </strong>
                  </div>
                  <div className="simple-bar-track thick">
                    <span
                      style={{
                        width: `${Math.min(100, Math.round((activeSim.diwaliPeakSimulatedAqi / 500) * 100))}%`,
                        background: simpleAqiColor(activeSim.diwaliPeakSimulatedAqi),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="simple-chart-box" style={{ marginBottom: 0 }}>
            <strong>Simple Steps That Fix It</strong>
            <p className="small muted" style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
              {profile.simplePlan}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: Simple 12-Area Comparison */}
      {activeTab === 'comparison' && (
        <div className="inspector-tab-panel stage-transition">
          <div className="table-scroll-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Traffic</th>
                  <th>Firecrackers</th>
                  <th>Current AQI</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => {
                  const p = f.points[dayIndex] ?? f.points[0];
                  const hp = HOTSPOT_PROFILES[f.neighborhood.id] ?? HOTSPOT_PROFILES['thapar-prem-nagar'];
                  const tPct = Math.min(100, Math.round((hp.trafficVehiclesPerHr / 2500) * 100));
                  const cPct = hp.crackerLevel;
                  const aColor = simpleAqiColor(p.aqi);
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
                        <span style={{ color: simpleLevelColor(tPct), fontWeight: 700 }}>
                          ● {simpleLevelText(tPct)}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: simpleLevelColor(cPct), fontWeight: 700 }}>
                          ● {simpleLevelText(cPct)}
                        </span>
                      </td>
                      <td>
                        <div className="table-bar-cell">
                          <strong style={{ color: aColor }}>{p.aqi} AQI</strong>
                          <div className="table-mini-bar">
                            <span
                              style={{
                                width: `${Math.min(100, Math.round((p.aqi / 500) * 100))}%`,
                                background: aColor,
                              }}
                            />
                          </div>
                        </div>
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
