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

type DialogType = 'demo-data' | 'ai-predictions' | 'charts' | 'health' | null;

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

  const diwaliPoint = points.find((p) => p.daysFromDiwali === 0) ?? activeP;
  const demo = AREA_DEMO_PROFILE[n.id] ?? AREA_DEMO_PROFILE['thapar-prem-nagar'];
  const metrics = buildPollutantMetrics(n, activeP);
  const userName = profile.name.trim();

  return (
    <div className="panel">
      {/* Clean Area Header */}
      <div className="panel-head">
        <div>
          <h2>{n.name}</h2>
          <span className="muted">
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

      {/* Conversational AI Prediction Box grounded in Neighborhood Demo Data */}
      <div className="ai-neighborhood-verdict">
        <div className="dataset-tag">AI NEIGHBORHOOD PREDICTION · {n.name.toUpperCase()}</div>
        <p className="verdict-lead">
          {userName ? `Hi ${userName}, according` : 'According'} to your neighborhood demo data for{' '}
          <strong>{n.name}</strong> (Traffic: <strong>{activeP.trafficIndex.toFixed(2)}×</strong>, Crop Fires:{' '}
          <strong>{activeP.fireCount}</strong>, Firecracker Profile: <strong>{demo.crackerPct}</strong>), here are my AI
          predictions:
        </p>
        <div className="verdict-highlights">
          <div className="verdict-pill">
            <span className="muted small">Current Area AQI ({n.lat.toFixed(3)}°N, {n.lng.toFixed(3)}°E)</span>
            <strong style={{ color: aqiColor(activeP.aqi) }}>
              AQI {activeP.aqi} ({activeP.pm25} µg/m³)
            </strong>
          </div>
          <div className="verdict-pill">
            <span className="muted small">Particulate &amp; Traffic Load</span>
            <strong>
              PM10 {metrics.pm10} · NO₂ {metrics.no2} µg/m³
            </strong>
          </div>
          <div className="verdict-pill">
            <span className="muted small">Safest Outdoor Window</span>
            <strong style={{ color: '#74c69d' }}>1:00 PM – 4:00 PM</strong>
          </div>
        </div>
      </div>

      {/* Clean Clickable Cards — Click any card to inspect inside a Dialog Box */}
      <div className="clickable-hub-label">Click any card below to open its full details in a dialog box:</div>
      <div className="clickable-cards-grid">
        <button type="button" className="hub-action-card" onClick={() => setActiveDialog('demo-data')}>
          <span className="dataset-tag">DEMO DATA</span>
          <strong>Traffic, Firecrackers &amp; Weather Data</strong>
          <span className="muted small">Click to view {n.name} inputs →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setActiveDialog('ai-predictions')}>
          <span className="dataset-tag">DIWALI BREAKDOWN</span>
          <strong>Before, During &amp; After Diwali</strong>
          <span className="muted small">Click to view 3-phase breakdown →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setActiveDialog('charts')}>
          <span className="dataset-tag">INTERACTIVE CHARTS</span>
          <strong>21-Day Trend &amp; 24-Hour Safe Window</strong>
          <span className="muted small">Click to view forecast graphs →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setActiveDialog('health')}>
          <span className="dataset-tag">HEALTH GUIDE</span>
          <strong>
            {userName ? `${userName}’s Health & Mask Advice` : 'Personalized Health & Mask Advice'}
          </strong>
          <span className="muted small">Click to view medical guidance →</span>
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

            {activeDialog === 'demo-data' && (
              <div className="dialog-body">
                <p className="muted small">
                  Live &amp; historical neighborhood demo datasets used by our AI to predict air quality in{' '}
                  <strong>{n.name}</strong>:
                </p>
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
                <div className="personal-advice-card" style={{ marginTop: 12, marginBottom: 0 }}>
                  <strong>AI Observation for {n.name}:</strong>
                  <span className="small muted">{demo.corridorNote}</span>
                </div>
              </div>
            )}

            {activeDialog === 'ai-predictions' && (
              <div className="dialog-body">
                <p className="verdict-lead" style={{ marginBottom: 12 }}>
                  According to the traffic, firecracker, crop-smoke, and weather data in <strong>{n.name}</strong>, here
                  is how air quality will behave Before, During, and After Diwali:
                </p>
                {outlook && (
                  <div className="outlook" style={{ marginBottom: 16 }}>
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
                <h3>What Causes Today’s Prediction in {n.name}?</h3>
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
