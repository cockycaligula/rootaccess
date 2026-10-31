import { useState } from 'react';
import {
  AQI_ADVICE,
  aqiColor,
  type DailyObservation,
  type DiwaliOutlook,
  type ForecastPoint,
  type NeighborhoodForecast,
} from '@vaayuvision/shared';
import { formatDate } from '../format';
import { TrendChart } from './TrendChart';
import { HourlyChart } from './HourlyChart';
import { buildPollutantMetrics, useUserPreferences } from '../context/UserPreferencesContext';

interface Props {
  forecast: NeighborhoodForecast;
  simulatedPoints?: ForecastPoint[] | null;
  history: DailyObservation[];
  outlook: DiwaliOutlook | null;
  dayIndex: number;
  diwaliDate: string;
}

type DialogType = 'why-area' | 'demo-data' | 'ai-predictions' | 'charts' | 'health' | null;

const PHASE_TITLES = {
  before: 'Before Diwali (7 Days Prior)',
  during: 'During Diwali (Peak Night & Next Day)',
  after: 'After Diwali (Post-Festival Week)',
};

const AREA_DEMO_PROFILE: Record<
  string,
  {
    trafficFlow: string;
    crackerIntensity: string;
    crackerPct: string;
    stubbleSmoke: string;
    corridorNote: string;
  }
> = {
  'thapar-prem-nagar': {
    trafficFlow: 'Moderate-High (Bhadson Rd & Campus Gate · ~1,450 vehicles/hr)',
    crackerIntensity: 'Moderate Residential & Hostel Bursting (0.90× city index)',
    crackerPct: '+42% evening PM2.5 spike on Diwali night',
    stubbleSmoke: 'High NW Sangrur / Nabha Crop Plume Inflow (0.95× index)',
    corridorNote: 'Evening two-wheeler & auto traffic along Bhadson Rd mixes with NW crop smoke under cool night air.',
  },
  'adalat-bazar': {
    trafficFlow: 'Heavy Bazaar Congestion (Qila Mubarak & Anardana Chowk · ~2,300 vehicles/hr)',
    crackerIntensity: 'Extreme Old-City Firecracker Density (1.35× city index)',
    crackerPct: '+94% severe street-canyon PM2.5 surge on Diwali night',
    stubbleSmoke: 'Moderate Regional Plume Drift (0.95× index)',
    corridorNote: 'Narrow heritage streets trap festive bazaar vehicle fumes and dense firecracker smoke.',
  },
  tripuri: {
    trafficFlow: 'High Market & Residential Flow (Tripuri Main Rd · ~1,950 vehicles/hr)',
    crackerIntensity: 'Very High Rooftop Firecracker Bursting (1.30× city index)',
    crackerPct: '+86% evening PM2.5 surge on Diwali night',
    stubbleSmoke: 'High Sirhind Road Agricultural Smoke (1.00× index)',
    corridorNote: 'Dense residential firecrackers combine with northern bypass crop smoke.',
  },
  'focal-point': {
    trafficFlow: 'Heavy Freight & Industrial Trucks (~2,100 trucks & vehicles/hr)',
    crackerIntensity: 'Moderate Industrial-Belt Fireworks (1.00× city index)',
    crackerPct: '+52% Diwali particulate uplift on top of industrial baseline',
    stubbleSmoke: 'High NE Rural Smoke Drift (1.05× index)',
    corridorNote: 'Foundry emissions and heavy truck road-dust keep baseline PM2.5 and PM10 elevated daily.',
  },
  'leela-bhawan': {
    trafficFlow: 'Peak Commercial Hub Congestion (Leela Bhawan Market · ~2,450 vehicles/hr)',
    crackerIntensity: 'High Central-City Fireworks (1.15× city index)',
    crackerPct: '+68% Diwali evening PM2.5 spike',
    stubbleSmoke: 'Moderate Central Drift (0.90× index)',
    corridorNote: 'Highest commercial vehicle density in Patiala drives strong NO₂ and evening particulate buildup.',
  },
  'bus-stand': {
    trafficFlow: 'Continuous Inter-State Bus & NH-7 Highway Flow (~2,400 vehicles/hr)',
    crackerIntensity: 'Moderate Transit-Zone Fireworks (1.00× city index)',
    crackerPct: '+55% Diwali night PM2.5 increase',
    stubbleSmoke: 'Moderate-High East Corridor Drift (0.95× index)',
    corridorNote: 'Diesel bus idling at ISBT and Rajpura Road highway traffic dominate daily emissions.',
  },
  'model-town': {
    trafficFlow: 'Moderate Sector Traffic (~1,350 vehicles/hr)',
    crackerIntensity: 'High Residential Celebration Intensity (1.20× city index)',
    crackerPct: '+74% sharp Diwali night PM2.5 spike',
    stubbleSmoke: 'Moderate Central-West Drift (0.90× index)',
    corridorNote: 'Calm residential streets experience a sharp evening spike during Diwali fireworks.',
  },
  'urban-estate': {
    trafficFlow: 'Moderate Residential & Bypass Traffic (~1,400 vehicles/hr)',
    crackerIntensity: 'High Sector Firecracker Activity (1.15× city index)',
    crackerPct: '+66% Diwali night PM2.5 surge',
    stubbleSmoke: 'High Eastern Agricultural Inflow (1.00× index)',
    corridorNote: 'Eastern perimeter receives agricultural smoke alongside residential festival fireworks.',
  },
  'ranjit-nagar': {
    trafficFlow: 'Moderate-High Bhadson Rd Outer Flow (~1,600 vehicles/hr)',
    crackerIntensity: 'High Residential Fireworks (1.10× city index)',
    crackerPct: '+62% Diwali night PM2.5 surge',
    stubbleSmoke: 'Very High NW Field Proximity (1.05× index)',
    corridorNote: 'Direct proximity to NW agricultural fields brings strong paddy-stubble smoke.',
  },
  'sanaur-road': {
    trafficFlow: 'Mandi & Agricultural Transport (~1,250 tractors/trucks/hr)',
    crackerIntensity: 'Moderate Peri-Urban Fireworks (0.95× city index)',
    crackerPct: '+48% Diwali night PM2.5 uplift',
    stubbleSmoke: 'Peak Southern Malwa Stubble Plume (1.20× index)',
    corridorNote: 'Patiala’s highest crop-residue smoke exposure zone along the southern agricultural belt.',
  },
  'punjabi-uni': {
    trafficFlow: 'Low-Moderate Campus & Perimeter Flow (~980 vehicles/hr)',
    crackerIntensity: 'Low Campus Firecracker Activity (0.75× city index)',
    crackerPct: '+31% mild Diwali drift spike',
    stubbleSmoke: 'Moderate Regional Drift (0.90× index)',
    corridorNote: 'Dense university tree cover filters local dust, keeping air significantly cleaner.',
  },
  'baradari-gardens': {
    trafficFlow: 'Low Green-Buffer Traffic (~820 vehicles/hr)',
    crackerIntensity: 'Lowest Firecracker Zone (0.70× city index)',
    crackerPct: '+26% mild drifting smoke on Diwali night',
    stubbleSmoke: 'Buffered Urban Forest Zone (0.80× index)',
    corridorNote: 'Heritage botanical canopy acts as Patiala’s cleanest natural air filter.',
  },
};

