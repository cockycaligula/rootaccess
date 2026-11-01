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
  onInspectArea?: () => void;
}

type AccordionSection = 'why-area' | 'ai-predictions' | 'health' | null;

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

export function NeighborhoodPanel({
  forecast,
  simulatedPoints,
  history,
  outlook,
  dayIndex,
  diwaliDate,
  onInspectArea,
}: Props) {
  const [expandedTab, setExpandedTab] = useState<AccordionSection>(null);
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

  const toggleSection = (sec: AccordionSection) => {
    setExpandedTab((prev) => (prev === sec ? null : sec));
  };

  return (
    <div className="panel">
      {/* Center-Stage Area Header with Apple Weather-Style Crisp AQI Readout */}
      <div className="panel-head">
        <div className="panel-title-group">
          <span className="section-kicker">SELECTED AREA</span>
          <h2 className="panel-area-title">{n.name}</h2>
          <span className="muted small">
            {n.zone} · {formatDate(activeP.date, true)}
          </span>
        </div>
        <div className="aqi-hero-readout">
          <span
            className="aqi-hero-number"
            style={{ textShadow: `0 8px 34px ${aqiColor(activeP.aqi)}44` }}
          >
            {activeP.aqi}
          </span>
          <span
            className="soft-aqi-badge"
            style={{
              background: `${aqiColor(activeP.aqi)}20`,
              borderColor: `${aqiColor(activeP.aqi)}55`,
            }}
          >
            <span
              className="status-dot"
              style={{
                background: aqiColor(activeP.aqi),
                boxShadow: `0 0 8px ${aqiColor(activeP.aqi)}`,
              }}
            />
            <span>AQI · {activeP.category}</span>
          </span>
        </div>
      </div>

      {/* Clean Borderless Secondary Metrics Strip */}
      <div className="ambient-metrics-row">
        <div className="ambient-metric">
          <span className="ambient-metric-label">PM2.5</span>
          <strong>
            {metrics.pm25} <small>µg/m³</small>
          </strong>
        </div>
        <div className="ambient-metric">
          <span className="ambient-metric-label">PM10</span>
          <strong>
            {metrics.pm10} <small>µg/m³</small>
          </strong>
        </div>
        <div className="ambient-metric">
          <span className="ambient-metric-label">NO₂</span>
          <strong>
            {metrics.no2} <small>µg/m³</small>
          </strong>
        </div>
        <div className="ambient-metric">
          <span className="ambient-metric-label">WIND</span>
          <strong>
            {activeP.weather.windSpeed.toFixed(1)} <small>m/s</small>
          </strong>
        </div>
      </div>

      {/* Primary Centerpiece: 21-Day Timelapse Graph */}
      <div className="homescreen-chart-surface">
        <div className="chart-surface-header">
          <span className="chart-surface-title">21-Day AQI Timelapse</span>
          <div className="chart-tabs">
            <button
              type="button"
              className={`tab-btn ${chartTab === 'trend' ? 'active' : ''}`}
              onClick={() => setChartTab('trend')}
            >
              21d Trend
            </button>
            <button
              type="button"
              className={`tab-btn ${chartTab === 'hourly' ? 'active' : ''}`}
              onClick={() => setChartTab('hourly')}
            >
              24h Intraday
            </button>
          </div>
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

      {/* Progressive Disclosure Accordion Strip + Slide-Out Deep Dive Trigger */}
      <div className="secondary-actions-strip">
        {onInspectArea && (
          <button
            type="button"
            className="surface-action-pill inspect-drawer-btn"
            onClick={onInspectArea}
          >
            <span className="status-dot" style={{ background: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }} />
            <span>Inspect Area · Deep Dive</span>
            <span className="pill-arrow">▸</span>
          </button>
        )}

        <button
          type="button"
          className={`surface-action-pill ${expandedTab === 'why-area' ? 'active-accordion' : ''}`}
          onClick={() => toggleSection('why-area')}
          aria-expanded={expandedTab === 'why-area'}
        >
          <span className="status-dot" style={{ background: isGoodAqi ? '#74c69d' : '#e76f51' }} />
          <span>Why {activeP.category}</span>
          <span className="pill-arrow">{expandedTab === 'why-area' ? '▴' : '▾'}</span>
        </button>

        <button
          type="button"
          className={`surface-action-pill ${expandedTab === 'ai-predictions' ? 'active-accordion' : ''}`}
          onClick={() => toggleSection('ai-predictions')}
          aria-expanded={expandedTab === 'ai-predictions'}
        >
          <span>Diwali Phases</span>
          <span className="pill-arrow">{expandedTab === 'ai-predictions' ? '▴' : '▾'}</span>
        </button>

        <button
          type="button"
          className={`surface-action-pill ${expandedTab === 'health' ? 'active-accordion' : ''}`}
          onClick={() => toggleSection('health')}
          aria-expanded={expandedTab === 'health'}
        >
          <span>{userName ? `${userName}’s Health Guide` : 'Health Guide'}</span>
          <span className="pill-arrow">{expandedTab === 'health' ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* Single Active Progressive-Disclosure Drawer Panel */}
      {expandedTab === 'why-area' && (
        <div className="inline-accordion-drawer stage-transition">
          <div className="personal-advice-card" style={{ marginBottom: 10 }}>
            <strong>Why {n.name} Has AQI {activeP.aqi} Today:</strong>
            <span className="small muted">{demo.corridorNote}</span>
          </div>
          <ul className="drivers">
            {activeP.drivers.slice(0, 4).map((d) => (
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

      {expandedTab === 'ai-predictions' && outlook && (
        <div className="inline-accordion-drawer stage-transition">
          <div className="outlook" style={{ marginTop: 0 }}>
            {outlook.phases.map((ph) => (
              <div key={ph.phase} className="outlook-card" style={{ borderColor: aqiColor(ph.avgAqi) }}>
                <span className="muted small">{PHASE_TITLES[ph.phase]}</span>
                <strong style={{ color: aqiColor(ph.avgAqi), fontSize: '1.25rem' }}>AQI {ph.avgAqi}</strong>
                <span className="small">
                  {ph.category} · Peak {ph.peakAqi}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedTab === 'health' && (
        <div className="inline-accordion-drawer stage-transition">
          <div className="personal-advice-card" style={{ marginBottom: 10 }}>
            <div className="personal-advice-top">
              <strong>
                {userName ? `Profile: ${userName}` : 'Profile: Guest'}
                {profile.conditions.length > 0
                  ? ` · ${profile.conditions.join(', ')}`
                  : ' · General Safe Mode'}
              </strong>
              <button
                type="button"
                className="inline-link-btn"
                onClick={openModal}
              >
                Edit Profile
              </button>
            </div>
            <span className="small muted">{AQI_ADVICE[activeP.category]}</span>
          </div>
          <div className="dialog-grid-2">
            <div className="dialog-stat-card">
              <span className="dataset-tag">MASK RECOMMENDATION</span>
              <strong>{activeP.aqi > 120 ? 'Wear N95 / KN95 Outdoors' : 'Optional for Short Trips'}</strong>
            </div>
            <div className="dialog-stat-card">
              <span className="dataset-tag">SAFEST OUTDOOR WINDOW</span>
              <strong style={{ color: '#6ee7b7' }}>1:00 PM – 4:00 PM IST</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