export function NeighborhoodPanel({ forecast, simulatedPoints, history, outlook, dayIndex, diwaliDate }: Props) {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [chartTab, setChartTab] = useState<'trend' | 'hourly'>('trend');
  const { profile, openModal } = useUserPreferences();

  const { neighborhood: n, points } = forecast;
  const baseP = points[dayIndex];
  const simP = simulatedPoints?.[dayIndex] ?? null;
  const activeP = simP ?? baseP;
  if (!baseP || !activeP) return null;

  const demo = AREA_DEMO_PROFILE[n.id] ?? AREA_DEMO_PROFILE['thapar-prem-nagar'];
  const metrics = buildPollutantMetrics(n, activeP);
  const userName = profile.name.trim();
  const isGoodAqi = activeP.aqi <= 180;

  return (
    <div className="panel">
      {/* Clean Area Header — Zero Paragraph Clutter on Main Page */}
      <div className="panel-head">
        <div>
          <span className="section-kicker">SELECTED AREA</span>
          <h2>{n.name}</h2>
          <span className="muted small">
            {n.zone} · {formatDate(activeP.date, true)}
          </span>
        </div>
        <div className="panel-head-right">
          <div className="aqi-big" style={{ background: aqiColor(activeP.aqi) }}>
            <span className="aqi-value">{activeP.aqi}</span>
            <span className="aqi-cat">{activeP.category}</span>
          </div>
        </div>
      </div>

      {/* Primary Clickable Banner: Why is this area Good / Bad? */}
      <button
        type="button"
        className={`why-trigger-card ${isGoodAqi ? 'good-border' : 'bad-border'}`}
        onClick={() => setActiveDialog('why-area')}
      >
        <div>
          <span className="dataset-tag">
            {isGoodAqi ? 'CLEANER ZONE ANALYSIS' : 'POLLUTION CAUSE ANALYSIS'}
          </span>
          <strong>
            Why {n.name} is {activeP.category} (AQI {activeP.aqi}) Today
          </strong>
        </div>
        <span className="why-cta">Click to see why →</span>
      </button>

      {/* 21-Day Timelapse Graph Directly on the Homescreen */}
      <div className="homescreen-chart-section" style={{ marginTop: 14 }}>
        <div className="chart-tabs" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={`tab-btn ${chartTab === 'trend' ? 'active' : ''}`}
            onClick={() => setChartTab('trend')}
          >
            21-Day AQI Timelapse Graph
          </button>
          <button
            type="button"
            className={`tab-btn ${chartTab === 'hourly' ? 'active' : ''}`}
            onClick={() => setChartTab('hourly')}
          >
            24-Hour Profile ({formatDate(activeP.date)})
          </button>
        </div>
        {chartTab === 'trend' ? (
          <TrendChart
            history={history}
            points={points}
            simulatedPoints={simulatedPoints}
            selectedDate={activeP.date}
            diwaliDate={diwaliDate}
          />
        ) : (
          <HourlyChart point={baseP} simulatedPoint={simP} />
        )}
      </div>

      {/* 3 Clean Clickable Section Tiles — No Long Text on Main Page */}
      <div className="clickable-cards-grid" style={{ marginTop: 12 }}>
        <button type="button" className="hub-action-card" onClick={() => setActiveDialog('demo-data')}>
          <span className="dataset-tag">SECTION A · DEMO DATA</span>
          <strong>Traffic &amp; Firecracker Data</strong>
          <span className="muted small">Click to open →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setActiveDialog('ai-predictions')}>
          <span className="dataset-tag">SECTION B · DIWALI PHASES</span>
          <strong>Before, During &amp; After Diwali</strong>
          <span className="muted small">Click to open →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setActiveDialog('health')}>
          <span className="dataset-tag">SECTION C · HEALTH GUIDE</span>
          <strong>{userName ? `${userName}’s Health Advice` : 'Personal Health Advice'}</strong>
          <span className="muted small">Click to open →</span>
        </button>
      </div>

      {/* Modal Dialog Box for whichever card the user clicked */}
      {activeDialog && (
        <div
          className="pref-modal-backdrop"
          onClick={() => setActiveDialog(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="pref-modal detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pref-modal-header">
              <div>
                <span className="pref-kicker">{n.name.toUpperCase()} · {formatDate(activeP.date, true).toUpperCase()}</span>
                <h2>
                  {activeDialog === 'why-area' && `Why ${n.name} Has AQI ${activeP.aqi} (${activeP.category})`}
                  {activeDialog === 'demo-data' && `Neighborhood Demo Data · ${n.name}`}
                  {activeDialog === 'ai-predictions' && `AI Predictions · ${n.name}`}
                  {activeDialog === 'charts' && `21-Day & 24-Hour Forecast Charts · ${n.name}`}
                  {activeDialog === 'health' && `Personalized Health Guidance · ${n.name}`}
                </h2>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setActiveDialog(null)}>
                Close ✕
              </button>
            </div>

            {activeDialog === 'why-area' && (
              <div className="dialog-body">
                <div className="personal-advice-card">
                  <strong>AI Explanation for {n.name}:</strong>
                  <span className="small muted">{demo.corridorNote}</span>
                </div>
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">POLLUTANT BREAKDOWN</span>
                    <strong>
                      PM2.5: {metrics.pm25} · PM10: {metrics.pm10} · NO₂: {metrics.no2} µg/m³
                    </strong>
                    <span className="small muted">Indian CPCB Category: {activeP.category}</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">SAFEST OUTDOOR WINDOW</span>
                    <strong style={{ color: '#74c69d' }}>1:00 PM – 4:00 PM IST</strong>
                    <span className="small muted">Afternoon sunlight lifts the boundary layer</span>
                  </div>
                </div>
                <h3>Top Factors Driving AQI in {n.name}</h3>
                <ul className="drivers">
                  {activeP.drivers.slice(0, 5).map((d) => (
                    <li key={d.key}>
                      <span>{d.label}</span>
                      <span className="bar-wrap">
                        <span
                          className={`bar ${d.impactPct >= 0 ? 'up' : 'down'}`}
                          style={{ width: `${Math.min(100, Math.abs(d.impactPct) / 2)}%` }}
                        />
                      </span>
                      <span className={d.impactPct >= 0 ? 'up-text' : 'down-text'}>
                        {d.impactPct >= 0 ? '+' : ''}
                        {d.impactPct.toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeDialog === 'demo-data' && (
              <div className="dialog-body">
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">1. TRAFFIC &amp; CORRIDOR DEMO DATA</span>
                    <strong>{demo.trafficFlow}</strong>
                    <span className="small muted">
                      Traffic Multiplier: <strong>{activeP.trafficIndex.toFixed(2)}×</strong> · Exhaust NO₂:{' '}
                      <strong>{metrics.no2} µg/m³</strong>
                    </span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">2. FIRECRACKER DEMO DATA</span>
                    <strong>{demo.crackerIntensity}</strong>
                    <span className="small muted">Expected Effect: {demo.crackerPct}</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">3. CROP SMOKE DEMO DATA (NASA VIIRS)</span>
                    <strong>{activeP.fireCount} Upwind Fires Detected</strong>
                    <span className="small muted">{demo.stubbleSmoke}</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">4. WEATHER &amp; WIND DEMO DATA (IMD)</span>
                    <strong>
                      Wind {activeP.weather.windSpeed.toFixed(1)} m/s · Humidity {Math.round(activeP.weather.humidity)}%
                    </strong>
                    <span className="small muted">
                      Temp {activeP.weather.tempC.toFixed(1)} °C · Mixing Height {Math.round(activeP.weather.mixingHeightM)} m
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeDialog === 'ai-predictions' && (
              <div className="dialog-body">
                {outlook && (
                  <div className="outlook">
                    {outlook.phases.map((ph) => (
                      <div key={ph.phase} className="outlook-card" style={{ borderColor: aqiColor(ph.avgAqi) }}>
                        <span className="muted small">{PHASE_TITLES[ph.phase]}</span>
                        <strong style={{ color: aqiColor(ph.avgAqi), fontSize: '1.35rem' }}>AQI {ph.avgAqi}</strong>
                        <span className="small">
                          {ph.category} · Peak AQI {ph.peakAqi}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeDialog === 'charts' && (
              <div className="dialog-body">
                <div className="chart-tabs" style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    className={`tab-btn ${chartTab === 'trend' ? 'active' : ''}`}
                    onClick={() => setChartTab('trend')}
                  >
                    21-Day AQI Forecast
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${chartTab === 'hourly' ? 'active' : ''}`}
                    onClick={() => setChartTab('hourly')}
                  >
                    24-Hour Intraday Profile ({formatDate(activeP.date)})
                  </button>
                </div>
                {chartTab === 'trend' ? (
                  <TrendChart
                    history={history}
                    points={points}
                    simulatedPoints={simulatedPoints}
                    selectedDate={activeP.date}
                    diwaliDate={diwaliDate}
                  />
                ) : (
                  <HourlyChart point={baseP} simulatedPoint={simP} />
                )}
              </div>
            )}

            {activeDialog === 'health' && (
              <div className="dialog-body">
                <div className="personal-advice-card">
                  <div className="personal-advice-top">
                    <strong>
                      {userName ? `Profile: ${userName}` : 'Profile: Guest'}
                      {profile.conditions.length > 0
                        ? ` · Conditions: ${profile.conditions.join(', ')}`
                        : ' · General Safe Mode'}
                    </strong>
                    <button
                      type="button"
                      className="inline-link-btn"
                      onClick={() => {
                        setActiveDialog(null);
                        openModal();
                      }}
                    >
                      Edit Name / Medical Info
                    </button>
                  </div>
                  <p className="advice" style={{ margin: 0 }}>
                    In <strong>{n.name}</strong>, AQI is <strong>{activeP.aqi} ({activeP.category})</strong> with{' '}
                    <strong>PM2.5 {metrics.pm25} µg/m³</strong>, <strong>PM10 {metrics.pm10} µg/m³</strong>, and{' '}
                    <strong>NO₂ {metrics.no2} µg/m³</strong>.
                  </p>
                </div>
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">MASK RECOMMENDATION</span>
                    <strong>{activeP.aqi > 120 ? 'Wear N95 / KN95 Outdoors' : 'Optional for Short Trips'}</strong>
                    <span className="small muted">{AQI_ADVICE[activeP.category]}</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">BEST OUTDOOR &amp; VENTILATION HOURS</span>
                    <strong>1:00 PM – 4:00 PM IST</strong>
                    <span className="small muted">Avoid heavy outdoor exercise between 7:00 PM – 1:00 AM.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
